import React from 'react';
import { MonthlyStat } from '../data/types';
import { ProfitModelType } from './Header';
import { formatYen, formatCoins, formatNumber } from '../utils/formatters';
import { TrendingUp, TrendingDown, DollarSign, CalendarCheck, Zap, Award, Calculator, Percent } from 'lucide-react';

interface KpiCardsProps {
  monthlyStats: MonthlyStat[];
  perspective: 'hall' | 'player';
  unit: 'yen' | 'coins' | 'avgDiff';
  profitModel: ProfitModelType;
}

export const KpiCards: React.FC<KpiCardsProps> = ({
  monthlyStats,
  perspective,
  unit,
  profitModel,
}) => {
  if (monthlyStats.length === 0) return null;

  // Calculate cumulative sums
  const totalDays = monthlyStats.reduce((acc, m) => acc + m.daysCount, 0);
  const totalHallDiffYen = monthlyStats.reduce((acc, m) => acc + m.hallYenProfit, 0);
  const totalPlayerDiffYen = monthlyStats.reduce((acc, m) => acc + m.playerYenProfit, 0);
  const totalHallCoins = monthlyStats.reduce((acc, m) => acc + m.hallCoinProfit, 0);
  const totalPlayerCoins = monthlyStats.reduce((acc, m) => acc + m.playerCoinProfit, 0);

  const totalGModelHallYen = monthlyStats.reduce((acc, m) => acc + m.gModelHallProfit, 0);
  const totalGModelPlayerYen = monthlyStats.reduce((acc, m) => acc + m.gModelPlayerProfit, 0);
  const totalGapProfit = monthlyStats.reduce((acc, m) => acc + m.exchangeGapProfit, 0);
  const totalRevenue = monthlyStats.reduce((acc, m) => acc + m.estimatedRevenue, 0);

  const totalInCoins = monthlyStats.reduce((acc, m) => acc + m.totalInCoins, 0);
  const totalOutCoins = monthlyStats.reduce((acc, m) => acc + m.totalOutCoins, 0);
  const avgPayoutRate = totalInCoins > 0 ? (totalOutCoins / totalInCoins) * 100 : 100;

  const avgGamesWeighted = Math.round(
    monthlyStats.reduce((acc, m) => acc + m.avgGames * m.daysCount, 0) / (totalDays || 1)
  );

  const monthsCount = monthlyStats.length;

  const getEffectiveYen = (m: MonthlyStat) => {
    if (profitModel === 'gCount') {
      return perspective === 'hall' ? m.gModelHallProfit : m.gModelPlayerProfit;
    }
    return perspective === 'hall' ? m.hallYenProfit : m.playerYenProfit;
  };

  const totalPrimaryYen =
    profitModel === 'gCount'
      ? perspective === 'hall'
        ? totalGModelHallYen
        : totalGModelPlayerYen
      : perspective === 'hall'
      ? totalHallDiffYen
      : totalPlayerDiffYen;

  const totalPrimary =
    unit === 'yen'
      ? totalPrimaryYen
      : unit === 'coins'
      ? perspective === 'hall'
        ? totalHallCoins
        : totalPlayerCoins
      : Math.round(
          (perspective === 'hall' ? totalHallCoins : totalPlayerCoins) / totalDays / 587
        );

  const avgMonthlyPrimary = Math.round(totalPrimary / (monthsCount || 1));

  // Find best and worst months for this perspective and model
  const sortedMonths = [...monthlyStats].sort((a, b) => {
    const valA = getEffectiveYen(a);
    const valB = getEffectiveYen(b);
    return valB - valA;
  });

  const bestMonth = sortedMonths[0];
  const worstMonth = sortedMonths[sortedMonths.length - 1];

  const formatVal = (num: number) => {
    if (unit === 'yen') return formatYen(num);
    if (unit === 'coins') return formatCoins(num);
    const sign = num > 0 ? '+' : '';
    return `${sign}${num}枚/台`;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. 期間累計収支 */}
      <div
        id="kpi-card-total"
        className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow"
      >
        <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
          <span>
            {profitModel === 'gCount'
              ? perspective === 'hall'
                ? '期間累計 G数連動粗利'
                : '期間累計 ユーザー収支'
              : perspective === 'hall'
              ? '期間累計 差枚粗利'
              : '期間累計 ユーザー差枚収支'}
          </span>
          <span
            className={`p-1.5 rounded-lg ${
              totalPrimary >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
            }`}
          >
            <DollarSign className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-2">
          <div
            className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
              totalPrimary > 0
                ? perspective === 'hall'
                  ? 'text-emerald-600'
                  : 'text-blue-600'
                : totalPrimary < 0
                ? 'text-rose-600'
                : 'text-slate-800'
            }`}
          >
            {formatVal(totalPrimary)}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
            <span>
              {unit === 'yen'
                ? formatCoins(perspective === 'hall' ? totalHallCoins : totalPlayerCoins)
                : formatYen(totalPrimaryYen)}
            </span>
            <span className="text-slate-400">{monthsCount}ヶ月 ({totalDays}日)</span>
          </div>
        </div>
      </div>

      {/* 2. 月平均収支 */}
      <div
        id="kpi-card-monthly-avg"
        className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow"
      >
        <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
          <span>{perspective === 'hall' ? '月平均 ホール利益' : '月平均 ユーザー収支'}</span>
          <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
            <TrendingUp className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-2">
          <div
            className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
              avgMonthlyPrimary > 0
                ? perspective === 'hall'
                  ? 'text-emerald-600'
                  : 'text-blue-600'
                : avgMonthlyPrimary < 0
                ? 'text-rose-600'
                : 'text-slate-800'
            }`}
          >
            {formatVal(avgMonthlyPrimary)}
            <span className="text-xs font-normal text-slate-400 ml-1">/月</span>
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
            <span>1日あたり: {formatVal(Math.round(totalPrimary / (totalDays || 1)))}</span>
            <span className="text-slate-400">平均稼働 {formatNumber(avgGamesWeighted)}G</span>
          </div>
        </div>
      </div>

      {/* 3. G数モデル特有指標 or 最高利益月 */}
      {profitModel === 'gCount' || profitModel === 'comparison' ? (
        <div
          id="kpi-card-gap-profit"
          className="bg-white rounded-xl p-5 border border-indigo-200/80 shadow-xs hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>換金ギャップ利益 (G数寄与分)</span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Zap className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-600">
              +{formatYen(totalGapProfit)}
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
              <span>推定売上: {formatYen(totalRevenue)}</span>
              <span className="text-indigo-600 font-bold">出玉率 {avgPayoutRate.toFixed(2)}%</span>
            </div>
          </div>
        </div>
      ) : (
        <div
          id="kpi-card-best-month"
          className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>{perspective === 'hall' ? '最高利益月 (店黒字No.1)' : '最高出玉月 (客勝ちNo.1)'}</span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Award className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                {bestMonth.label}
              </span>
            </div>
            <div className="text-xs mt-1 font-semibold text-emerald-600 flex items-center justify-between">
              <span>{formatVal(getEffectiveYen(bestMonth))}</span>
              <span className="text-slate-400 font-normal">
                客平均 {bestMonth.avgDiffCoins > 0 ? `+${bestMonth.avgDiffCoins}` : bestMonth.avgDiffCoins}枚
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 4. 最大還元月 (店赤字) or モデル比較 */}
      <div
        id="kpi-card-worst-month"
        className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow"
      >
        <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
          <span>{perspective === 'hall' ? '最大還元月 (店赤字No.1)' : '最低収支月 (客負けNo.1)'}</span>
          <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
            <TrendingDown className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-2">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {worstMonth.label}
            </span>
          </div>
          <div className="text-xs mt-1 font-semibold text-rose-600 flex items-center justify-between">
            <span>{formatVal(getEffectiveYen(worstMonth))}</span>
            <span className="text-slate-400 font-normal">
              客平均 {worstMonth.avgDiffCoins > 0 ? `+${worstMonth.avgDiffCoins}` : worstMonth.avgDiffCoins}枚
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
