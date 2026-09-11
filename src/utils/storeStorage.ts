import { StoreProfile } from '../data/types';
import { parseSlorepoHtml, parseRatesFromExchangeRate } from './htmlParser';
import { SAMPLE_PLAZA_515_HTML } from '../data/samplePlaza515Html';
import { parseSpecialDayRulesFromText } from './specialDayRules';

const STORAGE_KEY_STORES = 'SLOT_ANALYZER_HTML_STORES_V1';
const STORAGE_KEY_ACTIVE_ID = 'SLOT_ANALYZER_HTML_ACTIVE_ID_V1';

/**
 * Creates initial store from the user-provided sample HTML (Plaza 515)
 */
function getInitialSampleStore(): StoreProfile[] {
  const result = parseSlorepoHtml(SAMPLE_PLAZA_515_HTML);
  if (result.success && result.store) {
    result.store.id = 'plaza-515';
    return [result.store];
  }
  return [];
}

/**
 * Helper to normalize store rates and fill any blank machine counts from other days
 */
function normalizeStore(store: StoreProfile): StoreProfile {
  let rateLend = store.rateLend || 46;
  let rateExchange = store.rateExchange || 52;
  if (store.exchangeRate) {
    const parsedRates = parseRatesFromExchangeRate(store.exchangeRate);
    if (parsedRates.rateLend) rateLend = parsedRates.rateLend;
    if (parsedRates.rateExchange) rateExchange = parsedRates.rateExchange;
  }

  let specialDayRules = store.specialDayRules;
  if (
    !specialDayRules ||
    (!specialDayRules.tails &&
      !specialDayRules.fixedDates &&
      !specialDayRules.doubleDigits &&
      !specialDayRules.daysOfWeek)
  ) {
    specialDayRules = parseSpecialDayRulesFromText(store.oldEventDays || '');
  }

  if (store.dailyRecords && store.dailyRecords.length > 0) {
    const validWithMachines = store.dailyRecords.filter((r) => r.totalMachines && r.totalMachines > 0);
    let fallbackCount = store.totalMachinesApprox || 162;
    if (validWithMachines.length > 0) {
      const freq = new Map<number, number>();
      validWithMachines.forEach((r) => freq.set(r.totalMachines, (freq.get(r.totalMachines) || 0) + 1));
      let maxF = 0;
      freq.forEach((f, c) => {
        if (f > maxF) {
          maxF = f;
          fallbackCount = c;
        }
      });
    }

    const normalizedRecords = store.dailyRecords.map((r, idx) => {
      if (!r.totalMachines || r.totalMachines <= 0) {
        let nearestDist = Infinity;
        let nearestCount = fallbackCount;
        for (let i = 0; i < store.dailyRecords.length; i++) {
          const other = store.dailyRecords[i];
          if (other.totalMachines && other.totalMachines > 0) {
            const dist = Math.abs(i - idx);
            if (dist < nearestDist) {
              nearestDist = dist;
              nearestCount = other.totalMachines;
            }
          }
        }
        const machines = nearestCount;
        const totalDiff = (r.totalDiffCoins === 0 && r.avgDiffCoins !== 0)
          ? r.avgDiffCoins * machines
          : (r.totalDiffCoins || r.avgDiffCoins * machines);
        let winMachines = r.winMachines;
        if (winMachines === null && r.winRate !== null) {
          winMachines = Math.round(machines * (r.winRate / 100));
        }
        return {
          ...r,
          totalMachines: machines,
          winMachines,
          totalDiffCoins: totalDiff,
          hallCoinProfit: -totalDiff,
          playerCoinProfit: totalDiff,
          isReusedMachines: true,
        };
      }
      return r;
    });

    return {
      ...store,
      rateLend,
      rateExchange,
      specialDayRules,
      totalMachinesApprox: fallbackCount,
      dailyRecords: normalizedRecords,
    };
  }

  return {
    ...store,
    rateLend,
    rateExchange,
    specialDayRules,
  };
}

/**
 * Load all registered stores from LocalStorage.
 * Only stores imported from HTML files are retained.
 * Normalizes rateLend and rateExchange to match the store's exchangeRate,
 * and ensures blank machine counts on any day are backfilled from other days.
 */
