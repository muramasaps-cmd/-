import React, { useState, useMemo } from 'react';
import { DailyRecord } from '../data/types';
import { formatYen, formatCoins, formatNumber } from '../utils/formatters';
import {
  CalendarDays,
  Flame,
  TrendingUp,
  TrendingDown,
  Award,
  BarChart2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Zap,
  Info,
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

type TailIdentifier = number | 'zoro';

interface TailNumberAnalysisProps {
  dailyRecords: DailyRecord[];
  perspective: 'hall' | 'player';
  unit: 'yen' | 'coins' | 'avgDiff';
  oldEventDays?: string;
  specialDayRules?: any;
  onSelectDate?: (date: string) => void;
}

export const TailNumberAnalysis: React.FC<TailNumberAnalysisProps> = ({
  dailyRecords,
  perspective,
  unit,
  oldEventDays = '',
  specialDayRules,
}) => {
  const [expandedTail, setExpandedTail] = useState<TailIdentifier | null>(null);
  const [sortField, setSortField] = useState<'tail' | 'avgDiffCoins' | 'hallYen' | 'avgGames' | 'payoutRate' | 'winRate' | 'rank'>('tail');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [chartMetric, setChartMetric] = useState<'avgDiffCoins' | 'dailyProfit' | 'payoutRate'>('avgDiffCoins');
  const isHall = perspective === 'hall';

  // Check which tail is designated as a store event day
  const isTargetStoreEventTail = (tail: TailIdentifier): boolean => {
    if (tail === 'zoro') {
      if (specialDayRules?.doubleDigits || specialDayRules?.monthDayZoro) return true;
      if (oldEventDays && (oldEventDays.includes('ゾロ目') || oldEventDays.includes('ゾロ'))) {
        return true;
      }
      return false;
    }
    if (specialDayRules?.tails && Array.isArray(specialDayRules.tails)) {
      if (specialDayRules.tails.includes(tail)) return true;
    }
    if (oldEventDays) {
      // Check phrases like "7のつく日", "0のつく日", "7,17,27", "7日"
      if (oldEventDays.includes(`${tail}のつく日`) || oldEventDays.includes(`${tail}の付く日`)) {
        return true;
      }
      if (tail === 7 && oldEventDays.includes('7')) return true;
      if (tail === 0 && (oldEventDays.includes('0') || oldEventDays.includes('10'))) return true;
      if (tail === 3 && oldEventDays.includes('3')) return true;
      if (tail === 5 && oldEventDays.includes('5')) return true;
      if (tail === 6 && oldEventDays.includes('6')) return true;
      if (tail === 8 && oldEventDays.includes('8')) return true;
      if (tail === 9 && oldEventDays.includes('9')) return true;
      if (tail === 1 && oldEventDays.includes('1')) return true;
    }
    return false;
  };

  // Group by tail (0 ~ 9) and Zoro
  const tailStats = useMemo(() => {
    if (!dailyRecords || dailyRecords.length === 0) return [];

    const tails: TailIdentifier[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 'zoro'];

    return tails.map((tail) => {
      // Days ending with this tail (e.g. 7 -> 7, 17, 27) or Zoro days
      const records = tail === 'zoro'
        ? dailyRecords.filter((r) => r.day === 11 || r.day === 22 || (r.month === r.day))
        : dailyRecords.filter((r) => r.day % 10 === tail);
      const count = records.length;

      const label = tail === 'zoro' ? 'ゾロ目の日' : `${tail}のつく日`;
      const sampleDays = tail === 'zoro'
        ? '11日, 22日, 月日ゾロ目'
        : tail === 0
        ? '10日, 20日, 30日'
        : tail === 1
        ? '1日, 11日, 21日, 31日'
        : `${tail}日, 1${tail}日, 2${tail}日`;
      const isStoreEvent = isTargetStoreEventTail(tail);

      if (count === 0) {
        return {
          tail,
          label,
          sampleDays,
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
          isStoreEvent,
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

      // Also verify if majority of days were marked as old event day
      const eventDaysCount = records.filter((r) => r.isOldEventDay).length;
      const isStoreEventFinal = isStoreEvent || (eventDaysCount / count >= 0.5);

      return {
        tail,
        label,
        sampleDays,
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
        isStoreEvent: isStoreEventFinal,
        records: records.sort((a, b) => b.date.localeCompare(a.date)),
      };
    });
  }, [dailyRecords, oldEventDays, specialDayRules, perspective]);

  // Add player & hall rankings
  const rankedTailStats = useMemo(() => {
    if (!tailStats.length) return [];
    // Sort by avgDiffCoins descending for player rank
    const playerSorted = [...tailStats].sort((a, b) => b.avgDiffCoins - a.avgDiffCoins);
    const playerRankMap = new Map<TailIdentifier, number>();
    playerSorted.forEach((t, idx) => {
      playerRankMap.set(t.tail, idx + 1);
    });

    // Sort by dailyHallProfit descending for hall rank
    const hallSorted = [...tailStats].sort((a, b) => b.dailyHallProfit - a.dailyHallProfit);
    const hallRankMap = new Map<TailIdentifier, number>();
    hallSorted.forEach((t, idx) => {
      hallRankMap.set(t.tail, idx + 1);
    });

    return tailStats.map((t) => ({
      ...t,
      rankPlayer: playerRankMap.get(t.tail) || 0,
      rankHall: hallRankMap.get(t.tail) || 0,
    }));
  }, [tailStats]);

  // Rankings
  const bestPlayerTail = useMemo(() => {
    const valid = rankedTailStats.filter((t) => t.count > 0);
    if (!valid.length) return null;
    return [...valid].sort((a, b) => b.avgDiffCoins - a.avgDiffCoins)[0];
  }, [rankedTailStats]);

  const bestHallTail = useMemo(() => {
    const valid = rankedTailStats.filter((t) => t.count > 0);
    if (!valid.length) return null;
    return [...valid].sort((a, b) => b.dailyHallProfit - a.dailyHallProfit)[0];
  }, [rankedTailStats]);

  const highestGamesTail = useMemo(() => {
    const valid = rankedTailStats.filter((t) => t.count > 0);
    if (!valid.length) return null;
    return [...valid].sort((a, b) => b.avgGames - a.avgGames)[0];
  }, [rankedTailStats]);

  const storeEventTails = useMemo(() => {
    return rankedTailStats.filter((t) => t.isStoreEvent && t.count > 0);
  }, [rankedTailStats]);

  // Top 3 Ranking lists
  const topPlayerTails = useMemo(() => {
    return [...rankedTailStats].filter((t) => t.count > 0).sort((a, b) => b.avgDiffCoins - a.avgDiffCoins).slice(0, 3);
  }, [rankedTailStats]);

  const topHallTails = useMemo(() => {
    return [...rankedTailStats].filter((t) => t.count > 0).sort((a, b) => b.dailyHallProfit - a.dailyHallProfit).slice(0, 3);
  }, [rankedTailStats]);

  // Sorted list for table
  const sortedTails = useMemo(() => {
    const list = [...rankedTailStats];
    list.sort((a, b) => {
      let diff = 0;
      if (sortField === 'tail') {
        const orderA = a.tail === 'zoro' ? 10 : a.tail;
        const orderB = b.tail === 'zoro' ? 10 : b.tail;
        diff = orderA - orderB;
      }
      else if (sortField === 'rank') {
        const rankA = perspective === 'hall' ? a.rankHall : a.rankPlayer;
        const rankB = perspective === 'hall' ? b.rankHall : b.rankPlayer;
        diff = rankA - rankB;
      }
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
  }, [rankedTailStats, sortField, sortOrder, perspective]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder(field === 'tail' ? 'asc' : 'desc');
    }
  };

  const toggleExpand = (tail: TailIdentifier) => {
    setExpandedTail((prev) => (prev === tail ? null : tail));
  };

  // Evaluation status helper
  const getStatusBadge = (t: typeof tailStats[0]) => {
    if (t.count === 0) {
      return <span className="text-slate-400 text-xs">データなし</span>;
    }
    if (t.avgDiffCoins >= 120 || t.payoutRate >= 101.5) {
      return (
        <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold px-2 py-0.5 rounded-full">
          <Flame className="w-3 h-3 text-rose-600" />
          激アツ還元
        </span>
      );
    }
    if (t.avgDiffCoins > 0) {
      return (
        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-2 py-0.5 rounded-full">
          <TrendingUp className="w-3 h-3 text-emerald-600" />
          還元傾向
        </span>
      );
    }
    if (t.avgDiffCoins >= -120) {
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
      const data: typeof tailStats[0] = payload[0].payload;
      const isHall = perspective === 'hall';

      return (
        <div className="bg-slate-900/95 text-white p-3 rounded-lg shadow-xl border border-slate-700 text-xs max-w-xs backdrop-blur-xs">
          <div className="font-bold text-sm text-amber-400 border-b border-slate-700 pb-1 mb-1.5 flex items-center justify-between">
            <span>{data.label} ({data.sampleDays})</span>
            {data.isStoreEvent && (
              <span className="bg-amber-500 text-slate-950 font-black px-1.5 py-0.2 rounded text-[10px]">
                看板特日
              </span>
            )}
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
    <div id="tail-number-analysis" className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <CalendarDays className="w-5 h-5" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>「〇のつく日」・ゾロ目の日別 利益・出玉傾向分析</span>
              <span className="text-xs font-normal text-slate-500">
                (日付末尾 0〜9 & ゾロ目の日)
              </span>
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            0のつく日(10・20・30日)から9のつく日(9・19・29日)、およびゾロ目の日(11日・22日・月日ゾロ目)の出玉傾向・ホール粗利・稼働状況を比較分析します。
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
        {/* Card 1: Best Player Win Tail */}
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
          {bestPlayerTail ? (
            <div className="mt-2">
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-extrabold text-slate-900">
                  {bestPlayerTail.label}
                </span>
                <span className={`text-sm font-extrabold ${bestPlayerTail.avgDiffCoins > 0 ? 'text-blue-600' : 'text-slate-700'}`}>
                  {bestPlayerTail.avgDiffCoins > 0 ? `+${bestPlayerTail.avgDiffCoins}` : bestPlayerTail.avgDiffCoins}枚/台
                </span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1 flex justify-between">
                <span>出玉率 {bestPlayerTail.payoutRate.toFixed(2)}% (勝率 {bestPlayerTail.playerWinRate}%)</span>
                <span className="font-semibold text-blue-600">
                  還元 約{formatYen(Math.abs(bestPlayerTail.perMachineDailyPlayerProfit))}/台
                </span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400 mt-2">データなし</div>
          )}
        </div>

        {/* Card 2: Highest Games Tail */}
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
          {highestGamesTail ? (
            <div className="mt-2">
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-extrabold text-slate-900">
                  {highestGamesTail.label}
                </span>
                <span className="text-sm font-extrabold text-amber-600">
                  {formatNumber(highestGamesTail.avgGames)}G/台
                </span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1 flex justify-between">
                <span>差枚 {highestGamesTail.avgDiffCoins > 0 ? `+${highestGamesTail.avgDiffCoins}` : highestGamesTail.avgDiffCoins}枚</span>
                <span className="font-semibold text-amber-700">
                  粗利 {formatYen(highestGamesTail.perMachineDailyProfit)}/台
                </span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400 mt-2">データなし</div>
          )}
        </div>

        {/* Card 3: Best Hall Profit Tail */}
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
          {bestHallTail ? (
            <div className="mt-2">
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-extrabold text-slate-900">
                  {bestHallTail.label}
                </span>
                <span className="text-sm font-extrabold text-indigo-600">
                  {formatYen(bestHallTail.dailyHallProfit)}/日
                </span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1 flex justify-between">
                <span>出玉率 {bestHallTail.payoutRate.toFixed(2)}%</span>
                <span className="font-semibold text-indigo-700">
                  粗利 {formatYen(bestHallTail.perMachineDailyProfit)}/台
                </span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400 mt-2">データなし</div>
          )}
        </div>

        {/* Card 4: Store Event Day Verification */}
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-700 font-bold">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              看板特日の実績検証
            </span>
            <span className="bg-slate-100 text-slate-600 text-[10px] px-1.5 py-0.2 rounded font-bold">
              {oldEventDays || '特定日'}
            </span>
          </div>
          {storeEventTails.length > 0 ? (
            <div className="mt-2">
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-extrabold text-slate-900">
                  {storeEventTails.map((t) => t.label).join(', ')}
                </span>
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                  storeEventTails[0].avgDiffCoins > 0 ? 'bg-blue-50 text-blue-700' : 'bg-rose-50 text-rose-700'
                }`}>
                  {storeEventTails[0].avgDiffCoins > 0 ? '客側優勢' : '店側優勢'}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1 flex justify-between">
                <span>客平均 {storeEventTails[0].avgDiffCoins > 0 ? `+${storeEventTails[0].avgDiffCoins}` : storeEventTails[0].avgDiffCoins}枚</span>
                <span className="font-semibold text-slate-700">
                  1台粗利 {formatYen(storeEventTails[0].perMachineDailyProfit)}/台
                </span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 mt-2">
              店舗設定特日: {oldEventDays || '未設定'}
            </div>
          )}
        </div>
      </div>

      {/* Top 3 Podium Rankings Summary Banner */}
      <div className="px-4 sm:px-5 py-3 bg-slate-50 border-b border-slate-200/80">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* User Side Top 3 */}
          <div className="bg-white p-3 rounded-xl border border-blue-200/80 shadow-2xs">
            <div className="flex items-center justify-between pb-1 border-b border-blue-50">
              <span className="text-xs font-bold text-blue-900 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-rose-500" />
                スロッター有利 末尾TOP 3 (出玉還元)
              </span>
              <span className="text-[10px] text-blue-600 font-semibold">客平均差枚順</span>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {topPlayerTails.map((t, idx) => {
                const medals = ['🥇 1位', '🥈 2位', '🥉 3位'];
                const medalBg = [
                  'bg-amber-100 text-amber-900 border-amber-300',
                  'bg-slate-100 text-slate-800 border-slate-300',
                  'bg-orange-100 text-orange-900 border-orange-300',
                ];
                return (
                  <div
                    key={t.tail}
                    onClick={() => toggleExpand(t.tail)}
                    className="p-1.5 rounded-lg border border-slate-100 hover:border-blue-300 hover:bg-blue-50/40 cursor-pointer transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] px-1 py-0.2 rounded font-black border ${medalBg[idx]}`}>
                        {medals[idx]}
                      </span>
                      <span className="text-xs font-black text-slate-900">{t.label}</span>
                    </div>
                    <div className="mt-1 text-center">
                      <div className={`text-xs font-black ${t.avgDiffCoins > 0 ? 'text-blue-600' : 'text-slate-700'}`}>
                        {t.avgDiffCoins > 0 ? `+${t.avgDiffCoins}` : t.avgDiffCoins}枚
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium">割 {t.payoutRate.toFixed(1)}%</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Hall Side Top 3 */}
          <div className="bg-white p-3 rounded-xl border border-indigo-200/80 shadow-2xs">
            <div className="flex items-center justify-between pb-1 border-b border-indigo-50">
              <span className="text-xs font-bold text-indigo-900 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                ホール回収 末尾TOP 3 (店舗粗利)
              </span>
              <span className="text-[10px] text-indigo-600 font-semibold">1日平均粗利順</span>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {topHallTails.map((t, idx) => {
                const medals = ['🥇 1位', '🥈 2位', '🥉 3位'];
                const medalBg = [
                  'bg-amber-100 text-amber-900 border-amber-300',
                  'bg-slate-100 text-slate-800 border-slate-300',
                  'bg-orange-100 text-orange-900 border-orange-300',
                ];
                return (
                  <div
                    key={t.tail}
                    onClick={() => toggleExpand(t.tail)}
                    className="p-1.5 rounded-lg border border-slate-100 hover:border-indigo-300 hover:bg-indigo-50/40 cursor-pointer transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] px-1 py-0.2 rounded font-black border ${medalBg[idx]}`}>
                        {medals[idx]}
                      </span>
                      <span className="text-xs font-black text-slate-900">{t.label}</span>
                    </div>
                    <div className="mt-1 text-center">
                      <div className="text-xs font-black text-indigo-600">
                        {formatYen(t.dailyHallProfit)}
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium">
                        {formatYen(t.perMachineDailyProfit)}/台
                      </div>
                    </div>
                  </div>
                );
              })}
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
                  ? '0〜9のつく日別 ホール平均差枚（棒） & 台平均稼働G数（折れ線）'
                  : '0〜9のつく日別 客平均差枚（棒） & 台平均稼働G数（折れ線）'
                : chartMetric === 'dailyProfit'
                ? isHall
                  ? '0〜9のつく日別 1日平均ホール粗利（棒） & 台平均稼働G数（折れ線）'
                  : '0〜9のつく日別 1日平均客収支（棒） & 台平均稼働G数（折れ線）'
                : '0〜9のつく日別 機械割・出玉率（棒） & 台平均稼働G数（折れ線）'}
            </span>
          </div>
          <span className="text-slate-400">※各棒をクリックすると詳細明細を展開します</span>
        </div>

        <div key={`tail-chart-${chartMetric}-${perspective}`} className="h-64 sm:h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={tailStats}
              margin={{ top: 15, right: 20, left: 10, bottom: 5 }}
              onClick={(state: any) => {
                if (state && state.activePayload && state.activePayload.length) {
                  const clickedTail = state.activePayload[0].payload.tail;
                  toggleExpand(clickedTail);
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
                tickFormatter={(v: string) => (v === 'ゾロ目の日' ? 'ゾロ目' : v.replace('のつく日', 'の日'))}
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
                {tailStats.map((entry, idx) => {
                  let fillColor = '#6366f1';
                  if (chartMetric === 'avgDiffCoins') {
                    if (isHall) {
                      fillColor = entry.displayDiffCoins >= 0 ? '#6366f1' : '#f43f5e';
                    } else {
                      fillColor = entry.displayDiffCoins >= 0 ? '#3b82f6' : '#f43f5e';
                    }
                  } else if (chartMetric === 'dailyProfit') {
                    if (isHall) {
                      fillColor = entry.displayDailyProfit >= 0 ? '#6366f1' : '#f43f5e';
                    } else {
                      fillColor = entry.displayDailyProfit >= 0 ? '#3b82f6' : '#f43f5e';
                    }
                  } else {
                    fillColor = entry.payoutRate >= 100 ? '#10b981' : '#f43f5e';
                  }
                  if (entry.isStoreEvent) {
                    fillColor = '#f59e0b'; // Highlight store event days
                  }
                  return <Cell key={`bar-${idx}`} fill={fillColor} opacity={entry.count === 0 ? 0.2 : 0.9} />;
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
                onClick={() => handleSort('rank')}
                className="py-3 px-3 text-center cursor-pointer hover:bg-slate-100 transition-colors whitespace-nowrap"
              >
                <div className="flex items-center justify-center gap-1">
                  順位
                  {sortField === 'rank' && (sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                </div>
              </th>
              <th
                onClick={() => handleSort('tail')}
                className="py-3 px-3.5 cursor-pointer hover:bg-slate-100 transition-colors whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  末尾
                  {sortField === 'tail' && (sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                </div>
              </th>
              <th className="py-3 px-3 whitespace-nowrap">傾向判定</th>
              <th className="py-3 px-3 text-right whitespace-nowrap">日数</th>
              <th
                onClick={() => handleSort('avgDiffCoins')}
                className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 transition-colors whitespace-nowrap text-blue-700"
              >
                <div className="flex items-center justify-end gap-1">
                  {isHall ? 'ホール平均差枚' : '客平均差枚'}
                  {sortField === 'avgDiffCoins' && (sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                </div>
              </th>
              <th
                onClick={() => handleSort('hallYen')}
                className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 transition-colors whitespace-nowrap text-indigo-700"
              >
                <div className="flex items-center justify-end gap-1">
                  {isHall ? '1日平均粗利' : '1日平均客収支'}
                  {sortField === 'hallYen' && (sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                </div>
              </th>
              <th className="py-3 px-3 text-right whitespace-nowrap">
                {isHall ? '期間累計粗利' : '期間累計客収支'}
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
            {sortedTails.map((t) => {
              const isExpanded = expandedTail === t.tail;
              const isEvent = t.isStoreEvent;
              const currentRank = perspective === 'hall' ? t.rankHall : t.rankPlayer;

              return (
                <React.Fragment key={t.tail}>
                  <tr
                    onClick={() => toggleExpand(t.tail)}
                    className={`cursor-pointer transition-colors ${
                      isExpanded
                        ? 'bg-indigo-50/40 font-medium'
                        : isEvent
                        ? 'bg-amber-50/30 hover:bg-amber-50/60'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    {/* Rank Badge */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      {currentRank === 1 ? (
                        <span className="inline-block px-1.5 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                          🥇 1位
                        </span>
                      ) : currentRank === 2 ? (
                        <span className="inline-block px-1.5 py-0.5 rounded-full text-[11px] font-black bg-slate-200 text-slate-800 border border-slate-300 shadow-2xs">
                          🥈 2位
                        </span>
                      ) : currentRank === 3 ? (
                        <span className="inline-block px-1.5 py-0.5 rounded-full text-[11px] font-black bg-orange-100 text-orange-900 border border-orange-300 shadow-2xs">
                          🥉 3位
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500 font-semibold">
                          #{currentRank}
                        </span>
                      )}
                    </td>

                    {/* Tail Number & Label */}
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {t.tail === 'zoro' ? (
                          <span className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] font-black shadow-xs shrink-0">
                            ゾロ
                          </span>
                        ) : (
                          <span className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-black shrink-0">
                            {t.tail}
                          </span>
                        )}
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{t.label}</span>
                            {isEvent && (
                              <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded shadow-2xs">
                                看板特日
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400">{t.sampleDays}</div>
                        </div>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      {getStatusBadge(t)}
                    </td>

                    {/* Count */}
                    <td className="py-3 px-3 text-right font-medium text-slate-600 whitespace-nowrap">
                      {t.count}日
                    </td>

                    {/* Avg Diff Coins (with subtle heatmap pill) */}
                    <td
                      className="py-3 px-3 text-right whitespace-nowrap"
                    >
                      {t.count > 0 ? (
                        <span
                          className={`inline-block px-2 py-0.5 rounded font-black ${
                            isHall
                              ? t.displayDiffCoins >= 100
                                ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                                : t.displayDiffCoins > 0
                                ? 'bg-indigo-50 text-indigo-700'
                                : t.displayDiffCoins <= -150
                                ? 'bg-rose-50 text-rose-800'
                                : 'text-slate-700'
                              : t.displayDiffCoins >= 100
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : t.displayDiffCoins > 0
                              ? 'bg-blue-50 text-blue-700'
                              : t.displayDiffCoins <= -150
                              ? 'bg-rose-50 text-rose-800'
                              : 'text-slate-700'
                          }`}
                        >
                          {t.displayDiffCoins > 0 ? `+${t.displayDiffCoins}` : t.displayDiffCoins} 枚/台
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>

                    {/* Daily Hall / Player Profit */}
                    <td
                      className={`py-3 px-3 text-right font-extrabold whitespace-nowrap ${
                        t.displayDailyProfit >= 0
                          ? isHall ? 'text-indigo-600' : 'text-blue-600'
                          : 'text-rose-600'
                      }`}
                    >
                      <div>{t.count > 0 ? formatYen(t.displayDailyProfit) : '-'}</div>
                      {t.count > 0 && (
                        <div className="text-[10px] text-slate-500 font-normal">
                          {formatYen(t.displayPerMachineDailyProfit)}/台
                        </div>
                      )}
                    </td>

                    {/* Total Hall / Player Profit */}
                    <td
                      className={`py-3 px-3 text-right font-semibold whitespace-nowrap ${
                        t.displayTotalProfit >= 0
                          ? isHall ? 'text-slate-800' : 'text-blue-700'
                          : 'text-rose-600'
                      }`}
                    >
                      <div>{t.count > 0 ? formatYen(t.displayTotalProfit) : '-'}</div>
                      {t.count > 0 && (
                        <div className="text-[10px] text-slate-400 font-normal">
                          {formatYen(t.displayPerMachineTotalProfit)}/台
                        </div>
                      )}
                    </td>

                    {/* Avg Games */}
                    <td className="py-3 px-3 text-right text-slate-700 whitespace-nowrap font-medium">
                      {t.count > 0 ? `${formatNumber(t.avgGames)} G` : '-'}
                    </td>

                    {/* Payout Rate */}
                    <td
                      className={`py-3 px-3 text-right whitespace-nowrap font-bold ${
                        t.payoutRate >= 100 ? 'text-emerald-600' : 'text-slate-600'
                      }`}
                    >
                      {t.count > 0 ? `${t.payoutRate.toFixed(2)}%` : '-'}
                    </td>

                    {/* Win Rate with progress bar */}
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      {t.count > 0 ? (
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-14 bg-slate-200 rounded-full h-1.5 overflow-hidden hidden sm:block">
                            <div
                              className={`h-full rounded-full ${
                                t.playerWinRate >= 50
                                  ? 'bg-rose-500'
                                  : t.playerWinRate >= 35
                                  ? 'bg-blue-500'
                                  : 'bg-slate-400'
                              }`}
                              style={{ width: `${Math.min(t.playerWinRate, 100)}%` }}
                            />
                          </div>
                          <div className="text-right font-semibold text-slate-800">
                            <span>{t.playerWinRate}%</span>
                            <span className="text-[10px] text-slate-400 font-normal ml-1">
                              ({t.playerWinDays}/{t.count})
                            </span>
                          </div>
                        </div>
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
                      <td colSpan={11} className="p-0 bg-slate-50/80">
                        <div className="p-4 sm:p-5 border-y border-slate-200/80 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="font-bold text-slate-800 text-xs sm:text-sm flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-indigo-600" />
                              <span>【{t.label}】の全営業日明細 ({t.records.length}日間)</span>
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
                                    {isHall ? 'ホール平均差枚' : '客平均差枚'}
                                  </th>
                                  <th className="py-2 px-3 text-right">
                                    {isHall ? 'ホール粗利(G数連動)' : '客側収支(推計)'}
                                  </th>
                                  <th className="py-2 px-3 text-right">
                                    {isHall ? 'ホール総差枚' : '客側総差枚'}
                                  </th>
                                  <th className="py-2 px-3 text-right">平均稼働G数</th>
                                  <th className="py-2 px-3 text-right">出玉率</th>
                                  <th className="py-2 px-3 text-right">勝率</th>
                                  <th className="py-2 px-3">優秀機種</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {t.records.map((r) => {
                                  const isSun = r.dayOfWeek === '日';
                                  const isSat = r.dayOfWeek === '土';
                                  return (
                                    <tr key={r.date} className="hover:bg-slate-50 transition-colors">
                                      <td className="py-2 px-3 font-semibold whitespace-nowrap">
                                        <span>{r.date}</span>{' '}
                                        <span
                                          className={`text-[11px] ${
                                            isSun ? 'text-rose-600 font-bold' : isSat ? 'text-blue-600 font-bold' : 'text-slate-400'
                                          }`}
                                        >
                                          ({r.dayOfWeek})
                                        </span>
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
                                          (isHall ? -r.avgDiffCoins : r.avgDiffCoins) > 0
                                            ? isHall ? 'text-indigo-600' : 'text-blue-600'
                                            : 'text-rose-600'
                                        }`}
                                      >
                                        {(isHall ? -r.avgDiffCoins : r.avgDiffCoins) > 0 ? `+${isHall ? -r.avgDiffCoins : r.avgDiffCoins}` : (isHall ? -r.avgDiffCoins : r.avgDiffCoins)}枚
                                      </td>
                                      <td
                                        className={`py-2 px-3 text-right font-extrabold whitespace-nowrap ${
                                          (isHall ? r.gModelHallProfit : r.gModelPlayerProfit) >= 0
                                            ? isHall ? 'text-indigo-600' : 'text-blue-600'
                                            : 'text-rose-600'
                                        }`}
                                      >
                                        <div>{formatYen(isHall ? r.gModelHallProfit : r.gModelPlayerProfit)}</div>
                                        <div className="text-[10px] text-slate-400 font-normal">
                                          {formatYen(Math.round((isHall ? r.gModelHallProfit : r.gModelPlayerProfit) / (r.totalMachines || 587)))}/台
                                        </div>
                                      </td>
                                      <td className="py-2 px-3 text-right text-slate-600 whitespace-nowrap">
                                        {formatCoins(isHall ? -r.totalDiffCoins : r.totalDiffCoins)}
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
            行をクリックすると、該当する各日の日別データ（差枚数、粗利、出玉率、ピックアップ機種）がドリルダウン表示されます。
          </span>
        </div>
      </div>
    </div>
  );
};
