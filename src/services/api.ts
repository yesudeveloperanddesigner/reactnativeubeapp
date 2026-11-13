import { getToken } from './storage';

const BASE_URL = 'https://golang-be.vercel.app';

// ─── Response Types ──────────────────────────────────────────────────────────

export interface UserData {
  id: string;
  name: string;
  email: string;
  kyc_status: string;
  kyc_session_id?: string;
  kyc_verified_at?: string;
}

export interface AuthResponse {
  token: string;
  user: UserData;
}

export interface KYCSessionResponse {
  session_id: string;
  session_token: string;
  kyc_status: string;
}

export interface KYCStatusResponse {
  kyc_status: string;
  kyc_session_id?: string;
  kyc_verified_at?: string;
  resubmit_info?: {
    nodes_to_resubmit?: { node_id: string; feature: string }[];
    reasons?: Record<string, string>;
  };
}

export interface Conversation {
  id: string;
  participants: string[];
  last_message?: string;
  last_sender?: string;
  last_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_email: string;
  content: string;
  read: boolean;
  created_at: string;
}

// ─── Error Type ──────────────────────────────────────────────────────────────

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// ─── Fetch Wrapper ───────────────────────────────────────────────────────────

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  // Read as text first: a crashing/misconfigured backend can return HTML or an
  // empty body, and `response.json()` would then throw a parser error that
  // masks the real status and message.
  const raw = await response.text();
  let data: unknown = null;
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = raw;
    }
  }

  if (!response.ok) {
    throw new ApiError(
      extractErrorMessage(data) || `Request failed with status ${response.status}`,
      response.status,
    );
  }

  return data as T;
}

function extractErrorMessage(data: unknown): string {
  if (!data) return '';
  if (typeof data === 'string') {
    const trimmed = data.trim();
    // Don't dump a full HTML error page into the UI.
    return trimmed.startsWith('<') ? '' : trimmed;
  }
  if (typeof data !== 'object') return '';

  const body = data as Record<string, unknown>;
  const read = (value: unknown): string => {
    if (typeof value === 'string') return value.trim();
    // Some APIs return field-level errors, e.g. { "workflow_id": ["Invalid workflow_id."] }
    if (value && typeof value === 'object') {
      const first = Object.values(value as Record<string, unknown>)
        .flat()
        .find((v): v is string => typeof v === 'string' && v.trim().length > 0);
      return first ? first.trim() : '';
    }
    return '';
  };

  // This backend sends a user-facing `error` plus a technical `details`
  // (the actual Didit response). Show both so failures are diagnosable.
  const summary = read(body.error) || read(body.message);
  const detail = read(body.details) || read(body.detail);

  if (summary && detail && !detail.includes(summary)) {
    return `${summary}: ${detail}`;
  }
  if (summary || detail) return summary || detail;

  // Fall back to the first string found in the body.
  return read(body);
}

// ─── Auth Endpoints ──────────────────────────────────────────────────────────

export function signup(
  name: string,
  email: string,
  password: string,
): Promise<AuthResponse> {
  return request<AuthResponse>('/signup', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
}

export function login(
  email: string,
  password: string,
): Promise<AuthResponse> {
  return request<AuthResponse>('/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

// ─── KYC Endpoints ───────────────────────────────────────────────────────────

export function createKYCSession(): Promise<KYCSessionResponse> {
  return request<KYCSessionResponse>('/kyc/session', {
    method: 'POST',
  });
}

export function syncKYCStatus(): Promise<KYCStatusResponse> {
  return request<KYCStatusResponse>('/kyc/sync', {
    method: 'POST',
  });
}

export function getKYCStatus(): Promise<KYCStatusResponse> {
  return request<KYCStatusResponse>('/kyc/status', {
    method: 'GET',
  });
}

// ─── Chat Endpoints ──────────────────────────────────────────────────────────

export function getConversations(): Promise<Conversation[]> {
  return request<Conversation[]>('/conversations', {
    method: 'GET',
  });
}

export function startConversation(recipientEmail: string): Promise<Conversation> {
  return request<Conversation>('/conversations', {
    method: 'POST',
    body: JSON.stringify({ recipient_email: recipientEmail }),
  });
}

export function getMessages(conversationId: string): Promise<Message[]> {
  return request<Message[]>(`/conversations/${conversationId}/messages`, {
    method: 'GET',
  });
}

export function sendMessage(conversationId: string, content: string): Promise<Message> {
  return request<Message>(`/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}

export function markConversationRead(conversationId: string): Promise<{ message?: string }> {
  return request<{ message?: string }>(`/conversations/${conversationId}/read`, {
    method: 'POST',
  });
}
