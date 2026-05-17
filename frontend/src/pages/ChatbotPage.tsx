import { useCallback, useEffect, useRef, useState } from 'react';
import ProgressBar from 'react-bootstrap/ProgressBar';
import Badge from 'react-bootstrap/Badge';
import { Cpu, FileText, MessageCircle, Send, Shield, Trash2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { CyberModal } from '../components/CyberModal';
import { ChatMessageBody } from '../components/ChatMessageBody';
import {
  clearChatHistory,
  createChatSession,
  deleteChatSession,
  getChatHistory,
  getChatMessages,
  listChatSessions,
  listChatSessionsAdmin,
  sendChatMessage,
  type ChatMessageRow,
  type ChatSessionRow,
} from '../services/chatService';
import { formatError } from '../utils/errors';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { Spinner } from '../components/ui/Spinner';

const HINTS = [
  {
    label: 'Uploaded documents',
    text: 'List your workspace files',
    prompt: 'What documents do I have uploaded?',
  },
  {
    label: 'Scoped to file',
    text: 'Summarize a specific upload',
    prompt: 'In report.pdf, summarize the document',
  },
  {
    label: 'Active file',
    text: 'See which document is selected',
    prompt: 'Which file are we using?',
  },
  {
    label: 'Clear file',
    text: 'Remove document scope from chat',
    prompt: 'Clear selected document',
  },
] as const;

export function ChatbotPage() {
  const { user, isAdmin } = useAuth();
  const { showToast } = useToast();
  const [sessions, setSessions] = useState<ChatSessionRow[]>([]);
  const [adminMode, setAdminMode] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageRow[]>([]);
  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionOwnerId, setSessionOwnerId] = useState<string | null>(null);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [selectedDocFilename, setSelectedDocFilename] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const sendLockRef = useRef(false);

  const loadSessions = useCallback(async () => {
    setLoadingSessions(true);
    setErr(null);
    try {
      const res = adminMode && isAdmin ? await listChatSessionsAdmin() : await listChatSessions();
      setSessions(res.sessions);
      if (!adminMode) {
        const hist = await getChatHistory();
        if (hist.session) {
          setSelectedId(hist.session.id);
          setSessionTitle(hist.session.title);
          setSessionOwnerId(hist.session.user_id);
          setSelectedDocId(hist.session.selected_document_id ?? null);
          setSelectedDocFilename(hist.session.selected_document_filename ?? null);
          setMessages(hist.messages);
        }
      }
    } catch (e) {
      setErr(formatError(e));
    } finally {
      setLoadingSessions(false);
    }
  }, [adminMode, isAdmin]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const loadMessages = useCallback(async (id: string) => {
    setLoadingMessages(true);
    setErr(null);
    try {
      const res = await getChatMessages(id);
      setSessionTitle(res.session.title);
      setSessionOwnerId(res.session.user_id);
      setSelectedDocId(res.session.selected_document_id ?? null);
      setSelectedDocFilename(res.session.selected_document_filename ?? null);
      setMessages(res.messages);
      setSelectedId(id);
    } catch (e) {
      setErr(formatError(e));
      setSelectedId(null);
      setMessages([]);
      setSessionOwnerId(null);
      setSessionTitle('');
      setSelectedDocId(null);
      setSelectedDocFilename(null);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  async function onClearAllHistory() {
    if (
      !window.confirm(
        'Clear your entire chat history? This permanently removes all messages and cannot be undone.',
      )
    ) {
      return;
    }
    setErr(null);
    try {
      await clearChatHistory();
      setSelectedId(null);
      setMessages([]);
      setSessionTitle('');
      setSessionOwnerId(null);
      setSelectedDocId(null);
      setSelectedDocFilename(null);
      await loadSessions();
      showToast('History cleared', 'Your conversation was removed.', 'success');
    } catch (e) {
      setErr(formatError(e));
    }
  }

  async function confirmDeleteSession() {
    if (!deleteTarget) return;
    setDeleting(true);
    setErr(null);
    try {
      await deleteChatSession(deleteTarget);
      if (selectedId === deleteTarget) {
        setSelectedId(null);
        setMessages([]);
        setSessionTitle('');
        setSessionOwnerId(null);
        setSelectedDocId(null);
        setSelectedDocFilename(null);
      }
      await loadSessions();
      showToast('Session deleted', 'Conversation removed from archive.', 'success');
      setDeleteTarget(null);
    } catch (e) {
      setErr(formatError(e));
    } finally {
      setDeleting(false);
    }
  }

  const canPost = Boolean(selectedId && user?.id && sessionOwnerId && sessionOwnerId === user.id);

  async function clearSelectedDocument() {
    if (!selectedId || !canPost) return;
    setSending(true);
    setErr(null);
    try {
      const { user_message, assistant_message } = await sendChatMessage(
        selectedId,
        'Clear selected document',
      );
      setMessages((m) => [...m, user_message, assistant_message]);
      setSelectedDocId(null);
      setSelectedDocFilename(null);
      showToast('Document cleared', 'General chat mode — mention a file to scope again.', 'info');
    } catch (e) {
      setErr(formatError(e));
    } finally {
      setSending(false);
    }
  }

  function applyHint(prompt: string) {
    if (!selectedId) {
      showToast('Select a session', 'Create or open a chat first, then use quick prompts.', 'info');
      return;
    }
    if (!canPost) {
      showToast('Read-only', 'Open your own session to send messages.', 'warning');
      return;
    }
    setInput(prompt);
    showToast('Prompt loaded', 'Edit or press Transmit to send.', 'success');
  }

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || sending || sendLockRef.current) return;
    let sessionId = selectedId;
    if (!sessionId && !adminMode) {
      try {
        const { session } = await createChatSession();
        sessionId = session.id;
        setSelectedId(session.id);
        setSessionTitle(session.title);
        setSessionOwnerId(session.user_id);
      } catch (err) {
        setErr(formatError(err));
        return;
      }
    }
    if (!sessionId) {
      showToast('Select a session', 'Open a chat from the archive first.', 'info');
      return;
    }
    if (!user?.id || sessionOwnerId !== user.id) {
      showToast('Read-only', 'Open your own session to send messages.', 'warning');
      return;
    }
    sendLockRef.current = true;
    setSending(true);
    setErr(null);
    const text = input.trim();
    setInput('');
    try {
      const { user_message, assistant_message } = await sendChatMessage(sessionId, text);
      setMessages((m) => [...m, user_message, assistant_message]);
      const meta = assistant_message.metadata as Record<string, unknown> | null;
      if (meta?.selected_document_id !== undefined) {
        setSelectedDocId((meta.selected_document_id as string) || null);
        setSelectedDocFilename((meta.selected_document_filename as string) || null);
      }
      await loadSessions();
      if (sessionTitle === 'New chat') {
        const short = text.length > 80 ? `${text.slice(0, 79)}…` : text;
        setSessionTitle(short);
      }
    } catch (e) {
      setErr(formatError(e));
      setInput(text);
      if (selectedId) {
        try {
          await loadMessages(selectedId);
        } catch {
          /* ignore reload failure */
        }
      }
    } finally {
      setSending(false);
      sendLockRef.current = false;
    }
  }

  return (
    <div className="space-y-6 page-section">
      <div className="cyber-panel px-5 py-6 md:px-8">
        <div className="relative z-20 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="soc-label flex items-center gap-2 text-neon-cyan/80">
              <Cpu className="h-3.5 w-3.5" aria-hidden />
              Neural inquiry channel
            </p>
            <h2 className="mt-2 font-display text-xl font-bold tracking-tight text-white md:text-2xl">
              Secure document chatbot
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
              PostgreSQL-backed sessions. After upload, the worker extracts text, chunks, and indexes vectors in{' '}
              <span className="text-neon-cyan/90">Qdrant</span>. Mention a filename to scope answers to that document;
              follow-ups keep the same file until you clear it.
            </p>
          </div>
          <div className="hidden shrink-0 rounded-lg border border-neon-purple/25 bg-black/30 px-3 py-2 font-mono text-[10px] text-neon-purple/90 shadow-glow-purple sm:block">
            <div className="text-slate-500">CHANNEL</div>
            <div className="text-neon-cyan">/api/ai/chat/*</div>
          </div>
        </div>
      </div>

      {err ? (
        <Alert variant="error" title="Channel error" className="relative pr-12">
          <p>{err}</p>
          <p className="mt-2 text-xs text-slate-400">
            If this persists after rebuild, run: <code className="text-neon-cyan">docker compose logs ai-service --tail=30</code>
          </p>
          <button
            type="button"
            className="absolute right-3 top-3 rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"
            aria-label="Dismiss error"
            onClick={() => setErr(null)}
          >
            <X className="h-4 w-4" />
          </button>
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,300px)_1fr] lg:gap-8">
        <Card className="relative flex flex-col overflow-hidden p-0 lg:max-h-[min(82vh,760px)]">
          <div className="flex items-center justify-between gap-2 border-b border-neon-cyan/15 bg-gradient-to-r from-neon-cyan/5 to-transparent px-4 py-3">
            <div>
              <p className="soc-label text-neon-cyan/65">Archive</p>
              <div className="mt-1 flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-neon-cyan" aria-hidden />
                <span className="font-display text-sm font-bold text-white">Sessions</span>
              </div>
            </div>
            {!adminMode && messages.length > 0 ? (
              <Button
                type="button"
                variant="secondary"
                className="gap-1 px-2.5 py-1.5 text-xs text-slate-400 hover:text-red-400"
                onClick={() => void onClearAllHistory()}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                Clear history
              </Button>
            ) : null}
          </div>
          {isAdmin ? (
            <label className="flex cursor-pointer items-center gap-2 border-b border-white/[0.04] px-4 py-2.5 text-xs text-slate-400">
              <input
                type="checkbox"
                checked={adminMode}
                onChange={(e) => {
                  setAdminMode(e.target.checked);
                  setSelectedId(null);
                  setMessages([]);
                  setSessionOwnerId(null);
                  setSessionTitle('');
                }}
                className="rounded border-neon-purple/50 bg-soc-deep text-neon-cyan focus:ring-neon-cyan/40"
              />
              <span className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-neon-amber" aria-hidden />
                All operator sessions (admin)
              </span>
            </label>
          ) : null}
          <div className="min-h-[200px] flex-1 space-y-1 overflow-y-auto p-3">
            {loadingSessions ? (
              <div className="space-y-2 py-2">
                <Skeleton className="h-11 w-full" />
                <Skeleton className="h-11 w-full" />
                <Skeleton className="h-11 w-full" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="empty-state mx-1 my-4 border-neon-cyan/20 py-12">
                <div className="empty-state-icon">
                  <MessageCircle className="h-6 w-6" aria-hidden />
                </div>
                <p className="font-display text-base font-bold text-white">Start a secure document conversation</p>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  Create a new channel. History persists in PostgreSQL across refresh, logout, and browser restarts.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {HINTS.map((h) => (
                    <button
                      key={h.label}
                      type="button"
                      className="hint-chip"
                      title={h.text}
                      onClick={() => applyHint(h.prompt)}
                    >
                      {h.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              sessions.map((s) => (
                <div
                  key={s.id}
                  className={`group flex items-center gap-1 rounded-lg border px-2 py-2 transition-all ${
                    selectedId === s.id
                      ? 'border-neon-cyan/45 bg-neon-cyan/10 shadow-glow-cyan'
                      : 'border-transparent hover:border-neon-cyan/20 hover:bg-white/[0.03]'
                  }`}
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 truncate text-left text-sm text-slate-200"
                    onClick={() => void loadMessages(s.id)}
                  >
                    <span className="block truncate font-semibold">{s.title}</span>
                    <span className="font-mono text-[10px] text-slate-500">
                      {adminMode ? `${s.user_id.slice(0, 8)}… · ` : ''}
                      {new Date(s.updated_at).toLocaleString()}
                    </span>
                  </button>
                  {user?.id === s.user_id ? (
                    <button
                      type="button"
                      className="shrink-0 rounded p-1.5 text-slate-500 opacity-0 transition-all hover:bg-neon-magenta/15 hover:text-neon-magenta group-hover:opacity-100"
                      title="Delete session"
                      aria-label="Delete session"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(s.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="relative flex min-h-[440px] flex-col overflow-hidden p-0 lg:max-h-[min(82vh,760px)]">
          {!selectedId ? (
            <div className="empty-state flex flex-1 flex-col justify-center border-0 py-16">
              <div className="empty-state-icon shadow-glow-purple">
                <MessageCircle className="h-7 w-7" aria-hidden />
              </div>
              <p className="font-display text-lg font-bold text-white">Start a secure document conversation</p>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-slate-500">
                Select a session from the archive or open a <strong className="text-slate-400">new chat</strong>. All
                transcripts sync from the database — nothing is stored only in the browser.
              </p>
              <div className="mt-8 grid w-full max-w-2xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {HINTS.map((h) => (
                  <button
                    key={h.label}
                    type="button"
                    className="glass-card-interactive rounded-lg border border-neon-cyan/15 bg-soc-panel/50 px-3 py-3 text-center"
                    onClick={() => applyHint(h.prompt)}
                  >
                    <div className="soc-label text-neon-cyan/55">{h.label}</div>
                    <p className="mt-2 text-xs leading-snug text-slate-400">{h.text}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="border-b border-neon-cyan/12 bg-gradient-to-r from-soc-panel/90 to-transparent px-4 py-3 md:px-5">
                <p className="soc-label text-neon-purple/70">Active thread</p>
                <h3 className="mt-1 truncate font-display text-base font-bold text-white">{sessionTitle}</h3>
                <p className="mt-1 font-mono text-[11px] text-neon-cyan/50">SESSION_ID · {selectedId}</p>
                {selectedDocFilename ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge
                      bg="dark"
                      className="d-inline-flex align-items-center gap-2 border border-neon-cyan/35 px-3 py-2 text-neon-cyan"
                    >
                      <FileText className="h-3.5 w-3.5" aria-hidden />
                      <span className="font-mono text-xs">
                        Current document: <strong className="text-white">{selectedDocFilename}</strong>
                      </span>
                    </Badge>
                    {canPost ? (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-cyan d-inline-flex align-items-center gap-1"
                        onClick={() => void clearSelectedDocument()}
                        disabled={sending}
                      >
                        <X className="h-3.5 w-3.5" aria-hidden />
                        Clear file
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-slate-500">
                    No file selected — mention a filename in your message to scope answers to one document.
                  </p>
                )}
                {!canPost ? (
                  <Alert variant="info" className="mt-3 text-xs" title="Read-only (admin)">
                    Viewing another operator&apos;s channel. Compose is disabled; only session owners may transmit.
                  </Alert>
                ) : null}
              </div>
              <div className="chat-shell flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,107,53,0.06),transparent_50%)] px-3 py-4 sm:px-5">
                {loadingMessages ? (
                  <div className="space-y-3">
                    <Skeleton className="ml-auto h-16 max-w-[85%] rounded-lg" />
                    <Skeleton className="h-24 max-w-[90%] rounded-lg" />
                    <div className="flex items-center gap-2 py-2">
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-800">
                        <div className="h-full w-1/3 animate-progress-indeterminate rounded-full bg-gradient-to-r from-neon-cyan via-neon-purple to-neon-cyan" />
                      </div>
                      <span className="soc-label text-neon-cyan/50">LOAD</span>
                    </div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-sm text-slate-500">No packets in this thread yet.</p>
                    <p className="soc-label mt-3 text-neon-cyan/40">Awaiting operator input ↓</p>
                  </div>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={m.role === 'user' ? 'chat-msg-user' : 'chat-msg-assistant'}>
                        <div className="mb-2 flex items-center justify-between gap-2 border-b border-white/5 pb-2">
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider ${m.role === 'user' ? 'text-neon-cyan' : 'text-neon-purple'}`}
                          >
                            {m.role === 'user' ? 'You' : 'Assistant'}
                          </span>
                          <span className="font-mono text-[9px] text-slate-500">
                            {new Date(m.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                        <ChatMessageBody role={m.role} content={m.content} />
                      </div>
                    </div>
                  ))
                )}
                {sending ? (
                  <div className="flex justify-start">
                    <div className="w-full max-w-md rounded-xl border border-neon-purple/25 bg-soc-panel/80 px-4 py-3 shadow-glow-purple">
                      <div className="flex items-center gap-3">
                        <Spinner size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-neon-cyan">Neural retrieval</p>
                          <p className="soc-label mt-0.5 text-slate-500">Qdrant · vector scan · rule synthesis</p>
                          <ProgressBar animated now={100} className="mt-2" style={{ height: 4 }} />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
                <div ref={bottomRef} />
              </div>
              <form
                onSubmit={(e) => void onSend(e)}
                className="chat-composer"
              >
                <p className="soc-label text-slate-500">Secure uplink</p>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <textarea
                    className="chat-input min-h-[88px] flex-1 sm:min-h-[72px]"
                    placeholder="Ask a question and mention a file name, e.g. 'In report.pdf, what is the conclusion?'"
                    value={input}
                    disabled={sending || !canPost}
                    onChange={(e) => setInput(e.target.value)}
                  />
                  <Button type="submit" disabled={sending || !input.trim() || !canPost} className="shrink-0 gap-2 sm:mb-0.5">
                    {sending ? <Spinner size="sm" /> : <Send className="h-4 w-4" aria-hidden />}
                    Transmit
                  </Button>
                </div>
              </form>
            </>
          )}
        </Card>
      </div>

      <CyberModal
        show={deleteTarget !== null}
        title="Delete conversation?"
        variant="danger"
        confirmLabel="Delete"
        loading={deleting}
        onHide={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDeleteSession()}
      >
        This removes the session and all messages from PostgreSQL. This cannot be undone.
      </CyberModal>
    </div>
  );
}
