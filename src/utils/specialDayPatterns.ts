import { DailyRecord, SpecialDayRules } from '../data/types';
import { getSpecialDayRuleDefinition, RuleDefinition } from './specialDayRules';

export interface SpecialDayEvent {
  day: number;
  name: string;
  date: string;
  avgDiffCoins: number;
  totalDiffCoins: number;
  hallYenProfit: number;
  playerYenProfit: number;
  avgGames: number;
  payoutRate: number;
  isWin: boolean; // 客プラス（ホール放出/出す）
  status: '放出' | '回収';
}

export type PatternClassification =
  | 'all_win' // 全特日放出型 (オール大還元)
  | 'd11_loss_d22_win' // 前半特日回収→後半特日リベンジ放出型
  | 'd11_win_d22_loss' // 前半特日放出→後半特日回収型
  | 'zoro_loss_late_win' // 序盤回収・後半特日放出型
  | 'mixed' // 特日選別混合型
  | 'all_loss'; // 全特日回収型 (締切厳冬)

export interface MonthPattern {
  yearMonth: string;
  year: number;
  month: number;
  label: string;
  events: SpecialDayEvent[];
  zoroEvent: SpecialDayEvent | null;
  d11Event: SpecialDayEvent | null;
  d22Event: SpecialDayEvent | null;
  classification: PatternClassification;
  classificationName: string;
  badgeClass: string;
  summaryText: string;
  winCount: number;
  lossCount: number;
  totalEvents: number;
  totalEventDiffCoins: number;
  avgEventDiffCoins: number;
}

export interface DayTypeStat {
  name: string;
  day?: number;
  count: number;
  winCount: number; // 出す (客プラス)
  lossCount: number; // 回収する (客マイナス)
  winRate: number; // 放出率 (%)
  avgDiffCoins: number;
  avgGames: number;
  totalDiffCoins: number;
  totalHallYen: number;
  totalPlayerYen: number;
  payoutRate?: number;
  role?: string;
  isTop?: boolean;
}

export interface EventCorrelation {
  d11WinCount: number;
  d11WinThen22Win: number;
  d11WinThen22WinRate: number;
  d11LossCount: number;
  d11LossThen22Win: number; // リベンジ放出
  d11LossThen22WinRate: number;
  earlyEventName: string;
  lateEventName: string;
}

export interface TrapAnalysis {
  beforeDayAvgDiff: number;
  beforeDayWinRate: number;
  eventDayAvgDiff: number;
  eventDayWinRate: number;
  afterDayAvgDiff: number;
  afterDayWinRate: number;
  analyzedDaysLabel: string;
  beforeDaysLabel: string;
  afterDaysLabel: string;
}

export interface SpecialDayPatternsResult {
  ruleDef: RuleDefinition;
  monthPatterns: MonthPattern[];
  dayTypeStatsList: DayTypeStat[];
  topDayStat: DayTypeStat;
  zoroStats: DayTypeStat;
  d11Stats: DayTypeStat;
  d22Stats: DayTypeStat;
  correlation: EventCorrelation;
  trapAnalysis: TrapAnalysis;
  classificationCounts: Record<PatternClassification, number>;
  totalMonthsAnalyzed: number;
}