export function getSavedStores(): StoreProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_STORES);
    if (raw !== null) {
      const parsed: StoreProfile[] = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const stores = parsed.map(normalizeStore);
        // Check if plaza-515 is missing 2026-01 ~ 2026-04 records from old cache
        const plazaIdx = stores.findIndex((s) => s.id === 'plaza-515');
        if (plazaIdx >= 0) {
          const has2026Early = stores[plazaIdx].dailyRecords?.some(
            (r) => r.yearMonth === '2026-01' || r.yearMonth === '2026-04'
          );
          if (!has2026Early) {
            const freshInitial = getInitialSampleStore();
            if (freshInitial.length > 0) {
              stores[plazaIdx] = normalizeStore(freshInitial[0]);
              saveStoresToStorage(stores);
            }
          }
        }
        return stores;
      }
    }

    // First time load: initialize with the attached user sample HTML (Plaza 515)
    const initial = getInitialSampleStore().map(normalizeStore);
    saveStoresToStorage(initial);
    if (initial.length > 0) {
      setActiveStoreId(initial[0].id);
    }
    return initial;
  } catch (err) {
    console.warn('Failed to load stores from localStorage', err);
    return [];
  }
}

/**
 * Save stores array to LocalStorage
 */
export function saveStoresToStorage(stores: StoreProfile[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_STORES, JSON.stringify(stores));
  } catch (err) {
    console.error('LocalStorage quota exceeded or save error', err);
  }
}

/**
 * Get active store ID
 */
export function getActiveStoreId(): string {
  try {
    const active = localStorage.getItem(STORAGE_KEY_ACTIVE_ID);
    if (active) return active;
  } catch (e) {
    // ignore
  }
  return '';
}

/**
 * Set active store ID
 */
export function setActiveStoreId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_ACTIVE_ID, id);
  } catch (e) {
    // ignore
  }
}

/**
 * Upsert a single store (e.g. from parsed HTML or edited parameters)
 */
export function upsertStore(store: StoreProfile): StoreProfile[] {
  const stores = getSavedStores();
  const index = stores.findIndex((s) => s.id === store.id);

  const { rateLend, rateExchange } = parseRatesFromExchangeRate(store.exchangeRate || '');

  const updatedStore: StoreProfile = {
    ...store,
    rateLend: rateLend || store.rateLend || 46,
    rateExchange: rateExchange || store.rateExchange || 52,
    updatedAt: new Date().toISOString(),
  };

  if (index >= 0) {
    stores[index] = updatedStore;
  } else {
    stores.push({
      ...updatedStore,
      createdAt: new Date().toISOString(),
    });
  }

  saveStoresToStorage(stores);
  return stores;
}

/**
 * Upsert multiple stores in batch
 */
export function upsertStores(newStores: StoreProfile[]): StoreProfile[] {
  let stores = getSavedStores();
  for (const store of newStores) {
    const index = stores.findIndex((s) => s.id === store.id);
    const { rateLend, rateExchange } = parseRatesFromExchangeRate(store.exchangeRate || '');
    const updatedStore: StoreProfile = {
      ...store,
      rateLend: rateLend || store.rateLend || 46,
      rateExchange: rateExchange || store.rateExchange || 52,
      updatedAt: new Date().toISOString(),
    };
    if (index >= 0) {
      stores[index] = updatedStore;
    } else {
      stores.push({
        ...updatedStore,
        createdAt: store.createdAt || new Date().toISOString(),
      });
    }
  }

  saveStoresToStorage(stores);
  return stores;
}

/**
 * Delete a store by ID
 */
export function deleteStore(id: string): { stores: StoreProfile[]; newActiveId: string } {
  let stores = getSavedStores();
  stores = stores.filter((s) => s.id !== id);
  saveStoresToStorage(stores);

  let activeId = getActiveStoreId();
  if (activeId === id || !stores.some((s) => s.id === activeId)) {
    activeId = stores.length > 0 ? stores[0].id : '';
    setActiveStoreId(activeId);
  }

  return { stores, newActiveId: activeId };
}

/**
 * 「初期状態にリセットで全店舗削除」
 * Clears ALL stores and resets the application to empty state
 */
export function resetAllStores(): StoreProfile[] {
  try {
    localStorage.setItem(STORAGE_KEY_STORES, JSON.stringify([]));
    localStorage.removeItem(STORAGE_KEY_ACTIVE_ID);
  } catch (e) {
    // ignore
  }
  return [];
}
