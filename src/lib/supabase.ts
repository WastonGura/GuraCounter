import Taro from '@tarojs/taro'

const BASE_URL = (process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || ''

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonData = Record<string, any>
type QueryConditions = Record<string, string>

function baseHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    apikey: ANON_KEY,
    Authorization: `Bearer ${ANON_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  }
}

function setEq(p: URLSearchParams, cond: QueryConditions) {
  for (const [k, v] of Object.entries(cond)) {
    p.set(k, `eq.${v}`)
  }
}

function buildUrl(table: string, params: URLSearchParams): string {
  const qs = params.toString()
  return `${BASE_URL}/rest/v1/${table}${qs ? '?' + qs : ''}`
}

async function request<T>(
  table: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  params: URLSearchParams,
  extraHeaders: Record<string, string> = {},
  body?: any,
): Promise<T> {
  const res = await Taro.request({
    url: buildUrl(table, params),
    method,
    header: baseHeaders(extraHeaders),
    data: body,
  })

  if (res.statusCode >= 400) {
    const msg = (res.data as any)?.message ?? `请求失败 (${res.statusCode})`
    throw new Error(msg)
  }

  return res.data as T
}

export const api = {
  /** 按条件查一行，不存在则返回 null */
  async maybeOne<T>(table: string, cond: QueryConditions, select = '*'): Promise<T | null> {
    const p = new URLSearchParams({ select })
    setEq(p, cond)
    try {
      const res = await request<T>(table, 'GET', p, { Accept: 'application/vnd.pgrst.object+json' })
      return res
    } catch {
      return null
    }
  },

  /** 按条件查一行，不存在则抛出 */
  async one<T>(table: string, cond: QueryConditions, select = '*'): Promise<T> {
    const p = new URLSearchParams({ select })
    setEq(p, cond)
    return request<T>(table, 'GET', p, { Accept: 'application/vnd.pgrst.object+json' })
  },

  /** 按条件查多行，支持排序 */
  async list<T>(table: string, cond: QueryConditions, select = '*', orderBy?: string, asc = true): Promise<T[]> {
    const p = new URLSearchParams({ select })
    setEq(p, cond)
    if (orderBy) p.set('order', `${orderBy}.${asc ? 'asc' : 'desc'}`)
    const data = await request<T[]>(table, 'GET', p)
    return data ?? []
  },

  /** 查 col IN (...) 的行 */
  async listIn<T>(table: string, col: string, vals: string[], extra: QueryConditions = {}, select = '*', orderBy?: string, asc = true): Promise<T[]> {
    const p = new URLSearchParams({ select })
    p.set(col, `in.(${vals.join(',')})`)
    setEq(p, extra)
    if (orderBy) p.set('order', `${orderBy}.${asc ? 'asc' : 'desc'}`)
    const data = await request<T[]>(table, 'GET', p)
    return data ?? []
  },

  /** 插入一行，返回插入后的行 */
  async insert<T>(table: string, data: JsonData, select = '*'): Promise<T> {
    const p = new URLSearchParams({ select })
    const h = { Prefer: 'return=representation', Accept: 'application/vnd.pgrst.object+json' }
    return request<T>(table, 'POST', p, h, data)
  },

  /** 按条件更新，返回更新后的行 */
  async update<T>(table: string, cond: QueryConditions, data: JsonData, select = '*'): Promise<T | undefined> {
    const p = new URLSearchParams({ select })
    setEq(p, cond)
    const h = { Prefer: 'return=representation', Accept: 'application/vnd.pgrst.object+json' }
    return request<T>(table, 'PATCH', p, h, data)
  },

  /** 按条件删除 */
  async remove(table: string, cond: QueryConditions): Promise<void> {
    const p = new URLSearchParams()
    setEq(p, cond)
    await request(table, 'DELETE', p)
  },
}
