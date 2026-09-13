import React, { useState, useMemo } from 'react';
import { DailyRecord } from '../data/types';
import { formatYen, formatCoins, formatNumber } from '../utils/formatters';
import { isJapaneseHoliday, getJapaneseHoliday } from '../utils/holidayUtils';
import {
  Calendar,
  Flame,
  TrendingUp,
  TrendingDown,
  Award,
  BarChart2,
  ChevronDown,
  ChevronUp,
  Zap,
  Info,
  Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
} from 'recharts';

interface DayOfWeekAnalysisProps {
  dailyRecords: DailyRecord[];
  perspective: 'hall' | 'player';
  unit: 'yen' | 'coins' | 'avgDiff';
  oldEventDays?: string;
  specialDayRules?: any;
}

export const DayOfWeekAnalysis: React.FC<DayOfWeekAnalysisProps> = ({
  dailyRecords,
  perspective,
  oldEventDays = '',
  specialDayRules,
}) => {
  const [expandedDow, setExpandedDow] = useState<string | null>(null);
  const [sortField, setSortField] = useState<'dow' | 'avgDiffCoins' | 'hallYen' | 'avgGames' | 'payoutRate' | 'winRate'>('dow');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [chartMetric, setChartMetric] = useState<'avgDiffCoins' | 'dailyProfit' | 'payoutRate'>('avgDiffCoins');
  const isHall = perspective === 'hall';

  // Days of week order (including holidays)
  const dows = ['月', '火', '水', '木', '金', '土', '日', '祝'];
  const dowOrderMap: Record<string, number> = {
    月: 1,
    火: 2,
    水: 3,
    木: 4,
    金: 5,
    土: 6,
    日: 7,
    祝: 8,
  };

  // Check which day of week is designated as a store event day
  const isTargetStoreEventDow = (dow: string): boolean => {
    if (dow === '祝') {
      return Boolean(oldEventDays && (oldEventDays.includes('祝日') || oldEventDays.includes('祝')));
    }
    if (specialDayRules?.daysOfWeek && Array.isArray(specialDayRules.daysOfWeek)) {
      if (specialDayRules.daysOfWeek.includes(dow)) return true;
    }
    if (oldEventDays) {
      if (oldEventDays.includes(`${dow}曜日`) || oldEventDays.includes(`${dow}曜`)) {
        return true;
      }
    }
    return false;
  };

  // Group by Day of Week (and Japanese Holidays)
  const dowStats = useMemo(() => {
    if (!dailyRecords || dailyRecords.length === 0) return [];

    return dows.map((dow) => {
      const isHoliday = dow === '祝';
      const records = isHoliday
        ? dailyRecords.filter((r) => isJapaneseHoliday(r.date))
        : dailyRecords.filter((r) => r.dayOfWeek === dow);
      const count = records.length;
      const isWeekend = dow === '土' || dow === '日';
      const isStoreEvent = isTargetStoreEventDow(dow);
      const label = isHoliday ? '祝日 (祝祭日・振替休日)' : `${dow}曜日`;

      if (count === 0) {
        return {
          dow,
          label,
          isWeekend,
          isHoliday,
          isStoreEvent,
          count: 0,
          totalHallProfit: 0,
          dailyHallProfit: 0,
          totalPlayerProfit: 0,
          dailyPlayerProfit: 0,
          totalDiffCoins: 0,
          avgDiffCoins: 0,
          displayDiffCoins: 0,
          displayDailyProfit: 0,
          displayTotalProfit: 0,
          displayPerMachineDailyProfit: 0,
          displayPerMachineTotalProfit: 0,
          avgGames: 0,
          payoutRate: 100,
          playerWinDays: 0,
          playerWinRate: 0,
          records: [],
        };
      }

      const totalHallProfit = records.reduce((acc, r) => acc + (r.gModelHallProfit || 0), 0);
      const dailyHallProfit = Math.round(totalHallProfit / count);

      const totalPlayerProfit = records.reduce((acc, r) => acc + (r.gModelPlayerProfit || 0), 0);
      const dailyPlayerProfit = Math.round(totalPlayerProfit / count);

      const totalDiffCoins = records.reduce((acc, r) => acc + r.totalDiffCoins, 0);
      const avgDiffCoins = Math.round((records.reduce((acc, r) => acc + r.avgDiffCoins, 0) / count) * 10) / 10;
      const avgGames = Math.round(records.reduce((acc, r) => acc + r.avgGames, 0) / count);

      // Average of daily payout rates
      const avgPayoutRate = records.reduce((acc, r) => acc + (r.payoutRate || 100), 0) / count;
      const payoutRate = Math.round(avgPayoutRate * 100) / 100;

      const playerWinDays = records.filter((r) => r.avgDiffCoins > 0).length;
      const playerWinRate = Math.round((playerWinDays / count) * 1000) / 10;

      // Machine statistics
      const avgMachines = Math.round(records.reduce((acc, r) => acc + (r.totalMachines || 587), 0) / count);
      const perMachineDailyProfit = avgMachines > 0 ? Math.round(dailyHallProfit / avgMachines) : 0;
      const perMachineDailyPlayerProfit = avgMachines > 0 ? Math.round(dailyPlayerProfit / avgMachines) : 0;
      const perMachineTotalProfit = avgMachines > 0 ? Math.round(totalHallProfit / avgMachines) : 0;
      const perMachineTotalPlayerProfit = avgMachines > 0 ? Math.round(totalPlayerProfit / avgMachines) : 0;

      // Perspective-adapted metrics
      const displayDiffCoins = perspective === 'hall' ? -avgDiffCoins : avgDiffCoins;
      const displayDailyProfit = perspective === 'hall' ? dailyHallProfit : dailyPlayerProfit;
      const displayTotalProfit = perspective === 'hall' ? totalHallProfit : totalPlayerProfit;
      const displayPerMachineDailyProfit = perspective === 'hall' ? perMachineDailyProfit : perMachineDailyPlayerProfit;
      const displayPerMachineTotalProfit = perspective === 'hall' ? perMachineTotalProfit : perMachineTotalPlayerProfit;

      return {
        dow,
        label,
        isWeekend,
        isHoliday,
        isStoreEvent,
        count,
        avgMachines,
        perMachineDailyProfit,
        perMachineDailyPlayerProfit,
        perMachineTotalProfit,
        perMachineTotalPlayerProfit,
        displayDiffCoins,
        displayDailyProfit,
        displayTotalProfit,
        displayPerMachineDailyProfit,
        displayPerMachineTotalProfit,
        totalHallProfit,
        dailyHallProfit,
        totalPlayerProfit,
        dailyPlayerProfit,
        totalDiffCoins,
        avgDiffCoins,
        avgGames,
        payoutRate,
        playerWinDays,
        playerWinRate,
        records: records.sort((a, b) => b.date.localeCompare(a.date)),
      };
    });
  }, [dailyRecords, perspective]);

  // Rankings
  const bestPlayerDow = useMemo(() => {
    const valid = dowStats.filter((d) => d.count > 0);
    if (!valid.length) return null;
    return [...valid].sort((a, b) => b.avgDiffCoins - a.avgDiffCoins)[0];
  }, [dowStats]);

  const bestHallDow = useMemo(() => {
    const valid = dowStats.filter((d) => d.count > 0);
    if (!valid.length) return null;
    return [...valid].sort((a, b) => b.dailyHallProfit - a.dailyHallProfit)[0];
  }, [dowStats]);

  const highestGamesDow = useMemo(() => {
    const valid = dowStats.filter((d) => d.count > 0);
    if (!valid.length) return null;
    return [...valid].sort((a, b) => b.avgGames - a.avgGames)[0];
  }, [dowStats]);

  // Weekend vs Weekday vs Holiday 3-way analysis
  const threeWayStats = useMemo(() => {
    const holidayRecords = dailyRecords.filter((r) => isJapaneseHoliday(r.date));
    const weekendRecords = dailyRecords.filter((r) => (r.dayOfWeek === '土' || r.dayOfWeek === '日') && !isJapaneseHoliday(r.date));
    const weekdayRecords = dailyRecords.filter((r) => r.dayOfWeek !== '土' && r.dayOfWeek !== '日' && !isJapaneseHoliday(r.date));

    const summarize = (records: DailyRecord[], label: string) => {
      const count = records.length;
      if (count === 0) {
        return {
          label,
          count: 0,
          avgDiff: 0,
          displayAvgDiff: 0,
          avgGames: 0,
          dailyHall: 0,
          displayDailyProfit: 0,
          payoutRate: 100,
          winRate: 0,
          perMachineDaily: 0,
        };
      }
      const avgDiff = Math.round((records.reduce((acc, r) => acc + r.avgDiffCoins, 0) / count) * 10) / 10;
      const avgGames = Math.round(records.reduce((acc, r) => acc + r.avgGames, 0) / count);
      const totalHall = records.reduce((acc, r) => acc + (r.gModelHallProfit || 0), 0);
      const dailyHall = Math.round(totalHall / count);
      const totalPlayer = records.reduce((acc, r) => acc + (r.gModelPlayerProfit || 0), 0);
      const dailyPlayer = Math.round(totalPlayer / count);

      const avgPayoutRate = records.reduce((acc, r) => acc + (r.payoutRate || 100), 0) / count;
      const payoutRate = Math.round(avgPayoutRate * 100) / 100;
      const winDays = records.filter((r) => r.avgDiffCoins > 0).length;
      const winRate = Math.round((winDays / count) * 1000) / 10;
      const avgMachines = Math.round(records.reduce((acc, r) => acc + (r.totalMachines || 587), 0) / count);
      const perMachineDaily = avgMachines > 0 ? Math.round(dailyHall / avgMachines) : 0;

      const displayAvgDiff = perspective === 'hall' ? -avgDiff : avgDiff;
      const displayDailyProfit = perspective === 'hall' ? dailyHall : dailyPlayer;

      return {
        label,
        count,
        avgDiff,
        displayAvgDiff,
        avgGames,
        dailyHall,
        displayDailyProfit,
        payoutRate,
        winRate,
        perMachineDaily,
      };
    };

    return {
      weekday: summarize(weekdayRecords, '平日 (月〜金・祝除く)'),
      weekend: summarize(weekendRecords, '週末 (土日・祝除く)'),
      holiday: summarize(holidayRecords, '祝日 (祝祭日・振替休日)'),
    };
  }, [dailyRecords, perspective]);

  // Weekend vs Weekday analysis (legacy compatibility)
  const weekendVsWeekday = useMemo(() => {
    const weekendRecords = dailyRecords.filter((r) => r.dayOfWeek === '土' || r.dayOfWeek === '日');
    const weekdayRecords = dailyRecords.filter((r) => r.dayOfWeek !== '土' && r.dayOfWeek !== '日');

    const weCount = weekendRecords.length;
    const wdCount = weekdayRecords.length;

    const weAvgDiff = weCount > 0 ? Math.round((weekendRecords.reduce((acc, r) => acc + r.avgDiffCoins, 0) / weCount) * 10) / 10 : 0;
    const wdAvgDiff = wdCount > 0 ? Math.round((weekdayRecords.reduce((acc, r) => acc + r.avgDiffCoins, 0) / wdCount) * 10) / 10 : 0;

    const weAvgGames = weCount > 0 ? Math.round(weekendRecords.reduce((acc, r) => acc + r.avgGames, 0) / weCount) : 0;
    const wdAvgGames = wdCount > 0 ? Math.round(weekdayRecords.reduce((acc, r) => acc + r.avgGames, 0) / wdCount) : 0;

    const weDailyHall = weCount > 0 ? Math.round(weekendRecords.reduce((acc, r) => acc + (r.gModelHallProfit || 0), 0) / weCount) : 0;
    const wdDailyHall = wdCount > 0 ? Math.round(weekdayRecords.reduce((acc, r) => acc + (r.gModelHallProfit || 0), 0) / wdCount) : 0;

    return {
      weCount,
      wdCount,
      weAvgDiff,
      wdAvgDiff,
      weAvgGames,
      wdAvgGames,
      weDailyHall,
      wdDailyHall,
    };
  }, [dailyRecords]);

  // Sorted list for table
  const sortedDows = useMemo(() => {
    const list = [...dowStats];
    list.sort((a, b) => {
      let diff = 0;
      if (sortField === 'dow') diff = dowOrderMap[a.dow] - dowOrderMap[b.dow];
      else if (sortField === 'avgDiffCoins') {
        const valA = perspective === 'hall' ? -a.avgDiffCoins : a.avgDiffCoins;
        const valB = perspective === 'hall' ? -b.avgDiffCoins : b.avgDiffCoins;
        diff = valA - valB;
      }
      else if (sortField === 'hallYen') {
        const valA = perspective === 'hall' ? a.dailyHallProfit : a.dailyPlayerProfit;
        const valB = perspective === 'hall' ? b.dailyHallProfit : b.dailyPlayerProfit;
        diff = valA - valB;
      }
      else if (sortField === 'avgGames') diff = a.avgGames - b.avgGames;
      else if (sortField === 'payoutRate') diff = a.payoutRate - b.payoutRate;
      else if (sortField === 'winRate') diff = a.playerWinRate - b.playerWinRate;

      return sortOrder === 'asc' ? diff : -diff;
    });
    return list;
  }, [dowStats, sortField, sortOrder, perspective]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder(field === 'dow' ? 'asc' : 'desc');
    }
  };

  const toggleExpand = (dow: string) => {
    setExpandedDow((prev) => (prev === dow ? null : dow));
  };

  // Evaluation status helper
  const getStatusBadge = (d: typeof dowStats[0]) => {
    if (d.count === 0) {
      return <span className="text-slate-400 text-xs">データなし</span>;
    }
    if (d.avgDiffCoins >= 120 || d.payoutRate >= 101.5) {
      return (
        <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold px-2 py-0.5 rounded-full">
          <Flame className="w-3 h-3 text-rose-600" />
          激アツ還元
        </span>
      );
    }
    if (d.avgDiffCoins > 0) {
      return (
        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-2 py-0.5 rounded-full">
          <TrendingUp className="w-3 h-3 text-emerald-600" />
          還元傾向
        </span>
      );
    }
    if (d.avgDiffCoins >= -120) {
      return (
        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-medium px-2 py-0.5 rounded-full">
          通常営業
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold px-2 py-0.5 rounded-full">
        <TrendingDown className="w-3 h-3 text-slate-500" />
        回収傾向
      </span>
    );
  };

  // Chart Tooltip
  const CustomChartTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: typeof dowStats[0] = payload[0].payload;
      const isHall = perspective === 'hall';

      return (
        <div className="bg-slate-900/95 text-white p-3 rounded-lg shadow-xl border border-slate-700 text-xs max-w-xs backdrop-blur-xs">
          <div className="font-bold text-sm text-indigo-300 border-b border-slate-700 pb-1 mb-1.5 flex items-center justify-between">
            <span>{data.label}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
              data.dow === '日'
                ? 'bg-rose-500 text-white'
                : data.dow === '土'
                ? 'bg-blue-500 text-white'
                : 'bg-slate-700 text-slate-200'
            }`}>
              {data.isWeekend ? '週末' : '平日'}
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">集計営業日数:</span>
              <span className="font-bold">{data.count}日間</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">{isHall ? 'ホール平均差枚/台:' : '客平均差枚/台:'}</span>
              <span
                className={`font-bold ${
                  data.displayDiffCoins > 0
                    ? isHall ? 'text-indigo-300' : 'text-blue-400'
                    : 'text-rose-400'
                }`}
              >
                {data.displayDiffCoins > 0 ? `+${data.displayDiffCoins}` : data.displayDiffCoins} 枚
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">{isHall ? '1日平均ホール粗利:' : '1日平均客収支:'}</span>
              <span
                className={`font-bold ${
                  data.displayDailyProfit >= 0
                    ? isHall ? 'text-emerald-400' : 'text-blue-400'
                    : 'text-rose-400'
                }`}
              >
                {formatYen(data.displayDailyProfit)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">{isHall ? '1台あたり粗利:' : '1台あたり収支:'}</span>
              <span className="font-bold text-amber-300">
                {formatYen(data.displayPerMachineDailyProfit)}/台・日
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">台平均稼働G数:</span>
              <span className="font-semibold text-amber-300">{formatNumber(data.avgGames)} G</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">機械割(出玉率):</span>
              <span className="font-bold text-indigo-300">{data.payoutRate.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">客プラス勝率:</span>
              <span className="font-bold text-emerald-400">
                {data.playerWinRate}% ({data.playerWinDays}/{data.count}日)
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (dailyRecords.length === 0) return null;

  return (
    <div id="day-of-week-analysis" className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Calendar className="w-5 h-5" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>曜日・祝日別 利益・出玉傾向分析</span>
              <span className="text-xs font-normal text-slate-500">
                (月〜日曜日 & 国民の祝日)
              </span>
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            月曜日から日曜日まで、および祝日（祝祭日・振替休日）ごとの出玉傾向・ホール粗利（G数連動）・稼働状況を比較分析します。
          </p>
        </div>

        {/* Chart Metric Selector */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg self-start sm:self-auto text-xs">
          <button
            type="button"
            onClick={() => setChartMetric('avgDiffCoins')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
              chartMetric === 'avgDiffCoins'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {isHall ? 'ホール平均差枚' : '客平均差枚'}
          </button>
          <button
            type="button"
            onClick={() => setChartMetric('dailyProfit')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
              chartMetric === 'dailyProfit'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {isHall ? '1日平均粗利' : '1日平均客収支'}
          </button>
          <button
            type="button"
            onClick={() => setChartMetric('payoutRate')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
              chartMetric === 'payoutRate'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            出玉率(機械割)
          </button>
        </div>
      </div>

      {/* Top Highlights 4 Cards */}
      <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 bg-slate-50/70 border-b border-slate-100">
        {/* Card 1: Best Player Win Dow */}
        <div className="p-3.5 bg-white rounded-xl border border-blue-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs text-blue-700 font-bold">
            <span className="flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-blue-600" />
              最高還元 (客勝ちNo.1)
            </span>
            <span className="bg-blue-50 text-blue-700 text-[10px] px-1.5 py-0.2 rounded font-bold">
              出玉首位
            </span>
          </div>
          {bestPlayerDow ? (
            <div className="mt-2">
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-extrabold text-slate-900">
                  {bestPlayerDow.label}
                </span>
                <span className={`text-sm font-extrabold ${bestPlayerDow.avgDiffCoins > 0 ? 'text-blue-600' : 'text-slate-700'}`}>
                  {bestPlayerDow.avgDiffCoins > 0 ? `+${bestPlayerDow.avgDiffCoins}` : bestPlayerDow.avgDiffCoins}枚/台
                </span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1 flex justify-between">
                <span>出玉率 {bestPlayerDow.payoutRate.toFixed(2)}% (勝率 {bestPlayerDow.playerWinRate}%)</span>
                <span className="font-semibold text-blue-600">
                  還元 約{formatYen(Math.abs(bestPlayerDow.perMachineDailyPlayerProfit))}/台
                </span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400 mt-2">データなし</div>
          )}
        </div>

        {/* Card 2: Highest Games Dow */}
        <div className="p-3.5 bg-white rounded-xl border border-amber-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs text-amber-700 font-bold">
            <span className="flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              最高稼働 (人気No.1)
            </span>
            <span className="bg-amber-50 text-amber-700 text-[10px] px-1.5 py-0.2 rounded font-bold">
              高回転
            </span>
          </div>
          {highestGamesDow ? (
            <div className="mt-2">
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-extrabold text-slate-900">
                  {highestGamesDow.label}
                </span>
                <span className="text-sm font-extrabold text-amber-600">
                  {formatNumber(highestGamesDow.avgGames)}G/台
                </span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1 flex justify-between">
                <span>差枚 {highestGamesDow.avgDiffCoins > 0 ? `+${highestGamesDow.avgDiffCoins}` : highestGamesDow.avgDiffCoins}枚</span>
                <span className="font-semibold text-amber-700">
                  粗利 {formatYen(highestGamesDow.perMachineDailyProfit)}/台
                </span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400 mt-2">データなし</div>
          )}
        </div>

        {/* Card 3: Best Hall Profit Dow */}
        <div className="p-3.5 bg-white rounded-xl border border-indigo-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs text-indigo-700 font-bold">
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
              最大回収 (店粗利No.1)
            </span>
            <span className="bg-indigo-50 text-indigo-700 text-[10px] px-1.5 py-0.2 rounded font-bold">
              高粗利
            </span>
          </div>
          {bestHallDow ? (
            <div className="mt-2">
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-extrabold text-slate-900">
                  {bestHallDow.label}
                </span>
                <span className="text-sm font-extrabold text-indigo-600">
                  {formatYen(bestHallDow.dailyHallProfit)}/日
                </span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1 flex justify-between">
                <span>出玉率 {bestHallDow.payoutRate.toFixed(2)}%</span>
                <span className="font-semibold text-indigo-700">
                  粗利 {formatYen(bestHallDow.perMachineDailyProfit)}/台
                </span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400 mt-2">データなし</div>
          )}
        </div>

        {/* Card 4: Weekend vs Weekdays */}
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-700 font-bold">
            <span className="flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              週末(土日) vs 平日(月〜金)
            </span>
            <span className="bg-slate-100 text-slate-600 text-[10px] px-1.5 py-0.2 rounded font-bold">
              曜日対比
            </span>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-semibold text-slate-600">
                客差枚対比:
              </span>
              <span className="text-xs font-bold">
                <span className="text-blue-600">土日 {weekendVsWeekday.weAvgDiff > 0 ? `+${weekendVsWeekday.weAvgDiff}` : weekendVsWeekday.weAvgDiff}枚</span>
                <span className="text-slate-300 mx-1">/</span>
                <span className="text-slate-700">平日 {weekendVsWeekday.wdAvgDiff > 0 ? `+${weekendVsWeekday.wdAvgDiff}` : weekendVsWeekday.wdAvgDiff}枚</span>
              </span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex justify-between">
              <span>稼働: 土日 {formatNumber(weekendVsWeekday.weAvgGames)}G</span>
              <span>平日 {formatNumber(weekendVsWeekday.wdAvgGames)}G</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3-Category Benchmark Summary: 平日 vs 週末 vs 祝日 */}
      <div className="px-4 sm:px-5 py-3.5 bg-slate-50 border-b border-slate-200/80">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>【平日平均 vs 週末(土日)平均 vs 祝日平均】3分類ベンチマーク比較</span>
          </div>
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            ※祝祭日・振替休日を平日・土日から完全に分離して集計
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Weekday Card */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                通常平日 (月〜金・祝除く)
              </span>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-bold">
                {threeWayStats.weekday.count}日間
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
              <div>
                <div className="text-[10px] text-slate-400">{isHall ? 'ホール平均差枚' : '客平均差枚'}</div>
                <div className={`font-black ${threeWayStats.weekday.displayAvgDiff > 0 ? (isHall ? 'text-indigo-600' : 'text-blue-600') : 'text-slate-800'}`}>
                  {threeWayStats.weekday.displayAvgDiff > 0 ? `+${threeWayStats.weekday.displayAvgDiff}` : threeWayStats.weekday.displayAvgDiff} 枚
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">出玉率 (機械割)</div>
                <div className="font-bold text-slate-800">
                  {threeWayStats.weekday.payoutRate.toFixed(2)}%
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">台平均稼働</div>
                <div className="font-bold text-slate-700">
                  {formatNumber(threeWayStats.weekday.avgGames)} G
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">{isHall ? '1日ホール粗利' : '1日客収支'}</div>
                <div className={`font-bold ${threeWayStats.weekday.displayDailyProfit >= 0 ? (isHall ? 'text-slate-800' : 'text-blue-600') : 'text-rose-600'}`}>
                  {formatYen(threeWayStats.weekday.displayDailyProfit)}
                </div>
              </div>
            </div>
          </div>

          {/* Weekend Card */}
          <div className="bg-white p-3 rounded-xl border border-blue-200 shadow-2xs">
            <div className="flex items-center justify-between pb-1.5 border-b border-blue-50">
              <span className="text-xs font-bold text-blue-900 flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                週末 (土日・祝除く)
              </span>
              <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded font-bold">
                {threeWayStats.weekend.count}日間
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
              <div>
                <div className="text-[10px] text-slate-400">{isHall ? 'ホール平均差枚' : '客平均差枚'}</div>
                <div className={`font-black ${threeWayStats.weekend.displayAvgDiff > 0 ? (isHall ? 'text-indigo-600' : 'text-blue-600') : 'text-slate-800'}`}>
                  {threeWayStats.weekend.displayAvgDiff > 0 ? `+${threeWayStats.weekend.displayAvgDiff}` : threeWayStats.weekend.displayAvgDiff} 枚
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">出玉率 (機械割)</div>
                <div className="font-bold text-slate-800">
                  {threeWayStats.weekend.payoutRate.toFixed(2)}%
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">台平均稼働</div>
                <div className="font-bold text-blue-700 flex items-center gap-1">
                  <span>{formatNumber(threeWayStats.weekend.avgGames)} G</span>
                  {threeWayStats.weekday.avgGames > 0 && (
                    <span className="text-[10px] text-emerald-600 font-normal">
                      (+{Math.round(((threeWayStats.weekend.avgGames - threeWayStats.weekday.avgGames) / threeWayStats.weekday.avgGames) * 100)}%)
                    </span>
                  )}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">{isHall ? '1日ホール粗利' : '1日客収支'}</div>
                <div className={`font-bold ${threeWayStats.weekend.displayDailyProfit >= 0 ? (isHall ? 'text-slate-800' : 'text-blue-600') : 'text-rose-600'}`}>
                  {formatYen(threeWayStats.weekend.displayDailyProfit)}
                </div>
              </div>
            </div>
          </div>

          {/* Holiday Card */}
          <div className="bg-white p-3 rounded-xl border border-rose-200 shadow-2xs">
            <div className="flex items-center justify-between pb-1.5 border-b border-rose-50">
              <span className="text-xs font-bold text-rose-900 flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                祝日 (祝祭日・振替休日)
              </span>
              <span className="text-[10px] bg-rose-50 text-rose-700 px-1.5 py-0.2 rounded font-bold">
                {threeWayStats.holiday.count}日間
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
              <div>
                <div className="text-[10px] text-slate-400">{isHall ? 'ホール平均差枚' : '客平均差枚'}</div>
                <div className={`font-black ${threeWayStats.holiday.displayAvgDiff > 0 ? (isHall ? 'text-indigo-600' : 'text-blue-600') : 'text-slate-800'}`}>
                  {threeWayStats.holiday.displayAvgDiff > 0 ? `+${threeWayStats.holiday.displayAvgDiff}` : threeWayStats.holiday.displayAvgDiff} 枚
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">出玉率 (機械割)</div>
                <div className="font-bold text-slate-800">
                  {threeWayStats.holiday.payoutRate.toFixed(2)}%
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">台平均稼働</div>
                <div className="font-bold text-rose-700">
                  {formatNumber(threeWayStats.holiday.avgGames)} G
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">{isHall ? '1日ホール粗利' : '1日客収支'}</div>
                <div className={`font-bold ${threeWayStats.holiday.displayDailyProfit >= 0 ? (isHall ? 'text-slate-800' : 'text-blue-600') : 'text-rose-600'}`}>
                  {formatYen(threeWayStats.holiday.displayDailyProfit)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3 text-xs">
          <div className="font-semibold text-slate-700 flex items-center gap-1.5">
            <BarChart2 className="w-4 h-4 text-indigo-600" />
            <span>
              {chartMetric === 'avgDiffCoins'
                ? isHall
                  ? '曜日別 ホール平均差枚（棒） & 台平均稼働G数（折れ線）'
                  : '曜日別 客平均差枚（棒） & 台平均稼働G数（折れ線）'
                : chartMetric === 'dailyProfit'
                ? isHall
                  ? '曜日別 1日平均ホール粗利（棒） & 台平均稼働G数（折れ線）'
                  : '曜日別 1日平均客収支（棒） & 台平均稼働G数（折れ線）'
                : '曜日別 機械割・出玉率（棒） & 台平均稼働G数（折れ線）'}
            </span>
          </div>
          <span className="text-slate-400">※各棒をクリックすると詳細明細を展開します</span>
        </div>

        <div key={`dow-chart-${chartMetric}-${perspective}`} className="h-64 sm:h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={dowStats}
              margin={{ top: 15, right: 20, left: 10, bottom: 5 }}
              onClick={(state: any) => {
                if (state && state.activePayload && state.activePayload.length) {
                  const clickedDow = state.activePayload[0].payload.dow;
                  toggleExpand(clickedDow);
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
              />
              {/* Left Y Axis for Selected Metric */}
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => {
                  if (chartMetric === 'avgDiffCoins') return `${v > 0 ? `+${v}` : v}枚`;
                  if (chartMetric === 'dailyProfit') return `${Math.round(v / 10000)}万`;
                  return `${Number(v).toFixed(1).replace(/\.0$/, '')}%`;
                }}
                domain={
                  chartMetric === 'payoutRate'
                    ? [
                        (dataMin: number) => Math.floor(Math.min(dataMin, 99.5) * 2) / 2,
                        (dataMax: number) => Math.ceil(Math.max(dataMax, 100.5) * 2) / 2,
                      ]
                    : ['auto', 'auto']
                }
              />
              {/* Right Y Axis for Avg Games */}
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 10, fill: '#f59e0b' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}G`}
                domain={['dataMin - 500', 'dataMax + 500']}
              />
              <Tooltip content={<CustomChartTooltip />} />
              <ReferenceLine
                y={chartMetric === 'payoutRate' ? 100 : 0}
                yAxisId="left"
                stroke="#94a3b8"
                strokeWidth={1.5}
                strokeDasharray={chartMetric === 'payoutRate' ? '3 3' : undefined}
              />

              {/* Main Bar */}
              <Bar
                yAxisId="left"
                dataKey={
                  chartMetric === 'avgDiffCoins'
                    ? 'displayDiffCoins'
                    : chartMetric === 'dailyProfit'
                    ? 'displayDailyProfit'
                    : 'payoutRate'
                }
                radius={[4, 4, 0, 0]}
                cursor="pointer"
              >
                {dowStats.map((entry, idx) => {
                  let fillColor = '#6366f1';
                  if (entry.dow === '祝') {
                    fillColor = '#e11d48'; // Rose for Holiday
                  } else if (entry.dow === '日') {
                    fillColor = '#ef4444'; // Red for Sunday
                  } else if (entry.dow === '土') {
                    fillColor = '#3b82f6'; // Blue for Saturday
                  } else {
                    if (chartMetric === 'avgDiffCoins') {
                      if (isHall) {
                        fillColor = entry.displayDiffCoins >= 0 ? '#6366f1' : '#f43f5e';
                      } else {
                        fillColor = entry.displayDiffCoins >= 0 ? '#10b981' : '#64748b';
                      }
                    } else if (chartMetric === 'dailyProfit') {
                      if (isHall) {
                        fillColor = entry.displayDailyProfit >= 0 ? '#6366f1' : '#f43f5e';
                      } else {
                        fillColor = entry.displayDailyProfit >= 0 ? '#10b981' : '#f43f5e';
                      }
                    } else {
                      fillColor = entry.payoutRate >= 100 ? '#10b981' : '#64748b';
                    }
                  }
                  return <Cell key={`dow-bar-${idx}`} fill={fillColor} opacity={entry.count === 0 ? 0.2 : 0.9} />;
                })}
              </Bar>

              {/* Line for Average Games */}
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="avgGames"
                name="台平均G数"
                stroke="#f59e0b"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#f59e0b' }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="border-t border-slate-100 overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
            <tr>
              <th
                onClick={() => handleSort('dow')}
                className="py-3 px-3.5 cursor-pointer hover:bg-slate-100 transition-colors whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  曜日
                  {sortField === 'dow' && (sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                </div>
              </th>
              <th className="py-3 px-3 whitespace-nowrap">傾向判定</th>
              <th className="py-3 px-3 text-right whitespace-nowrap">日数</th>
              <th
                onClick={() => handleSort('avgDiffCoins')}
                className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 transition-colors whitespace-nowrap text-blue-700"
              >
                <div className="flex items-center justify-end gap-1">
                  {perspective === 'hall' ? 'ホール平均差枚' : '客平均差枚'}
                  {sortField === 'avgDiffCoins' && (sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                </div>
              </th>
              <th
                onClick={() => handleSort('hallYen')}
                className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 transition-colors whitespace-nowrap text-indigo-700"
              >
                <div className="flex items-center justify-end gap-1">
                  {perspective === 'hall' ? '1日平均粗利' : '1日平均客収支'}
                  {sortField === 'hallYen' && (sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                </div>
              </th>
              <th className="py-3 px-3 text-right whitespace-nowrap">
                {perspective === 'hall' ? '期間累計粗利' : '期間累計客収支'}
              </th>
              <th
                onClick={() => handleSort('avgGames')}
                className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 transition-colors whitespace-nowrap"
              >
                <div className="flex items-center justify-end gap-1">
                  平均稼働G数
                  {sortField === 'avgGames' && (sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                </div>
              </th>
              <th
                onClick={() => handleSort('payoutRate')}
                className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 transition-colors whitespace-nowrap"
              >
                <div className="flex items-center justify-end gap-1">
                  出玉率(機械割)
                  {sortField === 'payoutRate' && (sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                </div>
              </th>
              <th
                onClick={() => handleSort('winRate')}
                className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 transition-colors whitespace-nowrap"
              >
                <div className="flex items-center justify-end gap-1">
                  客勝率
                  {sortField === 'winRate' && (sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                </div>
              </th>
              <th className="py-3 px-3 text-center whitespace-nowrap">内訳展開</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedDows.map((d) => {
              const isExpanded = expandedDow === d.dow;
              const isSun = d.dow === '日';
              const isSat = d.dow === '土';
              const isHol = d.dow === '祝';

              return (
                <React.Fragment key={d.dow}>
                  <tr
                    onClick={() => toggleExpand(d.dow)}
                    className={`cursor-pointer transition-colors ${
                      isExpanded
                        ? 'bg-indigo-50/40 font-medium'
                        : isHol
                        ? 'bg-rose-50/30 hover:bg-rose-50/60'
                        : isSun
                        ? 'bg-rose-50/30 hover:bg-rose-50/60'
                        : isSat
                        ? 'bg-blue-50/30 hover:bg-blue-50/60'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    {/* Day of Week & Badge */}
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                            isHol
                              ? 'bg-rose-600 text-white shadow-xs'
                              : isSun
                              ? 'bg-rose-600 text-white'
                              : isSat
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-700 text-white'
                          }`}
                        >
                          {d.dow}
                        </span>
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{d.label}</span>
                            {d.isStoreEvent && (
                              <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded shadow-2xs">
                                看板特日
                              </span>
                            )}
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                isHol
                                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                  : isSun
                                  ? 'bg-rose-100 text-rose-800'
                                  : isSat
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {isHol ? '祝祭日' : d.isWeekend ? '週末' : '平日'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      {getStatusBadge(d)}
                    </td>

                    {/* Count */}
                    <td className="py-3 px-3 text-right font-medium text-slate-600 whitespace-nowrap">
                      {d.count}日
                    </td>

                    {/* Avg Diff Coins */}
                    <td
                      className={`py-3 px-3 text-right font-bold whitespace-nowrap ${
                        d.displayDiffCoins > 0
                          ? perspective === 'hall' ? 'text-indigo-600' : 'text-blue-600'
                          : 'text-slate-700'
                      }`}
                    >
                      {d.count > 0 ? (d.displayDiffCoins > 0 ? `+${d.displayDiffCoins}` : d.displayDiffCoins) : '-'} 枚/台
                    </td>

                    {/* Daily Hall / Player Profit */}
                    <td
                      className={`py-3 px-3 text-right font-extrabold whitespace-nowrap ${
                        d.displayDailyProfit >= 0
                          ? perspective === 'hall' ? 'text-indigo-600' : 'text-blue-600'
                          : 'text-rose-600'
                      }`}
                    >
                      <div>{d.count > 0 ? formatYen(d.displayDailyProfit) : '-'}</div>
                      {d.count > 0 && (
                        <div className="text-[10px] text-slate-500 font-normal">
                          {formatYen(d.displayPerMachineDailyProfit)}/台
                        </div>
                      )}
                    </td>

                    {/* Total Hall / Player Profit */}
                    <td
                      className={`py-3 px-3 text-right font-semibold whitespace-nowrap ${
                        d.displayTotalProfit >= 0
                          ? perspective === 'hall' ? 'text-slate-800' : 'text-blue-700'
                          : 'text-rose-600'
                      }`}
                    >
                      <div>{d.count > 0 ? formatYen(d.displayTotalProfit) : '-'}</div>
                      {d.count > 0 && (
                        <div className="text-[10px] text-slate-400 font-normal">
                          {formatYen(d.displayPerMachineTotalProfit)}/台
                        </div>
                      )}
                    </td>

                    {/* Avg Games */}
                    <td className="py-3 px-3 text-right text-slate-700 whitespace-nowrap font-medium">
                      {d.count > 0 ? `${formatNumber(d.avgGames)} G` : '-'}
                    </td>

                    {/* Payout Rate */}
                    <td
                      className={`py-3 px-3 text-right whitespace-nowrap font-bold ${
                        d.payoutRate >= 100 ? 'text-emerald-600' : 'text-slate-600'
                      }`}
                    >
                      {d.count > 0 ? `${d.payoutRate.toFixed(2)}%` : '-'}
                    </td>

                    {/* Win Rate */}
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      {d.count > 0 ? (
                        <span className="font-semibold text-slate-700">
                          {d.playerWinRate}%{' '}
                          <span className="text-[11px] text-slate-400 font-normal">
                            ({d.playerWinDays}/{d.count})
                          </span>
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>

                    {/* Expand Toggle */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <button
                        type="button"
                        aria-label="Toggle details"
                        className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-200/60 transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-indigo-600" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                  </tr>

                  {/* Expanded Drilldown Sub-table */}
                  {isExpanded && (
                    <tr>
                      <td colSpan={10} className="p-0 bg-slate-50/80">
                        <div className="p-4 sm:p-5 border-y border-slate-200/80 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="font-bold text-slate-800 text-xs sm:text-sm flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-indigo-600" />
                              <span>【{d.label}】の全営業日明細 ({d.records.length}日間)</span>
                            </div>
                            <span className="text-xs text-slate-500">
                              日付順で表示
                            </span>
                          </div>

                          <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden max-h-80 overflow-y-auto">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200 sticky top-0">
                                <tr>
                                  <th className="py-2 px-3">日付</th>
                                  <th className="py-2 px-3">区分</th>
                                  <th className="py-2 px-3 text-right">
                                    {perspective === 'hall' ? 'ホール平均差枚' : '客平均差枚'}
                                  </th>
                                  <th className="py-2 px-3 text-right">
                                    {perspective === 'hall' ? 'ホール粗利(G数連動)' : '客側収支(推計)'}
                                  </th>
                                  <th className="py-2 px-3 text-right">
                                    {perspective === 'hall' ? 'ホール総差枚' : '客側総差枚'}
                                  </th>
                                  <th className="py-2 px-3 text-right">平均稼働G数</th>
                                  <th className="py-2 px-3 text-right">出玉率</th>
                                  <th className="py-2 px-3 text-right">勝率</th>
                                  <th className="py-2 px-3">優秀機種</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {d.records.map((r) => {
                                  const holInfo = getJapaneseHoliday(r.date);
                                  return (
                                    <tr key={r.date} className="hover:bg-slate-50 transition-colors">
                                      <td className="py-2 px-3 font-semibold whitespace-nowrap">
                                        <span>{r.date}</span>{' '}
                                        <span
                                          className={`text-[11px] ${
                                            r.dayOfWeek === '日' || holInfo.isHoliday
                                              ? 'text-rose-600 font-bold'
                                              : r.dayOfWeek === '土'
                                              ? 'text-blue-600 font-bold'
                                              : 'text-slate-400'
                                          }`}
                                        >
                                          ({r.dayOfWeek})
                                        </span>
                                        {holInfo.isHoliday && (
                                          <span className="bg-rose-50 text-rose-700 text-[10px] font-bold px-1.5 py-0.2 rounded ml-1.5 border border-rose-200">
                                            {holInfo.holidayName}
                                          </span>
                                        )}
                                      </td>
                                      <td className="py-2 px-3 whitespace-nowrap">
                                        {r.isOldEventDay ? (
                                          <span className="bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded text-[10px]">
                                            旧イベ
                                          </span>
                                        ) : (
                                          <span className="text-slate-400 text-[11px]">通常</span>
                                        )}
                                      </td>
                                      <td
                                        className={`py-2 px-3 text-right font-bold whitespace-nowrap ${
                                          (perspective === 'hall' ? -r.avgDiffCoins : r.avgDiffCoins) > 0
                                            ? perspective === 'hall' ? 'text-indigo-600' : 'text-blue-600'
                                            : 'text-rose-600'
                                        }`}
                                      >
                                        {(perspective === 'hall' ? -r.avgDiffCoins : r.avgDiffCoins) > 0 ? `+${perspective === 'hall' ? -r.avgDiffCoins : r.avgDiffCoins}` : (perspective === 'hall' ? -r.avgDiffCoins : r.avgDiffCoins)}枚
                                      </td>
                                      <td
                                        className={`py-2 px-3 text-right font-extrabold whitespace-nowrap ${
                                          (perspective === 'hall' ? r.gModelHallProfit : r.gModelPlayerProfit) >= 0
                                            ? perspective === 'hall' ? 'text-indigo-600' : 'text-blue-600'
                                            : 'text-rose-600'
                                        }`}
                                      >
                                        <div>{formatYen(perspective === 'hall' ? r.gModelHallProfit : r.gModelPlayerProfit)}</div>
                                        <div className="text-[10px] text-slate-400 font-normal">
                                          {formatYen(Math.round((perspective === 'hall' ? r.gModelHallProfit : r.gModelPlayerProfit) / (r.totalMachines || 587)))}/台
                                        </div>
                                      </td>
                                      <td className="py-2 px-3 text-right text-slate-600 whitespace-nowrap">
                                        {formatCoins(perspective === 'hall' ? -r.totalDiffCoins : r.totalDiffCoins)}
                                      </td>
                                      <td className="py-2 px-3 text-right text-slate-700 whitespace-nowrap">
                                        {formatNumber(r.avgGames)}G
                                      </td>
                                      <td className="py-2 px-3 text-right whitespace-nowrap font-semibold">
                                        {r.payoutRate.toFixed(2)}%
                                      </td>
                                      <td className="py-2 px-3 text-right whitespace-nowrap text-slate-600">
                                        {r.winRate !== null ? `${r.winRate}%` : '-'}
                                      </td>
                                      <td className="py-2 px-3 text-slate-600 max-w-[200px] truncate" title={r.notable}>
                                        {r.notable || '-'}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer Insight */}
      <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <Info className="w-4 h-4 text-indigo-500" />
          <span>
            行をクリックすると、該当曜日の全営業日明細（日付、区分、客平均差枚、ホール粗利、出玉率、勝率、優秀機種）がドリルダウン表示されます。
          </span>
        </div>
      </div>
    </div>
  );
};
