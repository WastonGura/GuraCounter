import { api } from '@/lib/supabase'
import Taro from '@tarojs/taro'

interface Profile {
  id: string
  nickname: string
  avatar_url: string
  created_at: string
}

// 核心登录与自动注册函数
export async function loginAndRegister(): Promise<Profile | null> {
  try {
    // 1. 调用微信登录拿到 code
    const { code } = await Taro.login()

    // 2. 将 code 传给云函数换取 openid
    const { result } = await Taro.cloud.callFunction({
      name: 'login',
      data: { code },
    }) as any

    const openid = result.openid
    if (!openid) throw new Error('未能获取到openid')

    // 3. 去 Supabase 数据库查这个用户是否存在
    const profile = await api.maybeOne<Profile>('profiles', { id: openid })

    if (!profile) {
      // 新用户，自动注册
      const defaultUser: Profile = {
        id: openid,
        nickname: `玩家_${openid.slice(-6)}`,
        avatar_url: 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0',
        created_at: new Date().toISOString(),
      }

      await api.insert('profiles', defaultUser, 'id')

      Taro.setStorageSync('user_profile', defaultUser)
      return defaultUser
    }

    // 4. 老用户，直接存入本地缓存
    Taro.setStorageSync('user_profile', profile)
    return profile

  } catch (err) {
    console.error('登录注册失败:', err)
    Taro.showToast({ title: '登录失败', icon: 'error' })
    return null
  }
}

// 获取当前缓存的用户信息
export function getCurrentUser() {
  return Taro.getStorageSync('user_profile') || null
}

// 检查是否登录
export function checkLogin() {
  const user = Taro.getStorageSync('user_profile')
  return !!user
}
