// Parse the HTML table rows
const fs = require('fs');

// We will write the parser script that can parse the HTML and output TypeScript data
const htmlSnippet = fs.readFileSync(__dirname + '/input.html', 'utf8');

function parseHtml(html) {
  const trRegex = /<tr><td>([\s\S]*?)<\/tr>/g;
  let match;
  const records = [];

  // Track current year
  let currentYear = 2026;

  while ((match = trRegex.exec(html)) !== null) {
    const rowContent = match[1];
    
    // Extract date
    // Patterns:
    // <a href="20260909\n">9/9(水)\n</a>
    // or 4/23(木)\n
    // or 2025/12/31(水)\n
    // or 2024/12/31(火)\n
    // or 2023/12/31(日)\n
    let dateStr = '';
    const dateLinkMatch = rowContent.match(/(?:href="(\d{8})"[^>]*>)?([\d\/\(\)\s\u3040-\u30ff\u4e00-\u9faf]+)<\/(?:a|td)>/);
    const firstTdMatch = rowContent.match(/^([\s\S]*?)<\/td>/);
    if (!firstTdMatch) continue;

    const td1 = firstTdMatch[1];
    let fullDateCode = '';
    const hrefMatch = td1.match(/href="(\d{8})/);
    if (hrefMatch) {
      fullDateCode = hrefMatch[1];
    }

    // Clean text inside td1
    const cleanDateText = td1.replace(/<[^>]+>/g, '').trim();

    // Check year from cleanDateText or fullDateCode
    let year = currentYear;
    let month = 1;
    let day = 1;
    let dayOfWeek = '';

    if (fullDateCode) {
      year = parseInt(fullDateCode.substring(0, 4), 10);
      month = parseInt(fullDateCode.substring(4, 6), 10);
      day = parseInt(fullDateCode.substring(6, 8), 10);
      currentYear = year;
    } else {
      const ymMatch = cleanDateText.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})/);
      if (ymMatch) {
        year = parseInt(ymMatch[1], 10);
        month = parseInt(ymMatch[2], 10);
        day = parseInt(ymMatch[3], 10);
        currentYear = year;
      } else {
        const mdMatch = cleanDateText.match(/^(\d{1,2})\/(\d{1,2})/);
        if (mdMatch) {
          month = parseInt(mdMatch[1], 10);
          day = parseInt(mdMatch[2], 10);
          // If month jumped from e.g. 1 to 12, adjust currentYear
          // But our data flows downwards chronologically from 2026/09 to 2023/12!
          // So if month > previous month, year decreased by 1
          year = currentYear;
        }
      }
    }

    const dowMatch = cleanDateText.match(/\(([月火水木金土日])\)/);
    if (dowMatch) {
      dayOfWeek = dowMatch[1];
    }

    // Extract diff coins (平均差枚)
    // <td align="right"><strong><font color="blue">+261\n</font></strong></td>
    // or <font color="red">-5\n</font>
    let avgDiffCoins = 0;
    const diffMatch = rowContent.match(/(?:color="(?:blue|red)">\s*([+\-]?\d+))/);
    if (diffMatch) {
      avgDiffCoins = parseInt(diffMatch[1], 10);
    } else {
      const boldMatch = rowContent.match(/<strong>\s*([+\-]?\d+)/);
      if (boldMatch) {
        avgDiffCoins = parseInt(boldMatch[1], 10);
      }
    }

    // Extract average G count (平均G数)
    // <td align="right">4,045\n</td>
    let avgGames = 0;
    const gMatch = rowContent.match(/<\/td>\s*<td align="right">\s*([0-9,]+)\s*<\/td>/);
    if (gMatch) {
      avgGames = parseInt(gMatch[1].replace(/,/g, ''), 10);
    }

    // Extract win rate and machines count
    // <td align="right" style="[^"]*">40%<br><font style="font-size:x-small;">(234/587)</font></td>
    // or >%<br><font style="font-size:x-small;">()</font>
    let winRate = 0;
    let winningMachines = 0;
    let totalMachines = 587; // default based on Rakuen Kamata

    const winRateMatch = rowContent.match(/(\d+)%/);
    if (winRateMatch) {
      winRate = parseInt(winRateMatch[1], 10);
    }

    const machMatch = rowContent.match(/\((\d+)\/(\d+)\)/);
    if (machMatch) {
      winningMachines = parseInt(machMatch[1], 10);
      totalMachines = parseInt(machMatch[2], 10);
    }

    // Extract notable machines
    // <div style="line-height:0.8;"><font size=1>...</font></div>
    let notableText = '';
    const noteMatch = rowContent.match(/<font size=1>([\s\S]*?)<\/font>/);
    if (noteMatch) {
      notableText = noteMatch[1].replace(/<br\s*\/?>/gi, '、').replace(/\s+/g, ' ').trim();
    }

    const formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const yearMonth = `${year}-${String(month).padStart(2, '0')}`;

    records.push({
      date: formattedDate,
      yearMonth,
      year,
      month,
      day,
      dayOfWeek,
      avgDiffCoins,
      avgGames,
      winRate,
      winningMachines,
      totalMachines,
      notableText
    });
  }

  return records;
}

console.log("Parser ready");