export function analyzeSpecialDayPatterns(
  dailyRecords: DailyRecord[],
  rules?: SpecialDayRules,
  oldEventDaysText?: string
): SpecialDayPatternsResult {
  const ruleDef = getSpecialDayRuleDefinition(rules, oldEventDaysText);

  const emptyStat = (name: string, role = '特定日'): DayTypeStat => ({
    name,
    count: 0,
    winCount: 0,
    lossCount: 0,
    winRate: 0,
    avgDiffCoins: 0,
    avgGames: 0,
    totalDiffCoins: 0,
    totalHallYen: 0,
    totalPlayerYen: 0,
    payoutRate: 100,
    role,
  });

  if (!dailyRecords || dailyRecords.length === 0) {
    const s1 = emptyStat(ruleDef.dayLabels[0]?.label || '特日①');
    const s2 = emptyStat(ruleDef.dayLabels[1]?.label || '特日②');
    const s3 = emptyStat(ruleDef.dayLabels[2]?.label || '特日③');

    return {
      ruleDef,
      monthPatterns: [],
      dayTypeStatsList: [s1, s2, s3],
      topDayStat: s1,
      zoroStats: s1,
      d11Stats: s2,
      d22Stats: s3,
      correlation: {
        d11WinCount: 0,
        d11WinThen22Win: 0,
        d11WinThen22WinRate: 0,
        d11LossCount: 0,
        d11LossThen22Win: 0,
        d11LossThen22WinRate: 0,
        earlyEventName: ruleDef.earlyDayName,
        lateEventName: ruleDef.lateDayName,
      },
      trapAnalysis: {
        beforeDayAvgDiff: 0,
        beforeDayWinRate: 0,
        eventDayAvgDiff: 0,
        eventDayWinRate: 0,
        afterDayAvgDiff: 0,
        afterDayWinRate: 0,
        analyzedDaysLabel: ruleDef.trapDays.targetLabel,
        beforeDaysLabel: ruleDef.trapDays.beforeLabel,
        afterDaysLabel: ruleDef.trapDays.afterLabel,
      },
      classificationCounts: {
        all_win: 0,
        d11_loss_d22_win: 0,
        d11_win_d22_loss: 0,
        zoro_loss_late_win: 0,
        mixed: 0,
        all_loss: 0,
      },
      totalMonthsAnalyzed: 0,
    };
  }

  // Group records by yearMonth
  const byYm = new Map<string, Map<number, DailyRecord>>();
  dailyRecords.forEach((r) => {
    if (!byYm.has(r.yearMonth)) {
      byYm.set(r.yearMonth, new Map<number, DailyRecord>());
    }
    byYm.get(r.yearMonth)!.set(r.day, r);
  });

  const monthPatterns: MonthPattern[] = [];
  const sortedYm = Array.from(byYm.keys()).sort();

  sortedYm.forEach((ym) => {
    const days = byYm.get(ym)!;
    const firstRec = Array.from(days.values())[0];
    const year = firstRec.year;
    const month = firstRec.month;
    const label = `${year}年${month}月`;

    const events: SpecialDayEvent[] = [];
    let zoroEvent: SpecialDayEvent | null = null;
    let d11Event: SpecialDayEvent | null = null;
    let d22Event: SpecialDayEvent | null = null;

    const createEvent = (r: DailyRecord, name: string): SpecialDayEvent => ({
      day: r.day,
      name,
      date: r.date,
      avgDiffCoins: r.avgDiffCoins,
      totalDiffCoins: r.totalDiffCoins,
      hallYenProfit: r.hallYenProfit,
      playerYenProfit: r.playerYenProfit,
      avgGames: r.avgGames,
      payoutRate: r.payoutRate,
      isWin: r.avgDiffCoins > 0,
      status: r.avgDiffCoins > 0 ? '放出' : '回収',
    });

    if (ruleDef.hasZoro) {
      // Month-day Zoro (e.g. 1/1, 2/2, 5/5, 7/7, etc. except 11 which is d11)
      if (month !== 11 && days.has(month)) {
        const r = days.get(month)!;
        zoroEvent = createEvent(r, '月日ゾロ目');
        events.push(zoroEvent);
      }
      if (days.has(11)) {
        const r = days.get(11)!;
        d11Event = createEvent(r, '11日');
        events.push(d11Event);
      }
      if (days.has(22)) {
        const r = days.get(22)!;
        d22Event = createEvent(r, '22日');
        events.push(d22Event);
      }
    } else if (ruleDef.targetDays.length > 0) {
      // Direct recurring target days (e.g. 5, 15, 25 or 7, 17, 27)
      ruleDef.targetDays.forEach((tDay, idx) => {
        if (days.has(tDay)) {
          const r = days.get(tDay)!;
          const ev = createEvent(r, `${tDay}日`);
          events.push(ev);
          if (idx === 0) zoroEvent = ev;
          else if (idx === 1) d11Event = ev;
          else if (idx === 2) d22Event = ev;
        }
      });
    }

    // Fallback: If no event matched target days, grab any record flagged with isOldEventDay
    if (events.length === 0) {
      const explicitEvents = Array.from(days.values())
        .filter((r) => r.isOldEventDay)
        .slice(0, 3);

      explicitEvents.forEach((r, idx) => {
        const ev = createEvent(r, `${r.day}日`);
        events.push(ev);
        if (idx === 0) zoroEvent = ev;
        else if (idx === 1) d11Event = ev;
        else if (idx === 2) d22Event = ev;
      });
    }

    if (events.length === 0) return;

    const winCount = events.filter((e) => e.isWin).length;
    const lossCount = events.filter((e) => !e.isWin).length;
    const totalEvents = events.length;
    const totalEventDiffCoins = events.reduce((acc, e) => acc + e.totalDiffCoins, 0);
    const avgEventDiffCoins =
      Math.round((events.reduce((acc, e) => acc + e.avgDiffCoins, 0) / totalEvents) * 10) / 10;

    const earlyEvent = d11Event || zoroEvent;
    const lateEvent = d22Event || (events.length > 1 ? events[events.length - 1] : null);

    const midName = earlyEvent ? earlyEvent.name : ruleDef.earlyDayName;
    const lateName = lateEvent ? lateEvent.name : ruleDef.lateDayName;

    // Pattern classification
    let classification: PatternClassification = 'mixed';
    let classificationName = '特日選別混合型';
    let badgeClass = 'bg-slate-100 text-slate-700 border-slate-300';
    let summaryText = '一部の特日のみ放出した月です。';

    if (winCount === totalEvents) {
      classification = 'all_win';
      classificationName = '全特日放出型 (大還元)';
      badgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold';
      summaryText = '月内の全特日で客側プラス（ホール赤字還元）を達成した大盤振る舞い月。';
    } else if (lossCount === totalEvents) {
      classification = 'all_loss';
      classificationName = '全特日回収型 (締切回収)';
      badgeClass = 'bg-rose-50 text-rose-800 border-rose-300 font-semibold';
      summaryText = '特日でもホールが利益回収を優先した警戒月です。';
    } else if (earlyEvent && !earlyEvent.isWin && lateEvent && lateEvent.isWin) {
      classification = 'd11_loss_d22_win';
      classificationName = `${midName}回収 → ${lateName}リベンジ放出型`;
      badgeClass = 'bg-amber-50 text-amber-900 border-amber-300 font-bold';
      summaryText = `${midName}で回収した分、${lateName}にしっかりリベンジ還元した王道メリハリ月！`;
    } else if (earlyEvent && earlyEvent.isWin && lateEvent && !lateEvent.isWin) {
      classification = 'd11_win_d22_loss';
      classificationName = `${midName}放出 → ${lateName}回収型`;
      badgeClass = 'bg-blue-50 text-blue-800 border-blue-300 font-semibold';
      summaryText = `${midName}に放出し、後半の${lateName}は回収に回ったパターン。`;
    } else if (zoroEvent && !zoroEvent.isWin && ((d11Event && d11Event.isWin) || (d22Event && d22Event.isWin))) {
      classification = 'zoro_loss_late_win';
      classificationName = '序盤回収・後半特日放出型';
      badgeClass = 'bg-indigo-50 text-indigo-800 border-indigo-300 font-semibold';
      summaryText = '月初の特日は回収し、中旬〜下旬の特日に還元したパターン。';
    }

    monthPatterns.push({
      yearMonth: ym,
      year,
      month,
      label,
      events,
      zoroEvent,
      d11Event,
      d22Event,
      classification,
      classificationName,
      badgeClass,
      summaryText,
      winCount,
      lossCount,
      totalEvents,
      totalEventDiffCoins,
      avgEventDiffCoins,
    });
  });

  // Calculate day type statistics
  const calcDayTypeStat = (
    name: string,
    filterFn: (e: SpecialDayEvent) => boolean,
    role = '特定日',
    dayNumber?: number
  ): DayTypeStat => {
    const matched: SpecialDayEvent[] = [];
    monthPatterns.forEach((mp) => {
      mp.events.forEach((e) => {
        if (filterFn(e)) matched.push(e);
      });
    });

    const count = matched.length;
    if (count === 0) {
      return emptyStat(name, role);
    }

    const winCount = matched.filter((e) => e.isWin).length;
    const lossCount = count - winCount;
    const winRate = Math.round((winCount / count) * 1000) / 10;
    const totalDiffCoins = matched.reduce((acc, e) => acc + e.totalDiffCoins, 0);
    const avgDiffCoins = Math.round((matched.reduce((acc, e) => acc + e.avgDiffCoins, 0) / count) * 10) / 10;
    const avgGames = Math.round(matched.reduce((acc, e) => acc + e.avgGames, 0) / count);
    const totalHallYen = matched.reduce((acc, e) => acc + e.hallYenProfit, 0);
    const totalPlayerYen = matched.reduce((acc, e) => acc + e.playerYenProfit, 0);
    const avgPayoutRate =
      Math.round((matched.reduce((acc, e) => acc + (e.payoutRate || 100), 0) / count) * 10) / 10;

    return {
      name,
      day: dayNumber,
      count,
      winCount,
      lossCount,
      winRate,
      avgDiffCoins,
      avgGames,
      totalDiffCoins,
      totalHallYen,
      totalPlayerYen,
      payoutRate: avgPayoutRate,
      role,
    };
  };

  // Build DayTypeStat for all configured labels
  const dayTypeStatsList: DayTypeStat[] = ruleDef.dayLabels.map((dl) => {
    if (ruleDef.hasZoro && dl.day === -1) {
      return calcDayTypeStat(dl.label, (e) => e.name === '月日ゾロ目', dl.role);
    }
    return calcDayTypeStat(dl.label, (e) => e.day === dl.day, dl.role, dl.day);
  });

  // Identify top day (best performance / highest player diff coins)
  let topDayStat = dayTypeStatsList[0] || emptyStat(ruleDef.earlyDayName);
  let maxScore = -Infinity;
  dayTypeStatsList.forEach((stat) => {
    // Score based on average diff coins and win rate
    const score = stat.avgDiffCoins + stat.winRate * 2;
    if (score > maxScore && stat.count > 0) {
      maxScore = score;
      topDayStat = stat;
    }
  });
  topDayStat.isTop = true;

  // Aliases for compatibility
  const zoroStats = dayTypeStatsList[0] || emptyStat('特日①');
  const d11Stats = dayTypeStatsList[1] || emptyStat('特日②');
  const d22Stats = dayTypeStatsList[2] || emptyStat('特日③');

  // Correlation: Early event vs Late event
  let d11WinCount = 0;
  let d11WinThen22Win = 0;
  let d11LossCount = 0;
  let d11LossThen22Win = 0;

  monthPatterns.forEach((mp) => {
    const early = mp.d11Event || mp.zoroEvent;
    const late = mp.d22Event || (mp.events.length > 1 ? mp.events[mp.events.length - 1] : null);

    if (early && late && early !== late) {
      if (early.isWin) {
        d11WinCount++;
        if (late.isWin) d11WinThen22Win++;
      } else {
        d11LossCount++;
        if (late.isWin) d11LossThen22Win++;
      }
    }
  });

  const correlation: EventCorrelation = {
    d11WinCount,
    d11WinThen22Win,
    d11WinThen22WinRate: d11WinCount > 0 ? Math.round((d11WinThen22Win / d11WinCount) * 1000) / 10 : 0,
    d11LossCount,
    d11LossThen22Win,
    d11LossThen22WinRate: d11LossCount > 0 ? Math.round((d11LossThen22Win / d11LossCount) * 1000) / 10 : 0,
    earlyEventName: ruleDef.earlyDayName,
    lateEventName: ruleDef.lateDayName,
  };

  // Trap analysis using ruleDef.trapDays
  const targetDays = ruleDef.trapDays.targetDays;
  const beforeDaysList: DailyRecord[] = [];
  const eventDaysList: DailyRecord[] = [];
  const afterDaysList: DailyRecord[] = [];

  byYm.forEach((days) => {
    targetDays.forEach((tDay) => {
      if (days.has(tDay)) {
        eventDaysList.push(days.get(tDay)!);
        if (days.has(tDay - 1)) beforeDaysList.push(days.get(tDay - 1)!);
        if (days.has(tDay + 1)) afterDaysList.push(days.get(tDay + 1)!);
      }
    });
  });

  const calcGroupAvg = (list: DailyRecord[]) => {
    if (list.length === 0) return { avgDiff: 0, winRate: 0 };
    const avgDiff = Math.round((list.reduce((acc, r) => acc + r.avgDiffCoins, 0) / list.length) * 10) / 10;
    const wins = list.filter((r) => r.avgDiffCoins > 0).length;
    const winRate = Math.round((wins / list.length) * 1000) / 10;
    return { avgDiff, winRate };
  };

  const beforeStat = calcGroupAvg(beforeDaysList);
  const eventStat = calcGroupAvg(eventDaysList);
  const afterStat = calcGroupAvg(afterDaysList);

  const trapAnalysis: TrapAnalysis = {
    beforeDayAvgDiff: beforeStat.avgDiff,
    beforeDayWinRate: beforeStat.winRate,
    eventDayAvgDiff: eventStat.avgDiff,
    eventDayWinRate: eventStat.winRate,
    afterDayAvgDiff: afterStat.avgDiff,
    afterDayWinRate: afterStat.winRate,
    analyzedDaysLabel: ruleDef.trapDays.targetLabel,
    beforeDaysLabel: ruleDef.trapDays.beforeLabel,
    afterDaysLabel: ruleDef.trapDays.afterLabel,
  };

  const classificationCounts: Record<PatternClassification, number> = {
    all_win: 0,
    d11_loss_d22_win: 0,
    d11_win_d22_loss: 0,
    zoro_loss_late_win: 0,
    mixed: 0,
    all_loss: 0,
  };

  monthPatterns.forEach((mp) => {
    classificationCounts[mp.classification] = (classificationCounts[mp.classification] || 0) + 1;
  });

  return {
    ruleDef,
    monthPatterns,
    dayTypeStatsList,
    topDayStat,
    zoroStats,
    d11Stats,
    d22Stats,
    correlation,
    trapAnalysis,
    classificationCounts,
    totalMonthsAnalyzed: monthPatterns.length,
  };
}
