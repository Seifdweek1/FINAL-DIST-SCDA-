import { useCallback, useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, Sun, Moon, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { ChatMessageBody } from '../components/ChatMessageBody';
import { DocumentSidebar } from '../components/workspace/DocumentSidebar';
import { SearchBarWithSuggestions } from '../components/workspace/SearchBarWithSuggestions';
import { SearchInsightsPanel } from '../components/workspace/SearchInsightsPanel';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { search, type SearchResponse } from '../services/aiService';
import {
  clearChatHistory,
  createChatSession,
  getChatHistory,
  sendChatMessage,
  type ChatMessageRow,
} from '../services/chatService';
import {
  deleteDocument,
  listDocuments,
  uploadDocument,
  type DocumentRow,
} from '../services/documentService';
import { pushSearchHistory } from '../utils/searchHistory';
import { formatError } from '../utils/errors';

export function KnowledgeWorkspacePage() {
  const { user } = useAuth();
  const { mode, toggle: toggleTheme } = useTheme();
  const { showToast } = useToast();

  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<DocumentRow | null>(null);

  const [searchQ, setSearchQ] = useState('');
  const [searchResult, setSearchResult] = useState<SearchResponse | null>(null);
  const [searchBusy, setSearchBusy] = useState(false);

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageRow[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [clearingHistory, setClearingHistory] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadDocs = useCallback(async () => {
    setDocsLoading(true);
    try {
      const res = await listDocuments();
      setDocuments(res.documents);
    } catch (e) {
      setErr(formatError(e));
    } finally {
      setDocsLoading(false);
    }
  }, []);

  const loadChatHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await getChatHistory();
      setSelectedSessionId(res.session?.id ?? null);
      setMessages(res.messages);
    } catch (e) {
      setErr(formatError(e));
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDocs();
    void loadChatHistory();
  }, [loadDocs, loadChatHistory]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatSending]);

  async function runSearch() {
    const q = searchQ.trim();
    if (!q) return;
    setSearchBusy(true);
    setErr(null);
    try {
      const res = await search(q, 10);
      setSearchResult(res);
      pushSearchHistory(q);
    } catch (e) {
      setErr(formatError(e));
    } finally {
      setSearchBusy(false);
    }
  }

  async function onUpload(file: File) {
    setErr(null);
    const { document } = await uploadDocument(file);
    showToast('Uploaded', `${document.original_filename} queued for indexing.`, 'success');
    await loadDocs();
    setSelectedDoc(document);
  }

  async function onDeleteDoc(doc: DocumentRow) {
    if (!window.confirm(`Delete ${doc.original_filename}?`)) return;
    try {
      await deleteDocument(doc.id);
      if (selectedDoc?.id === doc.id) setSelectedDoc(null);
      await loadDocs();
      showToast('Deleted', 'Document removed.', 'success');
    } catch (e) {
      setErr(formatError(e));
    }
  }

  async function ensureSession() {
    if (selectedSessionId) return selectedSessionId;
    const { session } = await createChatSession();
    setSelectedSessionId(session.id);
    return session.id;
  }

  async function onClearHistory() {
    if (
      !window.confirm(
        'Clear your entire chat history? This permanently removes all messages and cannot be undone.',
      )
    ) {
      return;
    }
    setClearingHistory(true);
    setErr(null);
    try {
      await clearChatHistory();
      setSelectedSessionId(null);
      setMessages([]);
      showToast('History cleared', 'Your conversation was removed. New messages start fresh.', 'success');
    } catch (e) {
      setErr(formatError(e));
    } finally {
      setClearingHistory(false);
    }
  }

  async function onSendChat(e: React.FormEvent) {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text || chatSending) return;
    setChatSending(true);
    setErr(null);
    setChatInput('');
    try {
      const sid = await ensureSession();
      let payload = text;
      if (selectedDoc && !text.toLowerCase().includes(selectedDoc.original_filename.toLowerCase())) {
        payload = `In ${selectedDoc.original_filename}, ${text}`;
      }
      const { user_message, assistant_message } = await sendChatMessage(sid, payload);
      setMessages((m) => [...m, user_message, assistant_message]);
      if (!selectedSessionId) setSelectedSessionId(sid);
    } catch (e) {
      setErr(formatError(e));
      setChatInput(text);
    } finally {
      setChatSending(false);
    }
  }

  return (
    <div className="-mx-4 -mt-2 flex min-h-[calc(100vh-5rem)] flex-col md:-mx-6 lg:min-h-[calc(100vh-4.5rem)]">
      <div className="workspace-hero flex shrink-0 flex-wrap items-center justify-between gap-3 px-4 py-4 md:px-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-accent-purple-light">
            Neural document desk
          </p>
          <h1 className="font-display text-xl font-extrabold text-theme-primary md:text-2xl">
            Semantic knowledge workspace
          </h1>
          <p className="mt-1 max-w-xl text-xs text-theme-muted">
            Upload · embed · search by meaning · chat with your files. Related concepts like cybersecurity
            surface when you search encryption.
          </p>
        </div>
        <button
          type="button"
          onClick={toggleTheme}
          className="rounded-xl border border-theme-line p-2.5 text-theme-muted transition hover:border-accent-purple/40 hover:text-accent-purple-light"
          aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {mode === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
      </div>

      {err ? (
        <Alert variant="error" title="Error" className="mx-4 mb-2 md:mx-6">
          {err}
        </Alert>
      ) : null}

      <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[minmax(240px,280px)_1fr_minmax(260px,320px)]">
        <div className="hidden min-h-[320px] xl:block xl:max-h-[calc(100vh-11rem)]">
          <DocumentSidebar
            documents={documents}
            loading={docsLoading}
            selectedId={selectedDoc?.id ?? null}
            onSelect={setSelectedDoc}
            onUpload={onUpload}
            onRefresh={() => void loadDocs()}
            onDelete={(d) => void onDeleteDoc(d)}
          />
        </div>

        <main className="flex min-h-0 flex-col border-theme-line xl:border-x">
          <div className="shrink-0 border-b border-theme-line px-4 py-4 md:px-6">
            <SearchBarWithSuggestions
              value={searchQ}
              onChange={setSearchQ}
              onSearch={() => void runSearch()}
              busy={searchBusy}
            />
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center justify-between gap-2 border-b border-theme-line px-4 py-2 md:px-6">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-accent-purple-light" aria-hidden />
                <span className="text-sm font-semibold text-theme-primary">Document chat</span>
                {selectedDoc ? (
                  <span className="truncate rounded-full bg-accent-orange/15 px-2 py-0.5 text-[11px] text-accent-orange">
                    {selectedDoc.original_filename}
                  </span>
                ) : null}
              </div>
              {messages.length > 0 ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="gap-1 px-2 py-1 text-xs text-theme-muted hover:text-red-400"
                  disabled={clearingHistory || historyLoading}
                  onClick={() => void onClearHistory()}
                >
                  {clearingHistory ? <Spinner size="sm" /> : <Trash2 className="h-3.5 w-3.5" />}
                  Clear history
                </Button>
              ) : null}
            </div>

            <div className="chat-shell min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6">
              {historyLoading ? (
                <div className="flex h-full items-center justify-center py-12">
                  <Spinner />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center py-12 text-center">
                  <p className="text-sm text-theme-muted">
                    Select a file on the left, search above, or ask a question below.
                  </p>
                  <p className="mt-2 text-xs text-theme-muted">
                    Signed in as {user?.email}. Your messages are saved to your account.
                  </p>
                </div>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={`mb-4 flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={m.role === 'user' ? 'chat-msg-user' : 'chat-msg-assistant'}>
                      <ChatMessageBody role={m.role} content={m.content} />
                    </div>
                  </div>
                ))
              )}
              {chatSending ? (
                <div className="flex justify-start py-2">
                  <Spinner size="sm" />
                </div>
              ) : null}
              <div ref={bottomRef} />
            </div>

            <form
              onSubmit={(e) => void onSendChat(e)}
              className="shrink-0 border-t border-theme-line bg-theme-panel/50 px-4 py-4 md:px-6"
            >
              <div className="flex gap-2">
                <textarea
                  className="chat-input min-h-[56px] flex-1"
                  placeholder={
                    selectedDoc
                      ? `Ask about ${selectedDoc.original_filename}…`
                      : 'Ask about your documents…'
                  }
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  disabled={chatSending}
                />
                <Button type="submit" disabled={chatSending || !chatInput.trim()} className="shrink-0 self-end">
                  {chatSending ? <Spinner size="sm" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </form>
          </div>
        </main>

        <div className="hidden min-h-[280px] xl:block xl:max-h-[calc(100vh-11rem)]">
          <SearchInsightsPanel result={searchResult} loading={searchBusy} />
        </div>
      </div>

      <div className="border-t border-theme-line p-4 xl:hidden">
        <p className="mb-2 text-xs font-semibold text-theme-muted">Your files</p>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {documents.map((doc) => (
            <button
              key={doc.id}
              type="button"
              onClick={() => setSelectedDoc(doc)}
              className={`shrink-0 rounded-xl border px-3 py-2 text-left text-xs ${
                selectedDoc?.id === doc.id
                  ? 'border-accent-orange bg-accent-orange/10'
                  : 'border-theme-line bg-theme-panel'
              }`}
            >
              <span className="block max-w-[140px] truncate font-medium">{doc.original_filename}</span>
              <span className="text-theme-muted">{doc.status}</span>
            </button>
          ))}
        </div>
        {searchResult ? (
          <div className="mt-4 rounded-xl border border-accent-purple/30 p-3">
            <p className="text-[10px] font-bold uppercase text-accent-purple-light">Short answer</p>
            <p className="mt-1 text-sm">{searchResult.answer}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
