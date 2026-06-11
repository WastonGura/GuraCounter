import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock @tarojs/taro with a storage mock
const mockStorage: Record<string, any> = {}

vi.mock('@tarojs/taro', () => ({
  default: {
    getStorageSync: vi.fn((key: string) => mockStorage[key] ?? ''),
    setStorageSync: vi.fn((key: string, value: any) => { mockStorage[key] = value }),
    login: vi.fn(),
    cloud: { callFunction: vi.fn() },
    showToast: vi.fn(),
  },
}))

import Taro from '@tarojs/taro'
import { getCurrentUser, checkLogin } from '@/utils/auth'

beforeEach(() => {
  // Clear mock storage before each test
  Object.keys(mockStorage).forEach(k => delete mockStorage[k])
  vi.clearAllMocks()
})

describe('getCurrentUser', () => {
  it('缓存中有用户信息时返回用户对象', () => {
    const profile = { id: 'openid-1', nickname: 'Alice', avatar_url: '' }
    mockStorage['user_profile'] = profile

    const result = getCurrentUser()

    expect(result).toEqual(profile)
  })

  it('缓存中无用户信息时返回 null', () => {
    const result = getCurrentUser()
    expect(result).toBeNull()
  })

  it('缓存中为空字符串时返回空字符串（falsy 值不走 || 回退）', () => {
    // getStorageSync returns '' (falsy) when key not found
    mockStorage['user_profile'] = ''

    const result = getCurrentUser()
    // '' || null → null
    expect(result).toBeNull()
  })
})

describe('checkLogin', () => {
  it('缓存中有用户信息时返回 true', () => {
    mockStorage['user_profile'] = { id: 'openid-1' }

    expect(checkLogin()).toBe(true)
  })

  it('缓存中无用户信息时返回 false', () => {
    expect(checkLogin()).toBe(false)
  })

  it('缓存中为 null 时返回 false', () => {
    mockStorage['user_profile'] = null

    expect(checkLogin()).toBe(false)
  })

  it('缓存中为 undefined 时返回 false', () => {
    mockStorage['user_profile'] = undefined

    expect(checkLogin()).toBe(false)
  })
})
