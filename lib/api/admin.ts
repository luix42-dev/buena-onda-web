/**
 * Admin API helpers — JWT auth + authenticated CRUD.
 * Token stored in localStorage; middleware still gates /admin/* via cookie.
 * Strategy: login stores JWT + sets legacy cookie for middleware compat.
 */

import type { Theme, Item } from '@/types'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/v1'

const TOKEN_KEY = 'bo_access_token'
const REFRESH_KEY = 'bo_refresh_token'

// ── Token helpers ─────────────────────────────────────────────────────────────

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(REFRESH_KEY)
}

function storeTokens(access: string, refresh: string) {
  localStorage.setItem(TOKEN_KEY, access)
  localStorage.setItem(REFRESH_KEY, refresh)
}

function clearTokens() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_KEY)
}

export function isAuthenticated(): boolean {
  return !!getToken()
}

// ── camelCase → snake_case (shared with client.ts) ────────────────────────────

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
}

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

function transformKeysToSnake(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(transformKeysToSnake)
  if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
    const result: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
      result[camelToSnake(key)] = transformKeysToSnake(val)
    }
    return result
  }
  return obj
}

function transformKeysToCamel(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(transformKeysToCamel)
  if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
    const result: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
      result[snakeToCamel(key)] = transformKeysToCamel(val)
    }
    return result
  }
  return obj
}

// ── Authenticated fetch ───────────────────────────────────────────────────────

async function adminFetch<T>(
  path: string,
  init: RequestInit = {},
  transform = true,
): Promise<T> {
  const token = getToken()
  const headers = new Headers(init.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (!headers.has('Content-Type') && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers })

  if (res.status === 401) {
    // Try refresh
    const refreshed = await tryRefresh()
    if (refreshed) {
      headers.set('Authorization', `Bearer ${getToken()}`)
      const retry = await fetch(`${API_BASE}${path}`, { ...init, headers })
      if (!retry.ok) throw new Error(`API ${retry.status}: ${path}`)
      const json = await retry.json()
      return (transform ? transformKeysToSnake(json) : json) as T
    }
    clearTokens()
    window.location.href = '/admin/login'
    throw new Error('Session expired')
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message ?? `API ${res.status}: ${path}`)
  }

  const json = await res.json()
  return (transform ? transformKeysToSnake(json) : json) as T
}

async function tryRefresh(): Promise<boolean> {
  const refresh = getRefreshToken()
  if (!refresh) return false

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
    })
    if (!res.ok) return false
    const data = await res.json()
    storeTokens(data.accessToken, data.refreshToken)
    return true
  } catch {
    return false
  }
}

// ── Auth ──────────────────────────────────────────────────────────────────────

interface LoginResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  user: { id: string; email: string; role: string }
}

export async function adminLogin(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  if (!res.ok) {
    throw new Error('Invalid credentials')
  }

  const data = await res.json()
  storeTokens(data.accessToken, data.refreshToken)

  // Also set legacy cookie so Next.js middleware passes
  document.cookie = `bo_admin=${email}; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax`

  return transformKeysToSnake(data) as LoginResponse
}

export async function adminLogout() {
  try {
    await adminFetch('/auth/logout', { method: 'POST' }, false)
  } catch { /* ignore */ }
  clearTokens()
  document.cookie = 'bo_admin=; path=/; max-age=0'
}

// ── Admin Themes ──────────────────────────────────────────────────────────────

export async function getAdminThemes(): Promise<Theme[]> {
  return adminFetch<Theme[]>('/admin/themes')
}

export async function createAdminTheme(data: Record<string, unknown>): Promise<Theme> {
  const payload = transformKeysToCamel(data)
  return adminFetch<Theme>('/admin/themes', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

// ── Admin Items ───────────────────────────────────────────────────────────────

export async function getAdminItems(status?: string, themeId?: string): Promise<Item[]> {
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  if (themeId) params.set('theme_id', themeId)
  const qs = params.toString()
  return adminFetch<Item[]>(`/admin/items${qs ? `?${qs}` : ''}`)
}

export async function createAdminItem(data: Record<string, unknown>): Promise<Item> {
  const payload = transformKeysToCamel(data)
  return adminFetch<Item>('/admin/items', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

// ── Admin Upload ──────────────────────────────────────────────────────────────

interface UploadResponse {
  url: string
  storage_path: string
}

export async function adminUpload(file: File, folder = 'catalog'): Promise<UploadResponse> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('folder', folder)

  return adminFetch<UploadResponse>('/admin/upload', {
    method: 'POST',
    body: formData,
  })
}

export { adminFetch }
