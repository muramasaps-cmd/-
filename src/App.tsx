import React, { useState, useMemo, useEffect, useRef } from 'react';
import { StoreProfile, MonthlyStat, DailyRecord } from './data/types';
import { Header, ProfitModelType } from './components/Header';
import { KpiCards } from './components/KpiCards';
import { ModelComparisonBanner } from './components/ModelComparisonBanner';
import { ProfitChart } from './components/ProfitChart';
import { EventComparison } from './components/EventComparison';
import { SpecialDayPatterns } from './components/SpecialDayPatterns';
import { MonthlyTable } from './components/MonthlyTable';
import { DailyModal } from './components/DailyModal';
import { StoreManagerModal } from './components/StoreManagerModal';
import { ConfirmModal } from './components/ConfirmModal';
import { processStoreData } from './utils/dataEngine';
import { parseSlorepoHtml, parseRatesFromExchangeRate } from './utils/htmlParser';
import { parseSpecialDayRulesFromText } from './utils/specialDayRules';
import { SAMPLE_PLAZA_515_HTML } from './data/samplePlaza515Html';
import {
  getSavedStores,
  getActiveStoreId,
  setActiveStoreId,
  upsertStore,
  upsertStores,
  deleteStore,
  resetAllStores,
} from './utils/storeStorage';
import {
  parseMultipleSlorepoHtml,
  readFilesAsText,
} from './utils/multiHtmlParser';
import {
  SlidersHorizontal,
  RotateCcw,
  Layers,
  HelpCircle,
  Building2,
  Plus,
  UploadCloud,
  FileCode,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Check,
  Loader2,
} from 'lucide-react';

