/**
 * Admin API helpers.
 * CRUD functions call Next.js API routes (/api/admin/...) directly.
 * The middleware already protects /admin/* via the bo_admin cookie.
 *
 * Token helpers and adminLogin/Logout are kept for the login page flow;
 * they also set the legacy cookie that middleware checks.
 */

import type { Theme, Item } from '@/types'

const TOKEN_KEY   = 'bo_access_token'
const REFRESH_KEY = 'bo_refresh_token'

// ── Token helpers ──────────────────────────────────────────────────────────────

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

// ── Auth ───────────────────────────────────────────────────────────────────────

interface LoginResponse {
  access_token:  string
  refresh_token: string
  expires_in:    number
  user: { id: string; email: string; role: string }
}

export async function adminLogin(email: string, password: string): Promise<LoginResponse> {
  // Use the Next.js password-gate route (sets bo_admin cookie for middleware)
  const res = await fetch('/api/admin/auth', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ password }),
  })

  if (!res.ok) throw new Error('Invalid credentials')

  // Store dummy tokens so isAuthenticated() returns true
  storeTokens('local', 'local')

  // Cookie is set server-side by /api/admin/auth
  return { access_token: 'local', refresh_token: 'local', expires_in: 604800, user: { id: '', email, role: 'admin' } }
}

export async function adminLogout() {
  clearTokens()
  document.cookie = 'bo_admin=; path=/; max-age=0'
  await fetch('/api/admin/auth', { method: 'DELETE' })
}

// ── Admin Themes ──────────────────────────────────────────────────────────────

export async function getAdminThemes(): Promise<Theme[]> {
  const res = await fetch('/api/admin/themes')
  if (!res.ok) throw new Error(`Failed to load themes: ${res.status}`)
  return res.json()
}

export async function createAdminTheme(data: Record<string, unknown>): Promise<Theme> {
  const res = await fetch('/api/admin/themes', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as Record<string, string>).error ?? `Failed to create theme: ${res.status}`)
  }
  return res.json()
}

// ── Admin Items ───────────────────────────────────────────────────────────────

export async function getAdminItems(status?: string, themeId?: string): Promise<Item[]> {
  const params = new URLSearchParams()
  if (status)  params.set('status',   status)
  if (themeId) params.set('theme_id', themeId)
  const qs = params.toString()
  const res = await fetch(`/api/admin/items${qs ? `?${qs}` : ''}`)
  if (!res.ok) throw new Error(`Failed to load items: ${res.status}`)
  return res.json()
}

export async function createAdminItem(data: Record<string, unknown>): Promise<Item> {
  const res = await fetch('/api/admin/items', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as Record<string, string>).error ?? `Failed to create item: ${res.status}`)
  }
  return res.json()
}

// ── Admin Upload ──────────────────────────────────────────────────────────────

interface UploadResponse {
  url:          string
  storage_path: string
}

export async function adminUpload(file: File, folder = 'catalog'): Promise<UploadResponse> {
  const formData = new FormData()
  formData.append('file',   file)
  formData.append('folder', folder)

  const res = await fetch('/api/admin/upload', {
    method: 'POST',
    body:   formData,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as Record<string, string>).error ?? `Upload failed: ${res.status}`)
  }
  return res.json()
}
