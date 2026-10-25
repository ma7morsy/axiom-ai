import Constants from 'expo-constants';
import { Platform } from 'react-native';

const fromEnv = process.env.EXPO_PUBLIC_API_URL;
const host = (Constants.expoConfig?.hostUri ?? '').split(':')[0];
export const API_URL = (fromEnv || (Platform.OS === 'web' ? 'http://localhost:5080' : `http://${host || 'localhost'}:5080`)).replace(/\/$/, '');

export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }

let token: string | null = null;
let onUnauthorized: (() => void) | null = null;
export const setToken = (t: string | null) => { token = t; };
export const setUnauthorizedHandler = (fn: () => void) => { onUnauthorized = fn; };

async function parse(res: Response) {
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* not json */ }
  if (!res.ok) {
    const first = data?.errors ? (Object.values(data.errors) as string[][])[0]?.[0] : undefined;
    if (res.status === 401 && token) onUnauthorized?.();
    throw new ApiError(res.status, first ?? data?.title ?? data?.error ?? `Request failed (${res.status})`);
  }
  return data;
}

export async function api<T>(path: string, opts: { method?: string; body?: unknown; form?: FormData; auth?: boolean } = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (token && opts.auth !== false) headers.Authorization = `Bearer ${token}`;
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  let res: Response;
  try {
    res = await fetch(API_URL + '/api' + path, {
      method: opts.method ?? (opts.body !== undefined || opts.form ? 'POST' : 'GET'), headers,
      body: opts.form ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined)
    });
  } catch { throw new ApiError(0, 'Cannot reach the server. Check your connection.'); }
  return parse(res) as Promise<T>;
}

export async function apiBlob(path: string, body: unknown): Promise<ArrayBuffer> {
  const res = await fetch(API_URL + '/api' + path, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
  if (!res.ok) throw new ApiError(res.status, 'Could not generate audio.');
  return res.arrayBuffer();
}
export const fileUrl = (p: string | null) => (p && p.startsWith('/') ? API_URL + p : p);