export default function App() {
  const [stores, setStores] = useState<StoreProfile[]>(() => getSavedStores());
  const [activeStoreIdState, setActiveStoreIdState] = useState<string>(() => getActiveStoreId());
  const [isStoreModalOpen, setIsStoreModalOpen] = useState<boolean>(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState<boolean>(false);

  // Active store object
  const currentStore = useMemo(() => {
    if (stores.length === 0) return null;
    const found = stores.find((s) => s.id === activeStoreIdState);
    return found || stores[0];
  }, [stores, activeStoreIdState]);

  const [perspective, setPerspective] = useState<'hall' | 'player'>('hall');
  const [unit, setUnit] = useState<'yen' | 'coins' | 'avgDiff'>('yen');
  const [profitModel, setProfitModel] = useState<ProfitModelType>('comparison');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedMonthModal, setSelectedMonthModal] = useState<string | null>(null);

  // Custom rate and model parameters (initialized from active store's header exchange rate)
  const [rateLend, setRateLend] = useState<number>(() => {
    const parsed = parseRatesFromExchangeRate(currentStore?.exchangeRate || '');
    return parsed.rateLend || currentStore?.rateLend || 46;
  });
  const [rateExchange, setRateExchange] = useState<number>(() => {
    const parsed = parseRatesFromExchangeRate(currentStore?.exchangeRate || '');
    return parsed.rateExchange || currentStore?.rateExchange || 52;
  });
  const [cashRatio, setCashRatio] = useState<number>(currentStore?.cashRatio || 35);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // Drag-and-drop state on empty screen
  const [emptyScreenDragging, setEmptyScreenDragging] = useState<boolean>(false);
  const [emptyIsLoading, setEmptyIsLoading] = useState<boolean>(false);
  const [emptyInputMode, setEmptyInputMode] = useState<'file' | 'paste'>('file');
  const [emptyPastedHtml, setEmptyPastedHtml] = useState<string>('');
  const [emptyError, setEmptyError] = useState<string>('');
  const emptyFileInputRef = useRef<HTMLInputElement>(null);

  // Automatically sync lend and exchange coin rates to match header exchange rate whenever active store changes
  useEffect(() => {
    if (currentStore) {
      const { rateLend: parsedLend, rateExchange: parsedExch } = parseRatesFromExchangeRate(
        currentStore.exchangeRate || ''
      );
      setRateLend(parsedLend || currentStore.rateLend || 46);
      setRateExchange(parsedExch || currentStore.rateExchange || 52);
      setCashRatio(currentStore.cashRatio || 35);
      setSelectedYear('all');
    }
  }, [currentStore?.id, currentStore?.exchangeRate]);

  // Recalculate daily records and monthly stats with both Model A and Model B via dataEngine
  const processedData = useMemo(() => {
    if (!currentStore) {
      return { dailyRecords: [], monthlyStats: [] };
    }
    const records = currentStore.dailyRecords || [];
    return processStoreData(records, rateLend, rateExchange, cashRatio, currentStore.specialDayRules);
  }, [currentStore?.dailyRecords, currentStore?.specialDayRules, rateLend, rateExchange, cashRatio]);

  // Available years from active store's data
  const years = useMemo(() => {
    const set = new Set<string>();
    processedData.monthlyStats.forEach((m) => set.add(String(m.year)));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [processedData.monthlyStats]);

  // Filter by selected year
  const filteredMonthlyStats = useMemo(() => {
    if (selectedYear === 'all') return processedData.monthlyStats;
    return processedData.monthlyStats.filter((m) => String(m.year) === selectedYear);
  }, [processedData.monthlyStats, selectedYear]);

  const filteredDailyRecords = useMemo(() => {
    if (selectedYear === 'all') return processedData.dailyRecords;
    return processedData.dailyRecords.filter((d) => String(d.year) === selectedYear);
  }, [processedData.dailyRecords, selectedYear]);

  // Totals for comparison banner
  const totalDiffProfit = useMemo(() => {
    return filteredMonthlyStats.reduce(
      (acc, m) => acc + (perspective === 'hall' ? m.hallYenProfit : m.playerYenProfit),
      0
    );
  }, [filteredMonthlyStats, perspective]);

  const totalGModelProfit = useMemo(() => {
    return filteredMonthlyStats.reduce(
      (acc, m) => acc + (perspective === 'hall' ? m.gModelHallProfit : m.gModelPlayerProfit),
      0
    );
  }, [filteredMonthlyStats, perspective]);

  const totalGapProfit = useMemo(() => {
    return filteredMonthlyStats.reduce((acc, m) => acc + m.exchangeGapProfit, 0);
  }, [filteredMonthlyStats]);

  const totalRevenue = useMemo(() => {
    return filteredMonthlyStats.reduce((acc, m) => acc + m.estimatedRevenue, 0);
  }, [filteredMonthlyStats]);

  const avgPayoutRate = useMemo(() => {
    const totIn = filteredMonthlyStats.reduce((acc, m) => acc + m.totalInCoins, 0);
    const totOut = filteredMonthlyStats.reduce((acc, m) => acc + m.totalOutCoins, 0);
    return totIn > 0 ? (totOut / totIn) * 100 : 100;
  }, [filteredMonthlyStats]);

  // Store management actions
  const handleSelectStore = (id: string) => {
    const targetStore = stores.find((s) => s.id === id);
    if (targetStore) {
      const { rateLend: parsedLend, rateExchange: parsedExch } = parseRatesFromExchangeRate(
        targetStore.exchangeRate || ''
      );
      setRateLend(parsedLend || targetStore.rateLend || 46);
      setRateExchange(parsedExch || targetStore.rateExchange || 52);
      setCashRatio(targetStore.cashRatio || 35);
      setSelectedYear('all');
    }
    setActiveStoreIdState(id);
    setActiveStoreId(id);
  };

  const handleSaveStores = (newStoresList: StoreProfile[], preferActiveId?: string) => {
    if (newStoresList.length === 0) return;
    const normalizedStores: StoreProfile[] = newStoresList.map((store) => {
      const { rateLend: parsedLend, rateExchange: parsedExch } = parseRatesFromExchangeRate(
        store.exchangeRate || ''
      );
      return {
        ...store,
        rateLend: parsedLend || store.rateLend || 46,
        rateExchange: parsedExch || store.rateExchange || 52,
      };
    });
    const updated = upsertStores(normalizedStores);
    setStores(updated);
    const targetId = preferActiveId || normalizedStores[0].id;
    setActiveStoreIdState(targetId);
    setActiveStoreId(targetId);
    const targetStore = normalizedStores.find((s) => s.id === targetId) || normalizedStores[0];
    setRateLend(targetStore.rateLend);
    setRateExchange(targetStore.rateExchange);
    setCashRatio(targetStore.cashRatio || 35);
    setSelectedYear('all');
  };

  const handleSaveStore = (newStore: StoreProfile) => {
    handleSaveStores([newStore], newStore.id);
  };

  const handleDeleteStore = (id: string) => {
    const { stores: remaining, newActiveId } = deleteStore(id);
    setStores(remaining);
    setActiveStoreIdState(newActiveId);
  };

  const handleChangeOldEventDays = (newRuleText: string) => {
    if (!currentStore) return;
    const newRules = parseSpecialDayRulesFromText(newRuleText);
    const updatedStore: StoreProfile = {
      ...currentStore,
      oldEventDays: newRuleText,
      specialDayRules: newRules,
    };
    const updatedList = upsertStore(updatedStore);
    setStores(updatedList);
  };

  // 「初期状態にリセットで全店舗削除」
  const handleResetAllStores = () => {
    const reset = resetAllStores();
    setStores(reset);
    setActiveStoreIdState('');
    setIsStoreModalOpen(false);
    setSelectedMonthModal(null);
    setShowSettings(false);
  };

  // Quick process multiple HTML files directly on empty screen
  const handleDirectMultipleHtmlImport = async (files: FileList | File[]) => {
    setEmptyError('');
    if (!files || files.length === 0) return;
    setEmptyIsLoading(true);

    try {
      const readResults = await readFilesAsText(files);
      if (readResults.length === 0) {
        setEmptyError('選択されたファイルからテキストを読み込めませんでした。');
        setEmptyIsLoading(false);
        return;
      }

      const res = parseMultipleSlorepoHtml(readResults, stores);
      if (!res.success || res.stores.length === 0) {
        const errs = res.errors.map((e) => `${e.fileName}: ${e.error}`).join(' / ');
        setEmptyError(errs || '有効なスロレポHTMLが見つかりませんでした。');
        setEmptyIsLoading(false);
        return;
      }

      const storeProfiles = res.stores.map((g) => g.store);
      handleSaveStores(storeProfiles, storeProfiles[0].id);
    } catch (err: any) {
      setEmptyError(`ファイル処理エラー: ${err?.message || err}`);
    } finally {
      setEmptyIsLoading(false);
    }
  };

  // Quick process HTML text directly on empty screen (paste or sample button)
  const handleDirectHtmlImport = (html: string) => {
    setEmptyError('');
    if (!html.trim()) {
      setEmptyError('HTMLデータが空です。');
      return;
    }
    const res = parseMultipleSlorepoHtml([{ name: 'direct.html', content: html }], stores);
    if (!res.success || res.stores.length === 0) {
      setEmptyError(res.errors.map((e) => e.error).join(' ') || '解析に失敗しました。');
      return;
    }
    const storeProfiles = res.stores.map((g) => g.store);
    handleSaveStores(storeProfiles, storeProfiles[0].id);
  };

  // Empty state view when no stores exist
  if (!currentStore || stores.length === 0) {
    return (
      <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col antialiased">
        {/* Simple Header */}
        <header className="bg-slate-900 text-white border-b border-slate-800 shadow-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-6 h-6 text-amber-400" />
              <h1 className="text-xl font-bold tracking-tight text-white">
                スロレポ出玉・利益推移分析システム
              </h1>
            </div>
            <span className="text-xs text-slate-400">
              HTMLファイル取込による店舗登録
            </span>
          </div>
        </header>

        {/* Main Empty State Content */}
        <main className="max-w-3xl w-full mx-auto px-4 py-12 flex-1 flex flex-col items-center justify-center space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-amber-500/10 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-300 shadow-xs">
              <UploadCloud className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">
              スロレポのHTMLファイルを取り込んで店舗登録
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
              保存したスロレポ店舗ページのHTMLファイルを取り込むと、店舗名・住所・換金率・特日・全日別出玉データが自動解析され、即座に分析を開始できます。
            </p>
          </div>

          {/* Quick Actions Card */}
          <div className="w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setEmptyInputMode('file')}
                  className={`px-3 py-1.5 font-bold rounded-lg transition-all cursor-pointer ${
                    emptyInputMode === 'file'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  HTMLファイルを選択 / ドロップ
                </button>
                <button
                  type="button"
                  onClick={() => setEmptyInputMode('paste')}
                  className={`px-3 py-1.5 font-bold rounded-lg transition-all cursor-pointer ${
                    emptyInputMode === 'paste'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  HTMLコード直接貼り付け
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleDirectHtmlImport(SAMPLE_PLAZA_515_HTML)}
                className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                添付サンプル「プラザ５１５」を取り込む
              </button>
            </div>

            {/* Drag & Drop File Zone */}
            {emptyInputMode === 'file' && (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setEmptyScreenDragging(true);
                }}
                onDragLeave={() => setEmptyScreenDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setEmptyScreenDragging(false);
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    handleDirectMultipleHtmlImport(e.dataTransfer.files);
                  }
                }}
                onClick={() => !emptyIsLoading && emptyFileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                  emptyScreenDragging
                    ? 'border-amber-500 bg-amber-50/50 scale-[0.99]'
                    : 'border-slate-300 bg-slate-50/50 hover:bg-slate-50 hover:border-amber-400'
                } ${emptyIsLoading ? 'opacity-70 cursor-wait' : ''}`}
              >
                <input
                  type="file"
                  ref={emptyFileInputRef}
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleDirectMultipleHtmlImport(e.target.files);
                    }
                  }}
                  multiple
                  accept=".html,.htm,text/html"
                  className="hidden"
                />
                <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shadow-2xs">
                  {emptyIsLoading ? (
                    <Loader2 className="w-7 h-7 animate-spin" />
                  ) : (
                    <UploadCloud className="w-7 h-7" />
                  )}
                </div>
                <div>
                  {emptyIsLoading ? (
                    <p className="text-sm font-bold text-amber-700 animate-pulse">
                      ファイルを解析中... しばらくお待ちください
                    </p>
                  ) : (
                    <>
                      <p className="text-sm font-bold text-slate-800">
                        ここにスロレポ店舗HTMLファイルをドラッグ＆ドロップ（複数ファイル一括対応）
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        またはクリックしてパソコンからファイルを選択（ShiftやCtrlキーで複数選択可能）
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Paste Mode */}
            {emptyInputMode === 'paste' && (
              <div className="space-y-3">
                <textarea
                  rows={8}
                  value={emptyPastedHtml}
                  onChange={(e) => setEmptyPastedHtml(e.target.value)}
                  placeholder="<!DOCTYPE html>... <html>... または <table>... を貼り付けてください"
                  className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="button"
                  onClick={() => handleDirectHtmlImport(emptyPastedHtml)}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  HTMLコードを解析して店舗登録
                </button>
              </div>
            )}

            {emptyError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{emptyError}</span>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // Dashboard view when a store is active
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col antialiased">
      {/* Header */}
      <Header
        storeInfo={{
          name: currentStore.name,
          address: currentStore.address,
          oldEventDays: currentStore.oldEventDays,
          exchangeRate: currentStore.exchangeRate,
          dataRange: currentStore.dataRange,
          rateLend: rateLend,
          rateExchange: rateExchange,
          totalMachinesApprox: currentStore.totalMachinesApprox,
        }}
        perspective={perspective}
        setPerspective={setPerspective}
        unit={unit}
        setUnit={setUnit}
        profitModel={profitModel}
        setProfitModel={setProfitModel}
        selectedYear={selectedYear}
        setSelectedYear={setSelectedYear}
        years={years}
        totalDays={filteredDailyRecords.length}
        totalMonths={filteredMonthlyStats.length}
        onOpenStoreManager={() => setIsStoreModalOpen(true)}
        onChangeOldEventDays={handleChangeOldEventDays}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 flex-1">
        {/* Top Controls Bar with Store Switcher & HTML Import button */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
          {/* Store Switcher Quick Dropdown & Period */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 px-2.5 py-1 rounded-lg">
              <Building2 className="w-4 h-4 text-amber-500" />
              <span className="text-xs text-slate-500 font-medium">分析店舗:</span>
              <select
                value={activeStoreIdState}
                onChange={(e) => handleSelectStore(e.target.value)}
                className="text-xs font-bold text-slate-900 bg-transparent focus:outline-hidden cursor-pointer"
              >
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.totalMachinesApprox}台)
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => setIsStoreModalOpen(true)}
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              HTML取込 / 他店舗追加
            </button>

            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                集計対象:{' '}
                <span className="text-amber-700 font-bold">
                  {selectedYear === 'all' ? '全期間' : `${selectedYear}年`}
                </span>
                <span className="text-slate-400 mx-1">/</span>
                {filteredMonthlyStats.length}ヶ月 ({filteredDailyRecords.length}営業日)
              </span>
            </div>
          </div>

          {/* Rate & Parameter Toggle Button & Reset Button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                showSettings || rateLend !== currentStore.rateLend || rateExchange !== currentStore.rateExchange
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>
                換金率・条件調整 ({rateLend}枚貸/{rateExchange}枚交換・比率{cashRatio}%)
              </span>
            </button>

            <button
              type="button"
              onClick={() => setIsResetConfirmOpen(true)}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              title="初期状態にリセット（全店舗削除）"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">リセット (全店舗削除)</span>
            </button>
          </div>
        </div>

        {/* Optional Rate Settings Drawer */}
        {showSettings && (
          <div className="bg-white p-4 rounded-xl border border-amber-300 shadow-sm animate-in fade-in duration-150">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <SlidersHorizontal className="w-4 h-4 text-amber-500" />
                  換金率およびG数モデルパラメーター調整 ({currentStore.name})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  貸出・交換レートや現金投資比率を変更すると、全日・全月分の粗利および推計売上がリアルタイムで再計算されます
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs">
                  <label className="text-slate-600 font-medium">貸出枚数/千円:</label>
                  <select
                    value={rateLend}
                    onChange={(e) => setRateLend(Number(e.target.value))}
                    className="bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs font-semibold"
                  >
                    <option value={46}>46枚貸 (21.74円/枚)</option>
                    <option value={47}>47枚貸 (21.28円/枚)</option>
                    <option value={48}>48枚貸 (20.83円/枚)</option>
                    <option value={50}>50枚貸 (20.00円/枚)</option>
                    {![46, 47, 48, 50].includes(rateLend) && (
                      <option value={rateLend}>{rateLend}枚貸 ({(1000 / rateLend).toFixed(2)}円/枚)</option>
                    )}
                  </select>
                </div>

                <div className="flex items-center gap-1.5 text-xs">
                  <label className="text-slate-600 font-medium">交換枚数/千円:</label>
                  <select
                    value={rateExchange}
                    onChange={(e) => setRateExchange(Number(e.target.value))}
                    className="bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs font-semibold"
                  >
                    <option value={50}>50枚等価 (20.00円/枚)</option>
                    <option value={51.5}>51.5枚 (19.42円/枚)</option>
                    <option value={52}>52枚交換 (19.23円/枚)</option>
                    <option value={53}>53枚交換 (18.87円/枚)</option>
                    <option value={55}>55枚交換 (18.18円/枚)</option>
                    <option value={56}>56枚交換 (17.86円/枚)</option>
                    <option value={60}>60枚交換 (16.67円/枚)</option>
                    {![50, 51.5, 52, 53, 55, 56, 60].includes(rateExchange) && (
                      <option value={rateExchange}>{rateExchange}枚交換 ({(1000 / rateExchange).toFixed(2)}円/枚)</option>
                    )}
                  </select>
                </div>

                <div className="flex items-center gap-1.5 text-xs">
                  <label className="text-slate-600 font-medium">現金投資比率:</label>
                  <select
                    value={cashRatio}
                    onChange={(e) => setCashRatio(Number(e.target.value))}
                    className="bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs font-semibold"
                  >
                    <option value={25}>25% (超高持ち玉)</option>
                    <option value={30}>30% (高持ち玉比率)</option>
                    <option value={35}>35% (業界標準・標準店)</option>
                    <option value={40}>40% (低持ち玉・高稼働)</option>
                    <option value={45}>45% (激戦区・夜間客多)</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const { rateLend: parsedLend, rateExchange: parsedExch } = parseRatesFromExchangeRate(
                      currentStore.exchangeRate || ''
                    );
                    setRateLend(parsedLend || currentStore.rateLend || 46);
                    setRateExchange(parsedExch || currentStore.rateExchange || 52);
                    setCashRatio(currentStore.cashRatio || 35);
                  }}
                  className="p-1.5 text-slate-500 hover:text-slate-800 rounded bg-slate-100 cursor-pointer"
                  title="ヘッダの換金率（店舗デフォルト）に戻す"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Model Comparison Banner */}
        <ModelComparisonBanner
          profitModel={profitModel}
          setProfitModel={setProfitModel}
          perspective={perspective}
          totalDiffProfit={totalDiffProfit}
          totalGModelProfit={totalGModelProfit}
          totalGapProfit={totalGapProfit}
          totalRevenue={totalRevenue}
          avgPayoutRate={avgPayoutRate}
          cashRatio={cashRatio}
          setCashRatio={setCashRatio}
        />

        {/* KPI Cards */}
        <KpiCards
          monthlyStats={filteredMonthlyStats}
          perspective={perspective}
          unit={unit}
          profitModel={profitModel}
        />

        {/* Monthly Profit Chart */}
        <ProfitChart
          monthlyStats={filteredMonthlyStats}
          perspective={perspective}
          unit={unit}
          profitModel={profitModel}
          onSelectMonth={(ym) => setSelectedMonthModal(ym)}
        />

        {/* Event Days vs Normal Days & Day of Week Analysis */}
        <EventComparison
          dailyRecords={filteredDailyRecords}
          perspective={perspective}
          unit={unit}
          oldEventDays={currentStore.oldEventDays}
        />

        {/* Special Day Patterns (出す・回収するサイクル分析) */}
        <SpecialDayPatterns
          dailyRecords={filteredDailyRecords}
          perspective={perspective}
          unit={unit}
          specialDayRules={currentStore.specialDayRules}
          oldEventDays={currentStore.oldEventDays}
          onSelectMonth={(ym) => setSelectedMonthModal(ym)}
        />

        {/* Detailed Monthly Table */}
        <MonthlyTable
          monthlyStats={filteredMonthlyStats}
          dailyRecords={filteredDailyRecords}
          perspective={perspective}
          unit={unit}
          profitModel={profitModel}
          specialDayRules={currentStore.specialDayRules}
          oldEventDays={currentStore.oldEventDays}
          onSelectMonth={(ym) => setSelectedMonthModal(ym)}
        />

        {/* Footnote / Explanation */}
        <div className="p-4 bg-white rounded-xl border border-slate-200/80 text-xs text-slate-500 space-y-1.5">
          <div className="font-bold text-slate-700 flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-amber-500" />
            2大利益算出モデルの計算式と構造の違いについて
          </div>
          <ul className="list-disc list-inside space-y-1 text-slate-600 pl-1">
            <li>
              <strong>① 差枚数モデル (シンプル出玉換金):</strong> スロットの差枚数（客側勝ち=+差枚、客側負け=-差枚）に対し、店の黒字日（-差枚）は貸出基準（1枚約{((1000/rateLend)).toFixed(2)}円）、店の赤字日（+差枚）は交換基準（1枚約{((1000/rateExchange)).toFixed(2)}円）で換算。G数に関わらず「差枚が0なら利益0」とする計算です。
            </li>
            <li>
              <strong>② G数(IN枚数)モデル (実務・ホールコンモデル):</strong> IN枚数（平均G数 × 3枚 × 台数）から現金投資売上を推計し、換金ギャップ（{rateLend}枚貸 / {rateExchange}枚交換＝1枚あたり約{((1000/rateLend) - (1000/rateExchange)).toFixed(2)}円の手数料）を算入した実務利益です。高稼働な日ほど多額の手数料利益が確定するため、出玉を還元（差枚赤字）しても店舗経営が成立する理由がこのモデルで説明できます。
            </li>
            <li>
              <strong>店舗特日ルール ({currentStore.name}):</strong> {currentStore.oldEventDays || '未設定'}
            </li>
          </ul>
        </div>
      </main>

      {/* Daily Records Modal */}
      {selectedMonthModal && (
        <DailyModal
          yearMonth={selectedMonthModal}
          monthlyStats={processedData.monthlyStats}
          dailyRecords={processedData.dailyRecords}
          perspective={perspective}
          unit={unit}
          profitModel={profitModel}
          onClose={() => setSelectedMonthModal(null)}
        />
      )}

      {/* Store Manager & Data Import Modal */}
      <StoreManagerModal
        isOpen={isStoreModalOpen}
        onClose={() => setIsStoreModalOpen(false)}
        stores={stores}
        activeStoreId={activeStoreIdState}
        onSelectStore={handleSelectStore}
        onSaveStore={handleSaveStore}
        onSaveStores={handleSaveStores}
        onDeleteStore={handleDeleteStore}
        onResetAllStores={handleResetAllStores}
      />

      {/* Confirm Reset All Stores Modal */}
      <ConfirmModal
        isOpen={isResetConfirmOpen}
        title="すべての店舗データを初期化・削除しますか？"
        message="登録されているすべての店舗データ（全営業日・集計データ）を完全に削除し、初期状態（店舗登録・インポート画面）に戻します。この操作は取り消せません。"
        confirmText="全データを削除してリセット"
        cancelText="キャンセル"
        isDestructive={true}
        onConfirm={() => {
          handleResetAllStores();
          setIsResetConfirmOpen(false);
        }}
        onCancel={() => setIsResetConfirmOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div>
            {currentStore.name} 利益推移分析システム（スロレポHTMLインポート対応）
          </div>
          <div className="text-slate-400">
            登録店舗数: {stores.length}店舗 / 現在表示: {filteredDailyRecords.length}日分
          </div>
        </div>
      </footer>
    </div>
  );
}
