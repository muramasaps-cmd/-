const fs = require('fs');
const path = require('path');

// Let's create a robust parser that parses any chunk of table rows
function parseRows(text, defaultYear = 2026) {
  const rowRegex = /<tr>([\s\S]*?)<\/tr>/g;
  let match;
  const list = [];
  let currentYear = defaultYear;

  while ((match = rowRegex.exec(text)) !== null) {
    const row = match[1];
    if (row.includes('<th') || !row.includes('<td')) continue;

    // extract tds
    const tds = [];
    const tdRegex = /<td[\s\S]*?>([\s\S]*?)<\/td>/g;
    let tdMatch;
    while ((tdMatch = tdRegex.exec(row)) !== null) {
      tds.push(tdMatch[1]);
    }

    if (tds.length < 3) continue;

    const td0 = tds[0]; // date
    const td1 = tds[1]; // avg diff coins
    const td2 = tds[2]; // avg G
    const td3 = tds[3] || ''; // win rate
    const td4 = tds[4] || ''; // notable machines

    // parse date
    let year = currentYear;
    let month = 0;
    let day = 0;
    let dayOfWeek = '';

    const hrefMatch = td0.match(/href="(\d{8})/);
    if (hrefMatch) {
      year = parseInt(hrefMatch[1].slice(0, 4), 10);
      month = parseInt(hrefMatch[1].slice(4, 6), 10);
      day = parseInt(hrefMatch[1].slice(6, 8), 10);
      currentYear = year;
    } else {
      const fullDateMatch = td0.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
      if (fullDateMatch) {
        year = parseInt(fullDateMatch[1], 10);
        month = parseInt(fullDateMatch[2], 10);
        day = parseInt(fullDateMatch[3], 10);
        currentYear = year;
      } else {
        const mdMatch = td0.match(/(\d{1,2})\/(\d{1,2})/);
        if (mdMatch) {
          month = parseInt(mdMatch[1], 10);
          day = parseInt(mdMatch[2], 10);
          year = currentYear;
        }
      }
    }

    const dowMatch = td0.match(/\(([月火水木金土日])\)/);
    if (dowMatch) {
      dayOfWeek = dowMatch[1];
    }

    // parse diff coins
    let diffCoins = 0;
    const diffMatch = td1.match(/([+\-]?\d+)/);
    if (diffMatch) {
      diffCoins = parseInt(diffMatch[1], 10);
    }

    // parse G
    let games = 0;
    const gamesMatch = td2.match(/([0-9,]+)/);
    if (gamesMatch) {
      games = parseInt(gamesMatch[1].replace(/,/g, ''), 10);
    }

    // parse win rate & machines
    let winRate = null;
    let winMachines = null;
    let totalMachines = 587; // store capacity

    const wrMatch = td3.match(/(\d+)%/);
    if (wrMatch) {
      winRate = parseInt(wrMatch[1], 10);
    }

    const machMatch = td3.match(/\((\d+)\/(\d+)\)/);
    if (machMatch) {
      winMachines = parseInt(machMatch[1], 10);
      totalMachines = parseInt(machMatch[2], 10);
    }

    // notable
    let notable = td4
      .replace(/<div[^>]*>/gi, '')
      .replace(/<\/div>/gi, '')
      .replace(/<font[^>]*>/gi, '')
      .replace(/<\/font>/gi, '')
      .replace(/<br\s*\/?>/gi, '、')
      .replace(/&amp;/g, '&')
      .trim();
    // clean multiple commas
    notable = notable.split('、').map(s => s.trim()).filter(Boolean).join('、');

    const dateFormatted = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const yearMonth = `${year}-${String(month).padStart(2, '0')}`;

    // Calculate profit figures:
    // 差枚 is player diff.
    // Hall coin profit = -(diffCoins * totalMachines)
    const hallCoinProfit = -(diffCoins * totalMachines);
    // Player coin profit = diffCoins * totalMachines
    const playerCoinProfit = diffCoins * totalMachines;

    // 換金率: 46枚貸 (21.739円/枚) / 52枚交換 (19.231円/枚)
    // When hall is in profit (hallCoinProfit > 0, i.e., player lost diffCoins):
    // Hall revenue from sales: players bought coins at 21.739 yen/coin.
    // When hall is in deficit (hallCoinProfit < 0, i.e., player won diffCoins):
    // Hall pays out at 19.231 yen/coin.
    // Or standard 20 yen equivalent.
    // Let's provide both exact rate and standard 20 yen.
    const yenRateLend = 1000 / 46; // 21.73913
    const yenRateExchange = 1000 / 52; // 19.23077

    let hallYenProfit = 0;
    if (hallCoinProfit >= 0) {
      // players bought excess coins
      hallYenProfit = Math.round(hallCoinProfit * yenRateLend);
    } else {
      // players exchanged net positive coins
      hallYenProfit = Math.round(hallCoinProfit * yenRateExchange);
    }

    let playerYenProfit = 0;
    if (playerCoinProfit >= 0) {
      playerYenProfit = Math.round(playerCoinProfit * yenRateExchange);
    } else {
      playerYenProfit = Math.round(playerCoinProfit * yenRateLend);
    }

    // Is event day?
    // 旧イベント日: 毎月11日・22日/月と日がゾロ目の日
    const isZorome = (month === day);
    const is11 = (day === 11);
    const is22 = (day === 22);
    const isOldEventDay = is11 || is22 || isZorome;
    const is7Day = (day === 7 || day === 17 || day === 27); // Many Rakuen stores also treat 7 as special

    list.push({
      date: dateFormatted,
      yearMonth,
      year,
      month,
      day,
      dayOfWeek,
      avgDiffCoins: diffCoins,
      avgGames: games,
      winRate,
      winMachines,
      totalMachines,
      hallCoinProfit,
      playerCoinProfit,
      hallYenProfit,
      playerYenProfit,
      isOldEventDay,
      is7Day,
      notable
    });
  }

  return list;
}

module.exports = { parseRows };
