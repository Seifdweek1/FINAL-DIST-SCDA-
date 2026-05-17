import { useState, type FormEvent } from 'react';
import { Bot, Braces, ChevronDown, ChevronRight, Search } from 'lucide-react';
import { analyze, search, type SearchResponse } from '../services/aiService';
import { formatError } from '../utils/errors';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { CopyButton } from '../components/CopyButton';

export function AiAssistantPage() {
  const [text, setText] = useState('');
  const [metaJson, setMetaJson] = useState('{\n  "source": "demo"\n}');
  const [analyzeOut, setAnalyzeOut] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState('');
  const [searchResult, setSearchResult] = useState<SearchResponse | null>(null);
  const [showTechnical, setShowTechnical] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const technicalJson = searchResult ? JSON.stringify(searchResult, null, 2) : '';

  async function onAnalyze(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setAnalyzeOut(null);
    let metadata: Record<string, unknown> | undefined;
    if (metaJson.trim()) {
      try {
        metadata = JSON.parse(metaJson) as Record<string, unknown>;
      } catch {
        setErr('Metadata must be valid JSON.');
        return;
      }
    }
    const payload: { text?: string; metadata?: Record<string, unknown> } = {};
    if (text.trim()) payload.text = text.trim();
    if (metadata && Object.keys(metadata).length) payload.metadata = metadata;
    if (!payload.text && !payload.metadata) {
      setErr('Provide text and/or metadata JSON with at least one key.');
      return;
    }
    setBusy(true);
    try {
      const r = await analyze(payload);
      setAnalyzeOut(
        `Stored point ${r.point_id} in collection “${r.collection}” (${r.embedding_model}, dim ${r.dimensions}).`,
      );
    } catch (e) {
      setErr(formatError(e));
    } finally {
      setBusy(false);
    }
  }

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setSearchResult(null);
    setShowTechnical(false);
    if (!searchQ.trim()) {
      setErr('Enter a search query.');
      return;
    }
    setBusy(true);
    try {
      const r = await search(searchQ.trim(), 8);
      setSearchResult(r);
    } catch (e) {
      setErr(formatError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8 page-section">
      <div className="cyber-panel px-5 py-6 md:px-8">
        <p className="soc-label relative z-20 text-neon-purple/80">Vector intelligence · Qdrant</p>
        <h2 className="relative z-20 mt-2 font-display text-lg font-bold text-white">AI assistant</h2>
        <p className="relative z-20 mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
          Semantic search returns a <strong className="text-slate-200">short answer</strong> first. Full vector hits stay
          in a collapsible technical section for proof and debugging.
        </p>
      </div>

      {err ? (
        <Alert variant="error" title="Request error">
          {err}
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
        <Card className="border-neon-cyan/15 p-6 ring-1 ring-neon-cyan/10">
          <div className="flex items-center gap-2 border-b border-neon-cyan/10 pb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan">
              <Bot className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <h2 className="font-display text-base font-semibold text-white">Analyze (embed + upsert)</h2>
              <p className="text-xs text-slate-500">Push structured signals into the vector index</p>
            </div>
          </div>
          <form className="mt-5 space-y-4" onSubmit={onAnalyze}>
            <div>
              <label className="text-sm font-medium text-slate-300">Document text (optional)</label>
              <textarea
                className="input-field mt-1.5 min-h-[140px] resize-y"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste policy text or notes…"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <Braces className="h-4 w-4 text-neon-purple/90" aria-hidden />
                Metadata JSON (optional)
              </label>
              <div className="mt-1.5 overflow-hidden rounded-xl border border-neon-cyan/20 bg-black/50 shadow-inner shadow-black/50 ring-1 ring-neon-purple/10">
                <div className="flex items-center justify-between border-b border-neon-cyan/10 bg-soc-panel/90 px-3 py-2">
                  <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-neon-cyan/60">
                    payload.json
                  </span>
                </div>
                <textarea
                  className="min-h-[120px] w-full resize-y border-0 bg-transparent px-3 py-3 font-mono text-xs leading-relaxed text-neon-cyan/85 outline-none focus:ring-0"
                  value={metaJson}
                  onChange={(e) => setMetaJson(e.target.value)}
                  spellCheck={false}
                />
              </div>
            </div>
            <Button type="submit" disabled={busy} className="px-5">
              Run analyze
            </Button>
            {analyzeOut ? (
              <Alert variant="success" title="Analyze complete">
                {analyzeOut}
              </Alert>
            ) : null}
          </form>
        </Card>

        <Card className="border-neon-purple/15 p-6 ring-1 ring-neon-purple/10">
          <div className="flex items-center gap-2 border-b border-neon-purple/10 pb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-neon-purple/35 bg-neon-purple/10 text-violet-200">
              <Search className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <h2 className="font-display text-base font-semibold text-white">Semantic search</h2>
              <p className="text-xs text-slate-500">Natural language query over your indexed content</p>
            </div>
          </div>
          <form className="mt-5 space-y-4" onSubmit={onSearch}>
            <div>
              <label className="text-sm font-medium text-slate-300">Query</label>
              <input
                className="input-field"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="e.g. How are files encrypted?"
              />
            </div>
            <Button type="submit" variant="outline" disabled={busy} className="px-5">
              Search
            </Button>

            {searchResult ? (
              <div className="space-y-4">
                <Card className="border-accent-purple/35 bg-gradient-to-br from-accent-purple/15 to-soc-panel/80 p-5 shadow-glow-cyan">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="soc-label text-accent-purple-light">Short answer</p>
                      <p className="mt-0.5 text-xs text-slate-500">Query: {searchResult.query}</p>
                    </div>
                    {searchResult.answer ? (
                      <CopyButton text={searchResult.answer} label="Copy answer" />
                    ) : null}
                  </div>
                  <p className="mt-4 text-base leading-relaxed text-white">{searchResult.answer}</p>
                </Card>

                <div className="rounded-xl border border-white/10 bg-soc-deep/60">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-semibold text-slate-200 hover:bg-white/5"
                    onClick={() => setShowTechnical((v) => !v)}
                    aria-expanded={showTechnical}
                  >
                    <span className="inline-flex items-center gap-2">
                      {showTechnical ? (
                        <ChevronDown className="h-4 w-4 text-accent-purple-light" aria-hidden />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-accent-purple-light" aria-hidden />
                      )}
                      View technical search results
                    </span>
                    <span className="font-mono text-[10px] text-slate-500">
                      {searchResult.results.length} hit{searchResult.results.length === 1 ? '' : 's'}
                    </span>
                  </button>
                  {showTechnical ? (
                    <div className="border-t border-white/10 px-4 pb-4 pt-3">
                      <div className="mb-2 flex justify-end">
                        <CopyButton text={technicalJson} label="Copy JSON" />
                      </div>
                      <pre className="max-h-96 overflow-auto rounded-xl border border-neon-green/25 bg-black/60 p-4 font-mono text-xs leading-relaxed text-neon-green/90 shadow-inner shadow-black/60">
                        {technicalJson}
                      </pre>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : !busy ? (
              <p className="text-center text-xs text-slate-600 sm:text-left">
                Run a search to see a short answer and optional technical JSON.
              </p>
            ) : null}
          </form>
        </Card>
      </div>
    </div>
  );
}
