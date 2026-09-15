import React, { useState, useMemo } from 'react';
import { DailyRecord } from '../data/types';
import { formatYen, formatCoins, formatNumber } from '../utils/formatters';
import {
  CalendarDays,
  Flame,
  TrendingUp,
  TrendingDown,
  BarChart2,
  ChevronDown,
  ChevronUp,
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

      const avgPayoutRate = records.reduce((acc, r) => acc + (r.payoutRate || 100), 0) / count;
      const payoutRate = Math.round(avgPayoutRate * 100) / 100;

      const playerWinDays = records.filter((r) => r.avgDiffCoins > 0).length;
      const playerWinRate = Math.round((playerWinDays / count) * 1000) / 10;

      const avgMachines = Math.round(records.reduce((acc, r) => acc + (r.totalMachines || 587), 0) / count);
      const perMachineDailyProfit = avgMachines > 0 ? Math.round(dailyHallProfit / avgMachines) : 0;
      const perMachineDailyPlayerProfit = avgMachines > 0 ? Math.round(dailyPlayerProfit / avgMachines) : 0;

      const displayDiffCoins = perspective === 'hall' ? Math.round(-avgDiffCoins * 10) / 10 : avgDiffCoins;
      const displayDailyProfit = perspective === 'hall' ? dailyHallProfit : dailyPlayerProfit;
      const displayTotalProfit = perspective === 'hall' ? totalHallProfit : totalPlayerProfit;
      const displayPerMachineDailyProfit = perspective === 'hall' ? perMachineDailyProfit : perMachineDailyPlayerProfit;
      const displayPerMachineTotalProfit = displayPerMachineDailyProfit * count;

      return {
        tail,
        label,
        sampleDays,
        count,
        totalHallProfit,
        dailyHallProfit,
        totalPlayerProfit,
        dailyPlayerProfit,
        perMachineDailyProfit,
        perMachineDailyPlayerProfit,
        totalDiffCoins,
        avgDiffCoins,
        displayDiffCoins,
        displayDailyProfit,
        displayTotalProfit,
        displayPerMachineDailyProfit,
        displayPerMachineTotalProfit,
        avgGames,
        payoutRate,
        playerWinDays,
        playerWinRate,
        isStoreEvent,
        records: records.sort((a, b) => b.date.localeCompare(a.date)),
      };
    });
  }, [dailyRecords, oldEventDays, specialDayRules, perspective]);

  // Add player & hall rankings
  const rankedTailStats = useMemo(() => {
    if (!tailStats.length) return [];
    const playerSorted = [...tailStats].sort((a, b) => b.avgDiffCoins - a.avgDiffCoins);
    const playerRankMap = new Map<TailIdentifier, number>();
    playerSorted.forEach((t, idx) => {
      playerRankMap.set(t.tail, idx + 1);
    });

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

      {/* Chart Section */}
      <div className="p-5 border-b border-slate-100">
        <div className="h-64 sm:h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={tailStats}
              margin={{ top: 15, right: 20, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={{ stroke: '#cbd5e1' }}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={{ stroke: '#cbd5e1' }}
                tickFormatter={(val) => {
                  if (chartMetric === 'avgDiffCoins') return `${val > 0 ? '+' : ''}${val}`;
                  if (chartMetric === 'dailyProfit') return `${(val / 10000).toFixed(0)}万`;
                  return `${val}%`;
                }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, 'auto']}
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                axisLine={{ stroke: '#cbd5e1' }}
                tickFormatter={(val) => `${val}G`}
              />
              <Tooltip content={<CustomChartTooltip />} />
              <ReferenceLine yAxisId="left" y={chartMetric === 'payoutRate' ? 100 : 0} stroke="#94a3b8" strokeDasharray="3 3" />
              
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
              >
                {tailStats.map((entry, index) => {
                  let fillColor = '#6366f1';
                  if (chartMetric === 'avgDiffCoins') {
                    fillColor = entry.displayDiffCoins > 0
                      ? isHall ? '#818cf8' : '#3b82f6'
                      : '#f43f5e';
                  } else if (chartMetric === 'dailyProfit') {
                    fillColor = entry.displayDailyProfit >= 0
                      ? isHall ? '#10b981' : '#3b82f6'
                      : '#f43f5e';
                  } else {
                    fillColor = entry.payoutRate >= 100 ? '#10b981' : '#f43f5e';
                  }
                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={fillColor}
                      stroke={entry.isStoreEvent ? '#f59e0b' : 'none'}
                      strokeWidth={entry.isStoreEvent ? 2 : 0}
                    />
                  );
                })}
              </Bar>

              <Line
                yAxisId="right"
                type="monotone"
                dataKey="avgGames"
                name="台平均稼働G数"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ r: 3, fill: '#f59e0b' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detail Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left text-slate-700">
          <thead className="text-[11px] text-slate-500 bg-slate-50/80 uppercase border-b border-slate-200/80">
            <tr>
              <th className="px-4 py-3 font-bold cursor-pointer hover:bg-slate-100" onClick={() => handleSort('tail')}>
                末尾区分
              </th>
              <th className="px-3 py-3 font-bold cursor-pointer hover:bg-slate-100" onClick={() => handleSort('rank')}>
                順位
              </th>
              <th className="px-3 py-3 font-bold text-right cursor-pointer hover:bg-slate-100" onClick={() => handleSort('avgDiffCoins')}>
                {isHall ? '店平均差枚' : '客平均差枚'}
              </th>
              <th className="px-3 py-3 font-bold text-right cursor-pointer hover:bg-slate-100" onClick={() => handleSort('hallYen')}>
                {isHall ? '1日平均粗利' : '1日平均客収支'}
              </th>
              <th className="px-3 py-3 font-bold text-right cursor-pointer hover:bg-slate-100" onClick={() => handleSort('avgGames')}>
                平均稼働G
              </th>
              <th className="px-3 py-3 font-bold text-right cursor-pointer hover:bg-slate-100" onClick={() => handleSort('payoutRate')}>
                機械割
              </th>
              <th className="px-3 py-3 font-bold text-right cursor-pointer hover:bg-slate-100" onClick={() => handleSort('winRate')}>
                客勝率
              </th>
              <th className="px-3 py-3 font-bold text-center">傾向判定</th>
              <th className="px-4 py-3 font-bold text-center">詳細展開</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedTails.map((t) => {
              const isExpanded = expandedTail === t.tail;
              return (
                <React.Fragment key={`tail-row-${t.tail}`}>
                  <tr className={`hover:bg-slate-50/80 transition-colors ${t.isStoreEvent ? 'bg-amber-50/30 font-medium' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{t.label}</span>
                        {t.isStoreEvent && (
                          <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded">
                            特日
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400">{t.sampleDays} ({t.count}日)</div>
                    </td>
                    <td className="px-3 py-3 font-bold text-slate-600">
                      {t.count > 0 ? `${isHall ? t.rankHall : t.rankPlayer}位` : '-'}
                    </td>
                    <td className={`px-3 py-3 text-right font-extrabold ${t.displayDiffCoins > 0 ? (isHall ? 'text-indigo-600' : 'text-blue-600') : 'text-rose-600'}`}>
                      {t.displayDiffCoins > 0 ? `+${t.displayDiffCoins}` : t.displayDiffCoins}枚
                    </td>
                    <td className={`px-3 py-3 text-right font-extrabold ${t.displayDailyProfit >= 0 ? (isHall ? 'text-emerald-600' : 'text-blue-600') : 'text-rose-600'}`}>
                      {formatYen(t.displayDailyProfit)}
                    </td>
                    <td className="px-3 py-3 text-right font-semibold text-slate-700">
                      {formatNumber(t.avgGames)}G
                    </td>
                    <td className="px-3 py-3 text-right font-semibold text-slate-700">
                      {t.payoutRate.toFixed(2)}%
                    </td>
                    <td className="px-3 py-3 text-right font-semibold text-slate-700">
                      {t.playerWinRate}% ({t.playerWinDays}/{t.count})
                    </td>
                    <td className="px-3 py-3 text-center">
                      {getStatusBadge(t)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => toggleExpand(t.tail)}
                        className="p-1 rounded hover:bg-slate-200 text-slate-500 cursor-pointer"
                        title="該当営業日リストを表示"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </td>
                  </tr>

                  {/* Expanded Sub-Table */}
                  {isExpanded && (
                    <tr>
                      <td colSpan={9} className="bg-slate-50 p-4">
                        <div className="text-xs font-bold text-slate-800 mb-2">
                          {t.label} の営業日一覧 ({t.records.length}日間)
                        </div>
                        <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white">
                          <table className="w-full text-[11px] text-left">
                            <thead className="bg-slate-100 text-slate-600 sticky top-0">
                              <tr>
                                <th className="px-3 py-1.5">日付</th>
                                <th className="px-2 py-1.5">曜日</th>
                                <th className="px-2 py-1.5 text-right">{isHall ? 'ホール差枚' : '客差枚'}</th>
                                <th className="px-2 py-1.5 text-right">{isHall ? 'ホール粗利' : '客収支'}</th>
                                <th className="px-2 py-1.5 text-right">稼働G数</th>
                                <th className="px-2 py-1.5 text-right">機械割</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {t.records.map((r) => (
                                <tr key={r.date} className="hover:bg-slate-50">
                                  <td className="px-3 py-1 font-mono font-bold text-slate-800">{r.date}</td>
                                  <td className="px-2 py-1 text-slate-600">{r.dayOfWeek}</td>
                                  <td className={`px-2 py-1 text-right font-bold ${
                                    isHall
                                      ? r.avgDiffCoins < 0 ? 'text-indigo-600' : 'text-rose-600'
                                      : r.avgDiffCoins > 0 ? 'text-blue-600' : 'text-rose-600'
                                  }`}>
                                    {isHall ? -r.avgDiffCoins : r.avgDiffCoins}枚
                                  </td>
                                  <td className="px-2 py-1 text-right font-bold text-slate-700">
                                    {formatYen(isHall ? (r.gModelHallProfit || 0) : (r.gModelPlayerProfit || 0))}
                                  </td>
                                  <td className="px-2 py-1 text-right text-slate-600">{formatNumber(r.avgGames)}G</td>
                                  <td className="px-2 py-1 text-right text-slate-600">{(r.payoutRate || 100).toFixed(2)}%</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
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
    </div>
  );
};
