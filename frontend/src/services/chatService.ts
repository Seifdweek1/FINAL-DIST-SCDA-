import { apiJson } from './api';

export type ChatMessageRole = 'user' | 'assistant' | 'system';

export type ChatSessionRow = {
  id: string;
  user_id: string;
  title: string;
  selected_document_id?: string | null;
  selected_document_filename?: string | null;
  created_at: string;
  updated_at: string;
};

export type ChatMessageRow = {
  id: string;
  session_id: string;
  user_id: string;
  role: ChatMessageRole;
  content: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export async function createChatSession(title?: string): Promise<{ session: ChatSessionRow }> {
  return apiJson<{ session: ChatSessionRow }>('/api/ai/chat/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(title ? { title } : {}),
  });
}

export async function listChatSessions(): Promise<{ sessions: ChatSessionRow[] }> {
  return apiJson<{ sessions: ChatSessionRow[] }>('/api/ai/chat/sessions');
}

export async function getChatHistory(): Promise<{
  session: ChatSessionRow | null;
  messages: ChatMessageRow[];
}> {
  return apiJson('/api/ai/chat/history');
}

export async function clearChatHistory(): Promise<{ cleared: boolean }> {
  return apiJson('/api/ai/chat/history', { method: 'DELETE' });
}

export async function listChatSessionsAdmin(): Promise<{ sessions: ChatSessionRow[] }> {
  return apiJson<{ sessions: ChatSessionRow[] }>('/api/ai/chat/admin/sessions');
}

export async function getChatMessages(sessionId: string): Promise<{
  session: ChatSessionRow;
  messages: ChatMessageRow[];
}> {
  return apiJson(`/api/ai/chat/sessions/${encodeURIComponent(sessionId)}/messages`);
}

export async function sendChatMessage(
  sessionId: string,
  content: string,
  metadata?: Record<string, unknown>,
): Promise<{ user_message: ChatMessageRow; assistant_message: ChatMessageRow }> {
  return apiJson(`/api/ai/chat/sessions/${encodeURIComponent(sessionId)}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(metadata ? { content, metadata } : { content }),
  });
}

export async function deleteChatSession(sessionId: string): Promise<{ deleted: boolean; id: string }> {
  return apiJson(`/api/ai/chat/sessions/${encodeURIComponent(sessionId)}`, {
    method: 'DELETE',
  });
}
