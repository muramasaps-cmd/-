import React, { useState, useMemo } from 'react';
import { DailyRecord, MonthlyStat } from '../data/types';
import { ProfitModelType } from './Header';
import { formatYen, formatYenExact, formatCoins, formatCoinsExact, formatNumber } from '../utils/formatters';
import { analyzeSpecialDayPatterns } from '../utils/specialDayPatterns';
import {
  Table,
  ArrowUpDown,
  Download,
  Search,
  ExternalLink,
  SlidersHorizontal,
  FileSpreadsheet,
  Target
} from 'lucide-react';

interface MonthlyTableProps {
  monthlyStats: MonthlyStat[];
  dailyRecords?: DailyRecord[];
  perspective: 'hall' | 'player';
  unit: 'yen' | 'coins' | 'avgDiff';
  profitModel: ProfitModelType;
  specialDayRules?: any;
  oldEventDays?: string;
  onSelectMonth: (yearMonth: string) => void;
}

type SortField =
  | 'yearMonth'
  | 'daysCount'
  | 'hallYenProfit'
  | 'gModelHallProfit'
  | 'exchangeGapProfit'
  | 'estimatedRevenue'
  | 'avgDiffCoins'
  | 'avgPayoutRate'
  | 'avgGames'
  | 'avgWinRate';

