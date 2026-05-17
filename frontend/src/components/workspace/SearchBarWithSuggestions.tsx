import { useCallback, useEffect, useRef, useState } from 'react';
import { Clock, Search, Sparkles } from 'lucide-react';
import { searchSuggest, type SearchSuggestion } from '../../services/aiService';
import { loadSearchHistory, type SearchHistoryEntry } from '../../utils/searchHistory';

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSearch: () => void;
  busy?: boolean;
  placeholder?: string;
};

export function SearchBarWithSuggestions({
  value,
  onChange,
  onSearch,
  busy,
  placeholder = 'Ask about encryption, integrity, security policies…',
}: Props) {
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [history, setHistory] = useState<SearchHistoryEntry[]>(loadSearchHistory);
  const wrapRef = useRef<HTMLDivElement>(null);

  const fetchSuggestions = useCallback(async (q: string) => {
    try {
      const res = await searchSuggest(q, 8);
      setSuggestions(res.suggestions);
    } catch {
      setSuggestions([]);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => void fetchSuggestions(value), 120);
    return () => window.clearTimeout(t);
  }, [value, open, fetchSuggestions]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  function pick(text: string) {
    onChange(text);
    setOpen(false);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setOpen(false);
    onSearch();
  }

  const historyFiltered = history.filter((h) =>
    value.trim() ? h.query.toLowerCase().includes(value.toLowerCase()) : true,
  );

  return (
    <div ref={wrapRef} className="relative z-30">
      <form onSubmit={onSubmit} className="search-orbital-bar">
        <Sparkles className="h-5 w-5 shrink-0 text-accent-purple-light" aria-hidden />
        <input
          type="search"
          className="min-w-0 flex-1 bg-transparent text-sm text-theme-primary outline-none placeholder:text-theme-muted"
          value={value}
          placeholder={placeholder}
          onFocus={() => {
            setOpen(true);
            setHistory(loadSearchHistory());
          }}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="off"
          aria-expanded={open}
          aria-controls="search-suggest-list"
        />
        <button
          type="submit"
          disabled={busy || !value.trim()}
          className="btn-search-glow shrink-0"
        >
          <Search className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">Semantic search</span>
        </button>
      </form>

      {open ? (
        <ul
          id="search-suggest-list"
          className="suggest-dropdown absolute left-0 right-0 top-[calc(100%+8px)] max-h-72 overflow-y-auto rounded-2xl border border-theme-line bg-theme-panel/98 p-2 shadow-glow backdrop-blur-xl"
          role="listbox"
        >
          {historyFiltered.length > 0 ? (
            <li className="px-2 py-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-theme-muted">Recent</p>
            </li>
          ) : null}
          {historyFiltered.slice(0, 4).map((h) => (
            <li key={h.at}>
              <button
                type="button"
                role="option"
                className="suggest-item w-full"
                onClick={() => pick(h.query)}
              >
                <Clock className="h-3.5 w-3.5 shrink-0 text-accent-orange/80" aria-hidden />
                <span className="truncate">{h.query}</span>
              </button>
            </li>
          ))}
          {suggestions.map((s, i) => (
            <li key={`${s.kind}-${i}`}>
              <button
                type="button"
                role="option"
                className="suggest-item w-full"
                onClick={() => pick(s.text)}
              >
                <Search className="h-3.5 w-3.5 shrink-0 text-accent-purple-light" aria-hidden />
                <span className="truncate">{s.text}</span>
                {s.kind === 'expansion' ? (
                  <span className="ml-auto shrink-0 rounded bg-accent-purple/15 px-1.5 py-0.5 text-[9px] text-accent-purple-light">
                    related
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
