import React from 'react';
import { ProfitModelType } from './Header';
import { formatYen, formatCoins, formatNumber } from '../utils/formatters';
import { Calculator, ArrowRight, Zap, Info, Sliders, CheckCircle2 } from 'lucide-react';

interface ModelComparisonBannerProps {
  profitModel: ProfitModelType;
  setProfitModel: (m: ProfitModelType) => void;
  perspective: 'hall' | 'player';
  totalDiffProfit: number;
  totalGModelProfit: number;
  totalGapProfit: number;
  totalRevenue: number;
  avgPayoutRate: number;
  cashRatio: number;
  setCashRatio: (r: number) => void;
}

export const ModelComparisonBanner: React.FC<ModelComparisonBannerProps> = ({
  profitModel,
  setProfitModel,
  perspective,
  totalDiffProfit,
  totalGModelProfit,
  totalGapProfit,
  totalRevenue,
  avgPayoutRate,
  cashRatio,
  setCashRatio,
}) => {
  const modelDifference = totalGModelProfit - totalDiffProfit;

  return (
    <div className="bg-white rounded-xl border border-indigo-200/80 shadow-xs overflow-hidden">
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-indigo-500 text-white text-[11px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
              <Calculator className="w-3 h-3" />
              利益算出モデル比較
            </span>
            <span className="text-indigo-200 text-xs font-medium">
              差枚数ベース vs G数(IN枚数・換金ギャップ)ベース
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold mt-1 text-white flex items-center gap-2">
            G数（IN枚数）を用いたホール利益の算出メカニズム
          </h2>
          <p className="text-xs text-indigo-200/90 mt-1 max-w-3xl">
            差枚数だけの計算では見えない「<strong>G数稼働に伴う現金投資と換金ギャップ（46枚貸21.74円 / 52枚交換19.23円＝1枚あたり2.51円の粗利）</strong>」を算入することで、実際のホール経営に近い収支構造を可視化します。
          </p>
        </div>

        {/* Cash ratio control */}
        <div className="bg-white/10 backdrop-blur-xs p-3 rounded-lg border border-white/15 flex flex-col gap-1.5 self-start md:self-auto min-w-[220px]">
          <div className="flex items-center justify-between text-xs text-indigo-100">
            <span className="flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              現金投資比率:
            </span>
            <span className="font-extrabold text-amber-300 text-sm">{cashRatio}%</span>
          </div>
          <input
            type="range"
            min="20"
            max="50"
            step="1"
            value={cashRatio}
            onChange={(e) => setCashRatio(Number(e.target.value))}
            className="w-full accent-amber-400 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-indigo-200/80">
            <span>20% (高持ち玉)</span>
            <span className="text-amber-300">業界標準 35%</span>
            <span>50% (低持ち玉)</span>
          </div>
        </div>
      </div>

      {/* Comparison Grid */}
      <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/60">
        {/* Model A */}
        <div
          onClick={() => setProfitModel('diff')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            profitModel === 'diff'
              ? 'bg-white border-blue-500 ring-2 ring-blue-500/20 shadow-sm'
              : 'bg-white/80 border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">① 差枚数モデル (従来)</span>
            {profitModel === 'diff' && (
              <span className="text-blue-600 font-bold text-xs flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> 選択中
              </span>
            )}
          </div>
          <div className="text-lg font-bold text-slate-900 mt-1">出玉差枚換算</div>
          <div className="text-xs text-slate-500 mt-1">
            差枚数 $\times$ 換金レート（黒字21.74円 / 赤字19.23円）
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100">
            <div className="text-xs text-slate-500">期間累計利益 ({perspective === 'hall' ? 'ホール' : '客側'})</div>
            <div
              className={`text-xl font-extrabold mt-0.5 ${
                totalDiffProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {formatYen(totalDiffProfit)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              ※G数・回転数による手数料収入は含みません
            </div>
          </div>
        </div>

        {/* Model B */}
        <div
          onClick={() => setProfitModel('gCount')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            profitModel === 'gCount'
              ? 'bg-white border-indigo-600 ring-2 ring-indigo-600/20 shadow-sm'
              : 'bg-white/80 border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-600">② G数(IN枚数)モデル (実務標準)</span>
            {profitModel === 'gCount' && (
              <span className="text-indigo-600 font-bold text-xs flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> 選択中
              </span>
            )}
          </div>
          <div className="text-lg font-bold text-slate-900 mt-1">稼働・換金ギャップ連動</div>
          <div className="text-xs text-slate-500 mt-1">
            $IN枚数 \times 現金比率 \times ギャップ(2.51円) - 差枚収支$
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100">
            <div className="text-xs text-slate-500">期間累計利益 ({perspective === 'hall' ? 'ホール' : '客側'})</div>
            <div
              className={`text-xl font-extrabold mt-0.5 ${
                totalGModelProfit >= 0 ? 'text-indigo-600' : 'text-rose-600'
              }`}
            >
              {formatYen(totalGModelProfit)}
            </div>
            <div className="text-[11px] text-indigo-600/90 font-medium mt-1">
              推定総売上: 約{formatYen(totalRevenue)} (出玉率 {avgPayoutRate.toFixed(2)}%)
            </div>
          </div>
        </div>

        {/* The Difference & Insight */}
        <div
          onClick={() => setProfitModel('comparison')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            profitModel === 'comparison'
              ? 'bg-amber-50/50 border-amber-500 ring-2 ring-amber-500/20 shadow-sm'
              : 'bg-white/80 border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700">📊 2大モデル見比べ</span>
            {profitModel === 'comparison' && (
              <span className="text-amber-700 font-bold text-xs flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> 比較表示中
              </span>
            )}
          </div>
          <div className="text-lg font-bold text-slate-900 mt-1">G数換金ギャップ寄与分</div>
          <div className="text-xs text-slate-500 mt-1">
            高稼働により店舗に落ちる手数料粗利
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100">
            <div className="text-xs text-slate-500">モデル間の粗利差額（上乗せ分）</div>
            <div className="text-xl font-extrabold text-amber-600 mt-0.5">
              +{formatYen(totalGapProfit)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              ※クリックでグラフ・表を並列見比べ表示
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