export const MonthlyTable: React.FC<MonthlyTableProps> = ({
  monthlyStats,
  dailyRecords = [],
  perspective,
  unit,
  profitModel,
  specialDayRules,
  oldEventDays,
  onSelectMonth,
}) => {
  const [sortField, setSortField] = useState<SortField>('yearMonth');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = useState('');

  const { specialDayMap, specialDayRuleLabel } = useMemo(() => {
    if (!dailyRecords || dailyRecords.length === 0) {
      return { specialDayMap: new Map(), specialDayRuleLabel: '特日' };
    }
    const { monthPatterns, ruleDef } = analyzeSpecialDayPatterns(dailyRecords, specialDayRules, oldEventDays);
    const map = new Map();
    monthPatterns.forEach((mp) => {
      map.set(mp.yearMonth, mp);
    });
    return { specialDayMap: map, specialDayRuleLabel: ruleDef.targetDaysLabel || '特日' };
  }, [dailyRecords, specialDayRules, oldEventDays]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const filteredAndSorted = useMemo(() => {
    let result = monthlyStats.filter((m) =>
      m.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.yearMonth.includes(searchTerm)
    );

    result.sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];
      if (valA === null || valA === undefined) valA = 0;
      if (valB === null || valB === undefined) valB = 0;

      if (sortOrder === 'asc') {
        return valA > valB ? 1 : -1;
      } else {
        return valA < valB ? 1 : -1;
      }
    });

    return result;
  }, [monthlyStats, sortField, sortOrder, searchTerm]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      '対象月',
      '営業日数',
      '月内特日サイクルパターン',
      `特日内訳(${specialDayRuleLabel})`,
      '①差枚数モデル店側粗利(円)',
      '②G数モデル店側粗利(円)',
      'G数換金ギャップ寄与(円)',
      '推定売上高(円)',
      '出玉率/機械割(%)',
      '客側総差枚(枚)',
      '1台あたり平均差枚(枚)',
      '平均稼働ゲーム数(G)',
      '平均勝率(%)',
      '店黒字日数',
      '店赤字日数',
      '旧イベント日平均差枚(枚)',
      '旧イベント日数'
    ];

    const rows = filteredAndSorted.map((m) => {
      const sp = specialDayMap.get(m.yearMonth);
      const patternName = sp ? sp.classificationName : '';
      const breakdown = sp
        ? sp.events.map((e: any) => `${e.name}: ${e.status}(${e.avgDiffCoins > 0 ? `+${e.avgDiffCoins}` : e.avgDiffCoins}枚)`).join(' / ')
        : '';

      return [
        m.label,
        m.daysCount,
        patternName,
        `"${breakdown}"`,
        m.hallYenProfit,
        m.gModelHallProfit,
        m.exchangeGapProfit,
        m.estimatedRevenue,
        m.avgPayoutRate.toFixed(2),
        m.playerCoinProfit,
        m.avgDiffCoins,
        m.avgGames,
        m.avgWinRate ?? '',
        m.hallWinDays,
        m.playerWinDays,
        m.eventAvgDiff,
        m.eventDaysCount
      ];
    });

    const csvContent =
      '\uFEFF' + // UTF-8 BOM for Excel in Japanese
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `楽園蒲田店_利益月別推移_2大モデル比較_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* Table Controls Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            月別利益・差枚集計一覧表
            <span className="text-xs font-normal text-slate-500">
              ({filteredAndSorted.length}ヶ月分)
            </span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            行をクリックすると各月の日別スロットデータ明細・優秀機種を確認できます
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Search input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="年月で検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 w-36 sm:w-44"
            />
          </div>

          {/* CSV Export Button */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            CSV出力
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="bg-slate-50/80 text-slate-600 border-b border-slate-200 text-xs uppercase tracking-wider font-bold">
            <tr>
              <th
                onClick={() => handleSort('yearMonth')}
                className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  対象月
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-3 whitespace-nowrap">
                <div className="flex items-center gap-1 text-amber-700">
                  <Target className="w-3 h-3" />
                  月内特日サイクル (出す/回収)
                </div>
              </th>
              <th
                onClick={() => handleSort('daysCount')}
                className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors text-right whitespace-nowrap"
              >
                <div className="flex items-center justify-end gap-1">
                  日数
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              {/* Model A */}
              <th
                onClick={() => handleSort('hallYenProfit')}
                className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors text-right whitespace-nowrap text-blue-700"
              >
                <div className="flex items-center justify-end gap-1">
                  ① 差枚数モデル粗利
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              {/* Model B */}
              <th
                onClick={() => handleSort('gModelHallProfit')}
                className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors text-right whitespace-nowrap text-indigo-700"
              >
                <div className="flex items-center justify-end gap-1">
                  ② G数連動粗利
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              {/* Gap profit difference */}
              <th
                onClick={() => handleSort('exchangeGapProfit')}
                className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors text-right whitespace-nowrap text-amber-700"
              >
                <div className="flex items-center justify-end gap-1">
                  G数ギャップ寄与
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              <th
                onClick={() => handleSort('avgPayoutRate')}
                className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors text-right whitespace-nowrap"
              >
                <div className="flex items-center justify-end gap-1">
                  機械割(出玉率)
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              <th
                onClick={() => handleSort('avgDiffCoins')}
                className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors text-right whitespace-nowrap"
              >
                <div className="flex items-center justify-end gap-1">
                  客側台平均
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              <th
                onClick={() => handleSort('avgGames')}
                className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors text-right whitespace-nowrap"
              >
                <div className="flex items-center justify-end gap-1">
                  平均G数
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              <th
                onClick={() => handleSort('estimatedRevenue')}
                className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors text-right whitespace-nowrap text-slate-500"
              >
                <div className="flex items-center justify-end gap-1">
                  推定売上高
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              <th className="py-3 px-3 text-center whitespace-nowrap">
                黒字/赤字
              </th>
              <th className="py-3 px-3 text-right whitespace-nowrap">
                旧イベ日平均
              </th>
              <th className="py-3 px-3 text-center whitespace-nowrap">
                明細
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-sans">
            {filteredAndSorted.map((m) => {
              const diffYen = perspective === 'hall' ? m.hallYenProfit : m.playerYenProfit;
              const gYen = perspective === 'hall' ? m.gModelHallProfit : m.gModelPlayerProfit;

              return (
                <tr
                  key={m.yearMonth}
                  onClick={() => onSelectMonth(m.yearMonth)}
                  className="hover:bg-amber-50/40 cursor-pointer transition-colors group"
                >
                  <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className="group-hover:text-amber-600 transition-colors">{m.label}</span>
                      {m.month === 7 && (
                        <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-bold">
                          7月特日
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    {(() => {
                      const sp = specialDayMap.get(m.yearMonth);
                      if (!sp) return <span className="text-slate-300">-</span>;
                      return (
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[11px] px-1.5 py-0.5 rounded border font-semibold ${sp.badgeClass}`}
                          >
                            {sp.classification === 'all_win' && '🔥 '}
                            {sp.classification === 'd11_loss_d22_win' && '🎯 '}
                            {sp.classification === 'all_loss' && '⚠️ '}
                            {sp.classificationName}
                          </span>
                          <div className="flex items-center gap-0.5 text-[10px]">
                            {sp.zoroEvent && (
                              <span
                                className={`px-1 py-0.2 rounded font-bold ${
                                  sp.zoroEvent.isWin
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                                title={`ゾロ目(${sp.zoroEvent.day}日): ${sp.zoroEvent.avgDiffCoins > 0 ? `+${sp.zoroEvent.avgDiffCoins}` : sp.zoroEvent.avgDiffCoins}枚`}
                              >
                                ゾ{sp.zoroEvent.isWin ? '出' : '回'}
                              </span>
                            )}
                            {sp.d11Event && (
                              <span
                                className={`px-1 py-0.2 rounded font-bold ${
                                  sp.d11Event.isWin
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                                title={`11日: ${sp.d11Event.avgDiffCoins > 0 ? `+${sp.d11Event.avgDiffCoins}` : sp.d11Event.avgDiffCoins}枚`}
                              >
                                11{sp.d11Event.isWin ? '出' : '回'}
                              </span>
                            )}
                            {sp.d22Event && (
                              <span
                                className={`px-1 py-0.2 rounded font-bold ${
                                  sp.d22Event.isWin
                                    ? 'bg-amber-100 text-amber-900 font-extrabold'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                                title={`22日: ${sp.d22Event.avgDiffCoins > 0 ? `+${sp.d22Event.avgDiffCoins}` : sp.d22Event.avgDiffCoins}枚`}
                              >
                                22{sp.d22Event.isWin ? '出' : '回'}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-600 whitespace-nowrap">
                    {m.daysCount}日
                  </td>

                  {/* Model A Yen */}
                  <td
                    className={`py-3 px-3 text-right font-bold whitespace-nowrap ${
                      diffYen >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {formatYenExact(diffYen)}
                  </td>

                  {/* Model B Yen */}
                  <td
                    className={`py-3 px-3 text-right font-extrabold whitespace-nowrap ${
                      gYen >= 0 ? 'text-indigo-600' : 'text-rose-600'
                    }`}
                  >
                    {formatYenExact(gYen)}
                  </td>

                  {/* Gap profit */}
                  <td className="py-3 px-3 text-right font-bold text-amber-600 whitespace-nowrap">
                    +{formatYenExact(m.exchangeGapProfit)}
                  </td>

                  {/* Payout rate / Machine split */}
                  <td className="py-3 px-3 text-right font-semibold text-slate-700 whitespace-nowrap">
                    {m.avgPayoutRate.toFixed(2)}%
                  </td>

                  {/* Diff coins per machine */}
                  <td
                    className={`py-3 px-3 text-right font-semibold whitespace-nowrap ${
                      m.avgDiffCoins > 0 ? 'text-blue-600' : 'text-slate-700'
                    }`}
                  >
                    {m.avgDiffCoins > 0 ? `+${m.avgDiffCoins}` : m.avgDiffCoins}枚
                  </td>

                  <td className="py-3 px-3 text-right text-slate-600 whitespace-nowrap">
                    {formatNumber(m.avgGames)}G
                  </td>

                  <td className="py-3 px-3 text-right text-slate-500 whitespace-nowrap">
                    {formatYen(m.estimatedRevenue)}
                  </td>

                  <td className="py-3 px-3 text-center whitespace-nowrap text-xs">
                    <span className="text-emerald-600 font-semibold">{m.hallWinDays}勝</span>
                    <span className="text-slate-300 mx-1">/</span>
                    <span className="text-rose-600 font-semibold">{m.playerWinDays}敗</span>
                  </td>

                  <td className="py-3 px-3 text-right whitespace-nowrap">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        m.eventAvgDiff > 0
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {m.eventAvgDiff > 0 ? `+${m.eventAvgDiff}` : m.eventAvgDiff}枚 ({m.eventDaysCount}日)
                    </span>
                  </td>

                  <td className="py-3 px-3 text-center whitespace-nowrap">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectMonth(m.yearMonth);
                      }}
                      className="p-1 text-slate-400 group-hover:text-amber-600 transition-colors"
                      title="日別明細を表示"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
