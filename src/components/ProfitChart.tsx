import React, { useState } from 'react';
import { MonthlyStat } from '../data/types';
import { ProfitModelType } from './Header';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Cell,
  Legend,
  Area,
  ComposedChart
} from 'recharts';
import { formatYen, formatCoins, formatNumber } from '../utils/formatters';
import { BarChart3, LineChart as LineChartIcon, Activity, SplitSquareVertical } from 'lucide-react';

interface ProfitChartProps {
  monthlyStats: MonthlyStat[];
  perspective: 'hall' | 'player';
  unit: 'yen' | 'coins' | 'avgDiff';
  profitModel: ProfitModelType;
  onSelectMonth?: (yearMonth: string) => void;
}

export const ProfitChart: React.FC<ProfitChartProps> = ({
  monthlyStats,
  perspective,
  unit,
  profitModel,
  onSelectMonth,
}) => {
  const [chartType, setChartType] = useState<'bar' | 'cumulative' | 'games'>('bar');

  // Prepare data with selected metric
  const chartData = monthlyStats.map((m) => {
    // Model A: Diff
    let diffVal = 0;
    let diffCumVal = 0;

    // Model B: G-count
    let gModelVal = 0;
    let gModelCumVal = 0;

    if (perspective === 'hall') {
      if (unit === 'yen') {
        diffVal = Math.round(m.hallYenProfit / 10000); // 万円
        diffCumVal = Math.round(m.cumHallYenProfit / 10000);

        gModelVal = Math.round(m.gModelHallProfit / 10000);
        gModelCumVal = Math.round(m.cumGModelHallProfit / 10000);
      } else if (unit === 'coins') {
        diffVal = Math.round(m.hallCoinProfit / 10000);
        diffCumVal = Math.round(m.cumHallCoinProfit / 10000);

        // Under G-count model, coins are identical to diff coins
        gModelVal = Math.round(m.hallCoinProfit / 10000);
        gModelCumVal = Math.round(m.cumHallCoinProfit / 10000);
      } else {
        diffVal = -m.avgDiffCoins;
        diffCumVal = 0;
        gModelVal = -m.avgDiffCoins;
        gModelCumVal = 0;
      }
    } else {
      if (unit === 'yen') {
        diffVal = Math.round(m.playerYenProfit / 10000);
        diffCumVal = Math.round(m.cumPlayerYenProfit / 10000);

        gModelVal = Math.round(m.gModelPlayerProfit / 10000);
        gModelCumVal = Math.round(m.cumGModelPlayerProfit / 10000);
      } else if (unit === 'coins') {
        diffVal = Math.round(m.playerCoinProfit / 10000);
        diffCumVal = Math.round(m.cumPlayerCoinProfit / 10000);

        gModelVal = Math.round(m.playerCoinProfit / 10000);
        gModelCumVal = Math.round(m.cumPlayerCoinProfit / 10000);
      } else {
        diffVal = m.avgDiffCoins;
        diffCumVal = 0;
        gModelVal = m.avgDiffCoins;
        gModelCumVal = 0;
      }
    }

    const currentVal = profitModel === 'gCount' ? gModelVal : diffVal;
    const currentCumVal = profitModel === 'gCount' ? gModelCumVal : diffCumVal;

    return {
      ...m,
      diffVal,
      diffCumVal,
      gModelVal,
      gModelCumVal,
      currentVal,
      currentCumVal,
      shortLabel: m.label.replace('20', "'"), // '26年9月
    };
  });

  const unitLabel = unit === 'yen' ? '万円' : unit === 'coins' ? '万枚' : '枚/台';

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: (typeof chartData)[0] = payload[0].payload;
      const diffYen = perspective === 'hall' ? data.hallYenProfit : data.playerYenProfit;
      const gYen = perspective === 'hall' ? data.gModelHallProfit : data.gModelPlayerProfit;
      const gapYen = data.exchangeGapProfit;

      return (
        <div className="bg-slate-900/95 text-white p-3.5 rounded-lg shadow-xl border border-slate-700 text-xs max-w-sm backdrop-blur-xs">
          <div className="font-bold text-sm text-amber-400 border-b border-slate-700/80 pb-1.5 mb-2 flex items-center justify-between">
            <span>{data.label}</span>
            <span className="text-[11px] font-normal text-slate-400">{data.daysCount}日間営業</span>
          </div>

          <div className="space-y-1.5">
            {/* Model A vs Model B */}
            <div className="bg-slate-800/80 p-2 rounded border border-slate-700 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-slate-300 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  ① 差枚数モデル:
                </span>
                <span
                  className={`font-extrabold ${
                    diffYen >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {formatYen(diffYen)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-indigo-200 font-medium flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  ② G数(IN枚数)モデル:
                </span>
                <span
                  className={`font-extrabold ${
                    gYen >= 0 ? 'text-amber-400' : 'text-rose-400'
                  }`}
                >
                  {formatYen(gYen)}
                </span>
              </div>

              <div className="flex justify-between items-center border-t border-slate-700/60 pt-1 text-[11px]">
                <span className="text-slate-400">G数換金ギャップ寄与:</span>
                <span className="text-amber-300 font-bold">+{formatYen(gapYen)}</span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-300">客側平均差枚/日:</span>
              <span className={`font-semibold ${data.avgDiffCoins > 0 ? 'text-blue-400' : 'text-slate-200'}`}>
                {data.avgDiffCoins > 0 ? `+${data.avgDiffCoins}` : data.avgDiffCoins} 枚/台
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400">平均稼働 / 機械割:</span>
              <span className="font-medium text-slate-200">
                {formatNumber(data.avgGames)}G ({data.avgPayoutRate.toFixed(2)}%)
              </span>
            </div>

            <div className="flex justify-between items-center text-[11px] text-slate-400 border-t border-slate-800 pt-1">
              <span>旧イベント日平均:</span>
              <span className="text-amber-300 font-medium">
                {data.eventAvgDiff > 0 ? `+${data.eventAvgDiff}` : data.eventAvgDiff}枚/台 ({data.eventDaysCount}日)
              </span>
            </div>
          </div>

          <div className="mt-2.5 pt-1.5 border-t border-slate-800 text-[10px] text-amber-300/80 text-center">
            クリックで日別明細を表示
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs">
      {/* Chart Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-amber-500" />
            <span>
              {profitModel === 'comparison'
                ? '2大算出モデルの月別利益 見比べ推移'
                : profitModel === 'gCount'
                ? 'G数(IN枚数)連動モデル 月別利益推移'
                : '差枚数モデル 月別利益推移'}
            </span>
            <span className="text-xs font-normal text-slate-500">
              (単位: {unitLabel})
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {profitModel === 'comparison'
              ? '「青：差枚数のみの換算」と「橙：G数換金ギャップを算入した実務モデル」の差異を月毎に比較できます'
              : 'バーをクリックすると各月の日別出玉・優秀機種詳細がポップアップします'}
          </p>
        </div>

        {/* Chart View Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setChartType('bar')}
            className={`px-3 py-1 text-xs rounded-md font-medium transition-colors flex items-center gap-1 ${
              chartType === 'bar'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            単月棒グラフ
          </button>
          <button
            type="button"
            onClick={() => setChartType('cumulative')}
            className={`px-3 py-1 text-xs rounded-md font-medium transition-colors flex items-center gap-1 ${
              chartType === 'cumulative'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LineChartIcon className="w-3.5 h-3.5" />
            累計推移
          </button>
          <button
            type="button"
            onClick={() => setChartType('games')}
            className={`px-3 py-1 text-xs rounded-md font-medium transition-colors flex items-center gap-1 ${
              chartType === 'games'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            稼働G数推移
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="w-full h-80 sm:h-96">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'bar' ? (
            <BarChart
              data={chartData}
              margin={{ top: 15, right: 10, left: -10, bottom: 25 }}
              onClick={(e: any) => {
                if (e && e.activePayload && e.activePayload[0] && onSelectMonth) {
                  onSelectMonth(e.activePayload[0].payload.yearMonth);
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="shortLabel"
                tick={{ fontSize: 11, fill: '#64748b' }}
                interval={monthlyStats.length > 20 ? 1 : 0}
                angle={-45}
                textAnchor="end"
                height={45}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickFormatter={(val) => `${val}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1.5} />

              {profitModel === 'comparison' ? (
                <>
                  <Legend
                    verticalAlign="top"
                    height={36}
                    formatter={(value) => (
                      <span className="text-xs font-semibold text-slate-700">{value}</span>
                    )}
                  />
                  <Bar
                    dataKey="diffVal"
                    name="① 差枚数モデル粗利"
                    fill="#3b82f6"
                    radius={[3, 3, 0, 0]}
                    cursor="pointer"
                  />
                  <Bar
                    dataKey="gModelVal"
                    name="② G数(IN枚数)連動粗利"
                    fill="#f59e0b"
                    radius={[3, 3, 0, 0]}
                    cursor="pointer"
                  />
                </>
              ) : (
                <Bar
                  dataKey="currentVal"
                  name={
                    profitModel === 'gCount'
                      ? perspective === 'hall'
                        ? 'G数連動ホール粗利'
                        : 'G数連動ユーザー収支'
                      : perspective === 'hall'
                      ? 'ホール差枚粗利'
                      : 'ユーザー差枚収支'
                  }
                  radius={[3, 3, 0, 0]}
                  cursor="pointer"
                >
                  {chartData.map((entry, index) => {
                    const isPositive = entry.currentVal >= 0;
                    let color = '';
                    if (perspective === 'hall') {
                      color =
                        profitModel === 'gCount'
                          ? isPositive
                            ? '#6366f1' // Indigo for G-count model
                            : '#f43f5e'
                          : isPositive
                          ? '#10b981' // Emerald for diff model
                          : '#f43f5e';
                    } else {
                      color = isPositive ? '#3b82f6' : '#f43f5e';
                    }
                    return <Cell key={`cell-${index}`} fill={color} />;
                  })}
                </Bar>
              )}
            </BarChart>
          ) : chartType === 'cumulative' ? (
            <AreaChartComponent
              data={chartData}
              perspective={perspective}
              unitLabel={unitLabel}
              profitModel={profitModel}
              CustomTooltip={CustomTooltip}
              onSelectMonth={onSelectMonth}
            />
          ) : (
            <GamesChartComponent
              data={chartData}
              CustomTooltip={CustomTooltip}
              onSelectMonth={onSelectMonth}
            />
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Subcomponent for cumulative chart
const AreaChartComponent: React.FC<{
  data: any[];
  perspective: 'hall' | 'player';
  unitLabel: string;
  profitModel: ProfitModelType;
  CustomTooltip: any;
  onSelectMonth?: (ym: string) => void;
}> = ({ data, perspective, unitLabel, profitModel, CustomTooltip, onSelectMonth }) => {
  return (
    <ComposedChart
      data={data}
      margin={{ top: 15, right: 10, left: -10, bottom: 25 }}
      onClick={(e: any) => {
        if (e && e.activePayload && e.activePayload[0] && onSelectMonth) {
          onSelectMonth(e.activePayload[0].payload.yearMonth);
        }
      }}
    >
      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
      <XAxis
        dataKey="shortLabel"
        tick={{ fontSize: 11, fill: '#64748b' }}
        interval={data.length > 20 ? 1 : 0}
        angle={-45}
        textAnchor="end"
        height={45}
      />
      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
      <Tooltip content={<CustomTooltip />} />
      <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1.5} />

      {profitModel === 'comparison' ? (
        <>
          <Legend verticalAlign="top" height={36} />
          <Line
            type="monotone"
            dataKey="diffCumVal"
            name={`① 差枚数モデル累計 (${unitLabel})`}
            stroke="#3b82f6"
            strokeWidth={2.5}
            dot={{ r: 2 }}
          />
          <Line
            type="monotone"
            dataKey="gModelCumVal"
            name={`② G数モデル累計 (${unitLabel})`}
            stroke="#f59e0b"
            strokeWidth={3}
            dot={{ r: 3 }}
          />
        </>
      ) : (
        <Area
          type="monotone"
          dataKey="currentCumVal"
          stroke={profitModel === 'gCount' ? '#6366f1' : '#10b981'}
          fill={profitModel === 'gCount' ? '#6366f1' : '#10b981'}
          fillOpacity={0.15}
          strokeWidth={2.5}
          dot={{ r: 3 }}
          activeDot={{ r: 6 }}
          name={
            profitModel === 'gCount'
              ? `G数連動累計利益 (${unitLabel})`
              : `差枚換算累計利益 (${unitLabel})`
          }
        />
      )}
    </ComposedChart>
  );
};

// Subcomponent for games chart
const GamesChartComponent: React.FC<{
  data: any[];
  CustomTooltip: any;
  onSelectMonth?: (ym: string) => void;
}> = ({ data, CustomTooltip, onSelectMonth }) => {
  return (
    <ComposedChart
      data={data}
      margin={{ top: 15, right: 10, left: 10, bottom: 25 }}
      onClick={(e: any) => {
        if (e && e.activePayload && e.activePayload[0] && onSelectMonth) {
          onSelectMonth(e.activePayload[0].payload.yearMonth);
        }
      }}
    >
      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
      <XAxis
        dataKey="shortLabel"
        tick={{ fontSize: 11, fill: '#64748b' }}
        interval={data.length > 20 ? 1 : 0}
        angle={-45}
        textAnchor="end"
        height={45}
      />
      <YAxis
        yAxisId="left"
        tick={{ fontSize: 11, fill: '#64748b' }}
        domain={[0, 6000]}
        tickFormatter={(val) => `${val}G`}
      />
      <Tooltip content={<CustomTooltip />} />
      <Bar
        yAxisId="left"
        dataKey="avgGames"
        name="平均稼働G数"
        fill="#f59e0b"
        radius={[3, 3, 0, 0]}
        maxBarSize={30}
      />
      <Line
        yAxisId="left"
        type="monotone"
        dataKey="avgGames"
        name="稼働G数推移"
        stroke="#d97706"
        strokeWidth={2}
        dot={{ r: 2 }}
      />
    </ComposedChart>
  );
};
