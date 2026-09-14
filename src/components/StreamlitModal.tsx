import React, { useState } from 'react';
import {
  X,
  Terminal,
  Download,
  Copy,
  Check,
  ExternalLink,
  Code2,
  FileCode,
  Sparkles,
  Play,
  CheckCircle2,
} from 'lucide-react';
import { StoreProfile, DailyRecord } from '../data/types';

interface StreamlitModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStore: StoreProfile | null;
  dailyRecords: DailyRecord[];
}

export const StreamlitModal: React.FC<StreamlitModalProps> = ({
  isOpen,
  onClose,
  currentStore,
  dailyRecords,
}) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleDownloadFile = (filename: string, content: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadCurrentStoreCsv = () => {
    if (!dailyRecords || dailyRecords.length === 0) return;

    const headers = [
      'date',
      'dayOfWeek',
      'isOldEventDay',
      'avgDiffCoins',
      'avgGames',
      'winRate',
      'winMachines',
      'totalMachines',
      'totalDiffCoins',
      'hallCoinProfit',
      'hallYenProfit',
      'playerYenProfit',
      'inCoins',
      'payoutRate',
      'estimatedRevenue',
      'exchangeGapProfit',
      'gModelHallProfit',
      'gModelPlayerProfit',
    ];

    const rows = dailyRecords.map((r) => [
      r.date,
      r.dayOfWeek,
      r.isOldEventDay ? 1 : 0,
      r.avgDiffCoins,
      r.avgGames,
      r.winRate ?? '',
      r.winMachines ?? '',
      r.totalMachines,
      r.totalDiffCoins,
      r.hallCoinProfit,
      r.hallYenProfit,
      r.playerYenProfit,
      r.inCoins,
      r.payoutRate,
      r.estimatedRevenue,
      r.exchangeGapProfit,
      r.gModelHallProfit,
      r.gModelPlayerProfit,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((v) => `"${v}"`).join(',')),
    ].join('\n');

    const filename = `${currentStore?.name || 'store'}_records.csv`;
    handleDownloadFile(filename, csvContent, 'text/csv;charset=utf-8;');
  };

  const downloadRequirements = () => {
    const content = `streamlit>=1.30.0\npandas>=2.0.0\nplotly>=5.18.0\nbeautifulsoup4>=4.12.0\n`;
    handleDownloadFile('requirements.txt', content, 'text/plain;charset=utf-8;');
  };

  const downloadStreamlitAppPy = async () => {
    try {
      const res = await fetch('/streamlit_app.py');
      if (res.ok) {
        const text = await res.text();
        handleDownloadFile('streamlit_app.py', text, 'text/x-python;charset=utf-8;');
        return;
      }
    } catch {
      // fallback
    }
    // Simple alert or fallback
    window.open('/streamlit_app.py', '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-700 via-rose-600 to-amber-600 text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
              <Code2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                Streamlit (Python) で実行・分析
                <span className="text-xs bg-white/25 px-2 py-0.5 rounded-full font-medium">
                  v1.0 Ready
                </span>
              </h2>
              <p className="text-xs text-rose-100 mt-0.5">
                ローカルPCやStreamlit Community Cloudで完全に動作するPythonアプリを用意しました
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[calc(85vh-80px)] overflow-y-auto">
          {/* Summary Box */}
          <div className="bg-rose-50/70 border border-rose-200/80 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm text-slate-700 space-y-1">
                <p className="font-bold text-slate-900">
                  リポジトリ直下に <code className="text-rose-700 font-mono font-bold">streamlit_app.py</code> を生成済みです！
                </p>
                <p className="text-slate-600 leading-relaxed">
                  Web版と同じ高精度なG数・換金ギャップ粗利計算（Model B）や特日・曜日・末尾分析、Plotlyによる対話型グラフ、CSVエクスポート機能をPython環境上で直接利用できます。
                </p>
              </div>
            </div>
          </div>

          {/* Quick Download Buttons */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-2.5 flex items-center gap-2">
              <Download className="w-4 h-4 text-rose-600" />
              ワンクリック・ファイルダウンロード
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={downloadStreamlitAppPy}
                className="flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer group"
              >
                <FileCode className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                <span>streamlit_app.py</span>
                <Download className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={downloadRequirements}
                className="flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                <Terminal className="w-4 h-4 text-slate-600" />
                <span>requirements.txt</span>
                <Download className="w-3.5 h-3.5 text-slate-500" />
              </button>

              <button
                type="button"
                onClick={downloadCurrentStoreCsv}
                className="flex items-center justify-center gap-2 px-3 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>現在店舗のCSV</span>
                <Download className="w-3.5 h-3.5 text-emerald-600" />
              </button>
            </div>
          </div>

          {/* Step 1: Install */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-rose-600 text-white text-[11px] flex items-center justify-center font-bold">
                  1
                </span>
                必要ライブラリのインストール
              </span>
              <button
                type="button"
                onClick={() =>
                  handleCopy('pip install streamlit pandas plotly beautifulsoup4', 1)
                }
                className="text-xs text-rose-700 hover:text-rose-800 font-semibold flex items-center gap-1 cursor-pointer bg-white px-2 py-0.5 rounded border border-slate-200"
              >
                {copiedIndex === 1 ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" /> コピー完了
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> コマンドをコピー
                  </>
                )}
              </button>
            </div>
            <pre className="bg-slate-900 text-slate-100 text-xs font-mono p-3 rounded-lg overflow-x-auto selection:bg-rose-500">
              pip install streamlit pandas plotly beautifulsoup4
            </pre>
          </div>

          {/* Step 2: Run */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-rose-600 text-white text-[11px] flex items-center justify-center font-bold">
                  2
                </span>
                Streamlit アプリの起動
              </span>
              <button
                type="button"
                onClick={() => handleCopy('streamlit run streamlit_app.py', 2)}
                className="text-xs text-rose-700 hover:text-rose-800 font-semibold flex items-center gap-1 cursor-pointer bg-white px-2 py-0.5 rounded border border-slate-200"
              >
                {copiedIndex === 2 ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" /> コピー完了
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> コマンドをコピー
                  </>
                )}
              </button>
            </div>
            <pre className="bg-slate-900 text-slate-100 text-xs font-mono p-3 rounded-lg overflow-x-auto selection:bg-rose-500">
              streamlit run streamlit_app.py
            </pre>
            <p className="text-[11px] text-slate-500 mt-1.5">
              実行すると、ブラウザが自動的に開き <code className="text-slate-700 font-mono">http://localhost:8501</code> にアクセスされます。
            </p>
          </div>

          {/* Cloud Deploy Guide */}
          <div className="border border-slate-200 rounded-xl p-4 bg-white">
            <h4 className="text-xs font-bold text-slate-900 mb-1.5 flex items-center gap-1.5">
              <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
              Streamlit Community Cloud で常時公開（無料）
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              GitHub にリポジトリをプッシュ後、
              <a
                href="https://share.streamlit.io"
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 underline font-semibold mx-1"
              >
                share.streamlit.io
              </a>
              で <code className="text-slate-800 font-mono">streamlit_app.py</code> を指定するだけで、どこからでもアクセスできるWebアプリとして無料公開可能です。
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            詳細はプロジェクト内の <code className="text-slate-700 font-mono">README_STREAMLIT.md</code> をご覧ください
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
