const API_BASE = import.meta.env.VITE_API_URL ?? ''

async function request(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${API_BASE}/api${path}`, {
    ...opts,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(opts.headers ?? {}) },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `Request failed (${res.status})`)
  }
  if (res.status === 204) return null
  return res.json()
}

export const api = {
  get: (path: string) => request(path),
  post: (path: string, data?: unknown) => request(path, { method: 'POST', body: data ? JSON.stringify(data) : undefined }),
  put: (path: string, data?: unknown) => request(path, { method: 'PUT', body: data ? JSON.stringify(data) : undefined }),
  del: (path: string) => request(path, { method: 'DELETE' }),
}
