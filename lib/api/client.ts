/**
 * Thin API client for the NestJS backend.
 * Converts camelCase API responses to snake_case to match existing frontend types.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/v1'

// ── camelCase → snake_case transformer ────────────────────────────────────────

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
}

function transformKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(transformKeys)
  if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
    const result: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
      result[camelToSnake(key)] = transformKeys(val)
    }
    return result
  }
  return obj
}

// ── Core fetch wrapper ────────────────────────────────────────────────────────

interface FetchOptions {
  /** Bearer token for admin endpoints */
  token?: string
  /** Query params appended to URL */
  params?: Record<string, string | number | undefined>
  /** Skip camelCase→snake_case transform (default: false) */
  raw?: boolean
  /** Set false for client components (skips next revalidate) */
  revalidate?: number | false
}

function buildUrl(path: string, params?: Record<string, string | number | undefined>): string {
  const url = new URL(`${API_BASE}${path}`)
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) url.searchParams.set(k, String(v))
    }
  }
  return url.toString()
}

async function apiFetch<T>(path: string, opts: FetchOptions = {}): Promise<T> {
  const url = buildUrl(path, opts.params)

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (opts.token) headers['Authorization'] = `Bearer ${opts.token}`

  const fetchOpts: RequestInit & { next?: { revalidate: number } } = { headers }
  if (opts.revalidate !== false) {
    fetchOpts.next = { revalidate: opts.revalidate ?? 60 }
  }

  const res = await fetch(url, fetchOpts)

  if (!res.ok) {
    throw new Error(`API ${res.status}: ${path}`)
  }

  const json = await res.json()
  return (opts.raw ? json : transformKeys(json)) as T
}

/** Client-side fetch (no next cache) */
async function apiClientFetch<T>(path: string, opts: Omit<FetchOptions, 'revalidate'> = {}): Promise<T> {
  return apiFetch<T>(path, { ...opts, revalidate: false })
}

// ── Typed helpers — public reads ──────────────────────────────────────────────

import type { Post, Episode, Drop, SiteSetting } from '@/types'

interface PaginatedPosts {
  posts: Post[]
  total: number
  page: number
  limit: number
}

interface PaginatedEpisodes {
  episodes: Episode[]
  total: number
  page: number
  limit: number
}

interface DropsResponse {
  drops: Drop[]
}

export async function getPosts(page = 1, limit = 20, tag?: string): Promise<PaginatedPosts> {
  return apiFetch<PaginatedPosts>('/posts', { params: { page, limit, tag } })
}

export async function getEpisodes(page = 1, limit = 20): Promise<PaginatedEpisodes> {
  return apiFetch<PaginatedEpisodes>('/episodes', { params: { page, limit } })
}

export async function getDrops(status?: string): Promise<DropsResponse> {
  return apiFetch<DropsResponse>('/drops', { params: { status } })
}

export async function getSetting(key: string): Promise<SiteSetting> {
  return apiFetch<SiteSetting>(`/settings/${encodeURIComponent(key)}`)
}

// ── Admin helpers (for next phase) ────────────────────────────────────────────

// ── Client-side typed helpers (for 'use client' components) ───────────────────

export async function getPostsClient(page = 1, limit = 20, tag?: string): Promise<PaginatedPosts> {
  return apiClientFetch<PaginatedPosts>('/posts', { params: { page, limit, tag } })
}

export async function getEpisodesClient(page = 1, limit = 20): Promise<PaginatedEpisodes> {
  return apiClientFetch<PaginatedEpisodes>('/episodes', { params: { page, limit } })
}

export async function getDropsClient(status?: string): Promise<DropsResponse> {
  return apiClientFetch<DropsResponse>('/drops', { params: { status } })
}

export { apiFetch, apiClientFetch, API_BASE }
export type { FetchOptions, PaginatedPosts, PaginatedEpisodes, DropsResponse }
