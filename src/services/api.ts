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

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(
      data?.error || `Request failed with status ${response.status}`,
      response.status,
    );
  }

  return data as T;
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
