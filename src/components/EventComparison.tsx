import React from 'react';
import { DailyRecord } from '../data/types';
import { formatYen, formatCoins, formatNumber } from '../utils/formatters';
import { Calendar, Flame, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';

interface EventComparisonProps {
  dailyRecords: DailyRecord[];
  perspective: 'hall' | 'player';
  unit: 'yen' | 'coins' | 'avgDiff';
  oldEventDays?: string;
}

export const EventComparison: React.FC<EventComparisonProps> = ({
  dailyRecords,
  perspective,
  unit,
  oldEventDays,
}) => {
  if (dailyRecords.length === 0) return null;

  const eventDays = dailyRecords.filter((d) => d.isOldEventDay);
  const normalDays = dailyRecords.filter((d) => !d.isOldEventDay);

  const calcGroup = (records: DailyRecord[]) => {
    const count = records.length;
    if (count === 0) {
      return { count: 0, avgDiff: 0, totalDiff: 0, hallYen: 0, playerYen: 0, avgGames: 0, winRate: 0 };
    }
    const totalDiff = records.reduce((acc, r) => acc + r.totalDiffCoins, 0);
    const avgDiff = Math.round((records.reduce((acc, r) => acc + r.avgDiffCoins, 0) / count) * 10) / 10;
    const hallYen = records.reduce((acc, r) => acc + r.hallYenProfit, 0);
    const playerYen = records.reduce((acc, r) => acc + r.playerYenProfit, 0);
    const avgGames = Math.round(records.reduce((acc, r) => acc + r.avgGames, 0) / count);

    const withWr = records.filter((r) => r.winRate !== null);
    const avgWr = withWr.length
      ? Math.round((withWr.reduce((acc, r) => acc + (r.winRate || 0), 0) / withWr.length) * 10) / 10
      : 0;

    return { count, avgDiff, totalDiff, hallYen, playerYen, avgGames, winRate: avgWr };
  };

  const eventStats = calcGroup(eventDays);
  const normalStats = calcGroup(normalDays);

  // Day of week analysis
  const dows = ['月', '火', '水', '木', '金', '土', '日'];
  const dowStats = dows.map((dow) => {
    const list = dailyRecords.filter((r) => r.dayOfWeek === dow);
    return {
      dow,
      ...calcGroup(list),
    };
  });

  const formatProfit = (hallYen: number, playerYen: number, totalDiff: number, avgDiff: number) => {
    if (perspective === 'hall') {
      if (unit === 'yen') return formatYen(hallYen);
      if (unit === 'coins') return formatCoins(-totalDiff);
      return `${-avgDiff > 0 ? `+${-avgDiff}` : -avgDiff}枚/台`;
    } else {
      if (unit === 'yen') return formatYen(playerYen);
      if (unit === 'coins') return formatCoins(totalDiff);
      return `${avgDiff > 0 ? `+${avgDiff}` : avgDiff}枚/台`;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* 1. Event Days vs Normal Days Summary Card */}
      <div className="lg:col-span-1 bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-500" />
              旧イベント日 vs 通常営業日
            </h3>
            <span className="text-[11px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-medium">
              {oldEventDays || '特定日'}
            </span>
          </div>

          <div className="mt-4 space-y-4">
            {/* Event Days */}
            <div className="p-3.5 rounded-lg bg-amber-50/70 border border-amber-200/80">
              <div className="flex items-center justify-between text-xs font-semibold text-amber-900">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  旧イベント日 ({eventStats.count}日間)
                </span>
                <span className="text-slate-600 font-normal">
                  平均稼働 {formatNumber(eventStats.avgGames)}G
                </span>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-xs text-slate-600">
                  {perspective === 'hall' ? 'ホール利益:' : '客側収支:'}
                </span>
                <span
                  className={`text-lg font-black ${
                    (perspective === 'hall' ? eventStats.hallYen : eventStats.playerYen) >= 0
                      ? 'text-emerald-700'
                      : 'text-rose-600'
                  }`}
                >
                  {formatProfit(eventStats.hallYen, eventStats.playerYen, eventStats.totalDiff, eventStats.avgDiff)}
                </span>
              </div>
              <div className="text-[11px] text-slate-600 flex justify-between mt-1 pt-1 border-t border-amber-200/60">
                <span>1台あたり客平均差枚:</span>
                <span className="font-bold text-blue-700">
                  {eventStats.avgDiff > 0 ? `+${eventStats.avgDiff}` : eventStats.avgDiff} 枚/台
                </span>
              </div>
            </div>

            {/* Normal Days */}
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  通常営業日 ({normalStats.count}日間)
                </span>
                <span className="text-slate-500 font-normal">
                  平均稼働 {formatNumber(normalStats.avgGames)}G
                </span>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-xs text-slate-600">
                  {perspective === 'hall' ? 'ホール利益:' : '客側収支:'}
                </span>
                <span
                  className={`text-lg font-black ${
                    (perspective === 'hall' ? normalStats.hallYen : normalStats.playerYen) >= 0
                      ? 'text-emerald-700'
                      : 'text-rose-600'
                  }`}
                >
                  {formatProfit(normalStats.hallYen, normalStats.playerYen, normalStats.totalDiff, normalStats.avgDiff)}
                </span>
              </div>
              <div className="text-[11px] text-slate-600 flex justify-between mt-1 pt-1 border-t border-slate-200">
                <span>1台あたり客平均差枚:</span>
                <span className="font-bold text-slate-700">
                  {normalStats.avgDiff > 0 ? `+${normalStats.avgDiff}` : normalStats.avgDiff} 枚/台
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 text-[11px] text-slate-500 bg-slate-100/80 p-2.5 rounded text-left">
          💡 <span className="font-semibold text-slate-700">傾向分析:</span>{' '}
          {eventStats.avgDiff > normalStats.avgDiff
            ? `旧イベント日（11日/22日/ゾロ目）は通常日より客側平均差枚が+${(eventStats.avgDiff - normalStats.avgDiff).toFixed(1)}枚高く、店舗が積極的に還元している傾向が伺えます。`
            : `旧イベント日と通常日の差枚傾向に大きな乖離は見られません。`}
        </div>
      </div>

      {/* 2. Day of Week Analysis */}
      <div className="lg:col-span-2 bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-indigo-500" />
            曜日別の利益・出玉傾向分析
          </h3>
          <span className="text-xs text-slate-500 font-normal">全{dailyRecords.length}日間の曜日別平均</span>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {dowStats.map((item) => {
            const isWeekend = item.dow === '土' || item.dow === '日';
            const isHallProfit = item.hallYen >= 0;
            return (
              <div
                key={item.dow}
                className={`p-3 rounded-lg border text-center flex flex-col justify-between ${
                  item.dow === '日'
                    ? 'bg-rose-50/50 border-rose-200'
                    : item.dow === '土'
                    ? 'bg-blue-50/50 border-blue-200'
                    : 'bg-slate-50/60 border-slate-200'
                }`}
              >
                <div>
                  <div
                    className={`font-black text-sm ${
                      item.dow === '日'
                        ? 'text-rose-600'
                        : item.dow === '土'
                        ? 'text-blue-600'
                        : 'text-slate-800'
                    }`}
                  >
                    {item.dow}曜日
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{item.count}日分</div>
                </div>

                <div className="my-2">
                  <div className="text-[10px] text-slate-500">客平均差枚</div>
                  <div
                    className={`font-extrabold text-sm ${
                      item.avgDiff > 0 ? 'text-blue-600' : 'text-slate-700'
                    }`}
                  >
                    {item.avgDiff > 0 ? `+${item.avgDiff}` : item.avgDiff}枚
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/80">
                  <div className="text-[10px] text-slate-500">
                    {perspective === 'hall' ? '店粗利合計' : '客収支合計'}
                  </div>
                  <div
                    className={`text-xs font-bold truncate ${
                      (perspective === 'hall' ? item.hallYen : item.playerYen) >= 0
                        ? 'text-emerald-700'
                        : 'text-rose-600'
                    }`}
                  >
                    {formatYen(perspective === 'hall' ? item.hallYen : item.playerYen)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    {formatNumber(item.avgGames)}G
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
          <span>
            📌 <span className="font-semibold text-slate-700">曜日ポイント:</span> 土日は平均稼働G数が伸びる一方、特定曜日（火・金・月など）の入替や特日に高設定が投入される傾向が見られます。
          </span>
        </div>
      </div>
    </div>
  );
};
