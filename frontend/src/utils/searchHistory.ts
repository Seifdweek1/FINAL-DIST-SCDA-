const KEY = 'scda_search_history';
const MAX = 24;

export type SearchHistoryEntry = {
  query: string;
  at: string;
};

export function loadSearchHistory(): SearchHistoryEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SearchHistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function pushSearchHistory(query: string): SearchHistoryEntry[] {
  const q = query.trim();
  if (!q) return loadSearchHistory();
  const prev = loadSearchHistory().filter((e) => e.query.toLowerCase() !== q.toLowerCase());
  const next = [{ query: q, at: new Date().toISOString() }, ...prev].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

export function clearSearchHistory(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
