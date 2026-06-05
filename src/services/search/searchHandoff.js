import { criteriaFromSearchParams, normaliseHolidaySearchCriteria } from './holidaySearchCriteria.js';

export const heroSearchHandoffSource = 'hero-search';
export const searchHandoffStoragePrefix = 'pickyholiday:search-handoff:';
export const searchHandoffMaxAgeMs = 5 * 60 * 1000;

const getSessionStorage = () => {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch (error) {
    void error;
    return null;
  }
};

const removeStoredHandoff = (storage, storageKey) => {
  try {
    storage.removeItem(storageKey);
  } catch (error) {
    void error;
  }
};

export function createSearchHandoffId(prefix = 'hero') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function searchHandoffStorageKey(handoffId) {
  return `${searchHandoffStoragePrefix}${handoffId}`;
}

export function storeSearchHandoff({ criteria, response, source = heroSearchHandoffSource }, storage = getSessionStorage()) {
  if (!storage || !response) return '';

  const handoffId = createSearchHandoffId();
  try {
    storage.setItem(searchHandoffStorageKey(handoffId), JSON.stringify({
      createdAt: Date.now(),
      criteria: normaliseHolidaySearchCriteria(criteria),
      response,
      source,
    }));
    return handoffId;
  } catch (error) {
    void error;
    return '';
  }
}

export function readSearchHandoff(search = '', storage = getSessionStorage(), now = Date.now()) {
  const params = search instanceof URLSearchParams ? search : new URLSearchParams(search || '');
  const handoffId = params.get('handoff');
  if (!handoffId || !storage) return null;

  const storageKey = searchHandoffStorageKey(handoffId);

  try {
    const rawHandoff = storage.getItem(storageKey);
    if (!rawHandoff) return null;
    const handoff = JSON.parse(rawHandoff);
    const createdAt = Number(handoff?.createdAt || 0);
    const isFresh = createdAt > 0 && now - createdAt <= searchHandoffMaxAgeMs;
    if (!isFresh || handoff?.source !== heroSearchHandoffSource || !handoff?.response) return null;

    return {
      criteria: normaliseHolidaySearchCriteria(handoff.criteria || criteriaFromSearchParams(params)),
      response: handoff.response,
    };
  } catch (error) {
    void error;
    return null;
  } finally {
    removeStoredHandoff(storage, storageKey);
  }
}
