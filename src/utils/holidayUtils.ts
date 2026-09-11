/**
 * Japanese National Holiday (国民の祝日) Calculation Utility
 * Accurately determines Japanese holidays, Happy Mondays, Vernal/Autumnal Equinoxes,
 * Substitute Holidays (振替休日), and Citizens' Holidays (国民の休日).
 */

// Astronomical calculations for Equinox days
function getVernalEquinoxDay(year: number): number {
  if (year >= 1980 && year <= 2099) {
    return Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
  }
  return 20;
}

function getAutumnalEquinoxDay(year: number): number {
  if (year >= 1980 && year <= 2099) {
    return Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
  }
  return 23;
}

// Calculate N-th Monday of a given month
function getNthMonday(year: number, month: number, n: number): number {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const firstMonday = firstDay <= 1 ? 1 + (1 - firstDay) : 1 + (8 - firstDay);
  return firstMonday + (n - 1) * 7;
}

// Format YYYY-MM-DD
function formatDate(year: number, month: number, day: number): string {
  const m = month < 10 ? `0${month}` : `${month}`;
  const d = day < 10 ? `0${day}` : `${day}`;
  return `${year}-${m}-${d}`;
}

// Generate holidays for a specific year
function getYearHolidays(year: number): Map<string, string> {
  const holidays = new Map<string, string>();

  // 1. Fixed & Happy Monday Holidays
  // 1月
  holidays.set(formatDate(year, 1, 1), '元日');
  holidays.set(formatDate(year, 1, getNthMonday(year, 1, 2)), '成人の日');

  // 2月
  holidays.set(formatDate(year, 2, 11), '建国記念の日');
  if (year >= 2020) {
    holidays.set(formatDate(year, 2, 23), '天皇誕生日');
  }

  // 3月 (春分の日)
  holidays.set(formatDate(year, 3, getVernalEquinoxDay(year)), '春分の日');

  // 4月
  holidays.set(formatDate(year, 4, 29), '昭和の日');

  // 5月
  holidays.set(formatDate(year, 5, 3), '憲法記念日');
  holidays.set(formatDate(year, 5, 4), 'みどりの日');
  holidays.set(formatDate(year, 5, 5), 'こどもの日');

  // 7月 (海の日)
  if (year === 2020) {
    holidays.set(formatDate(year, 7, 23), '海の日');
    holidays.set(formatDate(year, 7, 24), 'スポーツの日');
  } else if (year === 2021) {
    holidays.set(formatDate(year, 7, 22), '海の日');
    holidays.set(formatDate(year, 7, 23), 'スポーツの日');
    holidays.set(formatDate(year, 8, 8), '山の日');
  } else {
    holidays.set(formatDate(year, 7, getNthMonday(year, 7, 3)), '海の日');
  }

  // 8月 (山の日)
  if (year !== 2020 && year !== 2021) {
    if (year >= 2016) {
      holidays.set(formatDate(year, 8, 11), '山の日');
    }
  } else if (year === 2020) {
    holidays.set(formatDate(year, 8, 10), '山の日');
  }

  // 9月 (敬老の日 & 秋分の日)
  const keirouDay = getNthMonday(year, 9, 3);
  holidays.set(formatDate(year, 9, keirouDay), '敬老の日');
  const shubunDay = getAutumnalEquinoxDay(year);
  holidays.set(formatDate(year, 9, shubunDay), '秋分の日');

  // Silver Week Citizens' Holiday (国民の休日: between 敬老の日 and 秋分の日)
  if (shubunDay - keirouDay === 2) {
    holidays.set(formatDate(year, 9, keirouDay + 1), '国民の休日');
  }

  // 10月 (スポーツの日)
  if (year !== 2020 && year !== 2021) {
    holidays.set(formatDate(year, 10, getNthMonday(year, 10, 2)), 'スポーツの日');
  }

  // 11月
  holidays.set(formatDate(year, 11, 3), '文化の日');
  holidays.set(formatDate(year, 11, 23), '勤労感謝の日');

  // 2. Substitute Holidays (振替休日)
  // If a holiday falls on Sunday, the next non-holiday weekday becomes a holiday.
  const rawEntries = Array.from(holidays.entries());
  rawEntries.forEach(([dateStr]) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    if (dateObj.getDay() === 0) {
      // Sunday! Look for next available day
      let nextDay = new Date(y, m - 1, d + 1);
      while (true) {
        const nextStr = formatDate(nextDay.getFullYear(), nextDay.getMonth() + 1, nextDay.getDate());
        if (!holidays.has(nextStr)) {
          holidays.set(nextStr, '振替休日');
          break;
        }
        nextDay = new Date(nextDay.getFullYear(), nextDay.getMonth(), nextDay.getDate() + 1);
      }
    }
  });

  return holidays;
}

// Cache of holidays by year
const holidaysCache = new Map<number, Map<string, string>>();

export function getJapaneseHoliday(dateStr: string): { isHoliday: boolean; holidayName?: string } {
  if (!dateStr) return { isHoliday: false };
  const parts = dateStr.split(/[-/.]/);
  if (parts.length < 3) return { isHoliday: false };

  const year = parseInt(parts[0], 10);
  if (isNaN(year) || year < 1980 || year > 2100) {
    return { isHoliday: false };
  }

  if (!holidaysCache.has(year)) {
    holidaysCache.set(year, getYearHolidays(year));
  }

  const map = holidaysCache.get(year)!;
  // standard key YYYY-MM-DD
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  const key = formatDate(year, m, d);

  if (map.has(key)) {
    return { isHoliday: true, holidayName: map.get(key) };
  }

  return { isHoliday: false };
}

export function isJapaneseHoliday(dateStr: string): boolean {
  return getJapaneseHoliday(dateStr).isHoliday;
}
