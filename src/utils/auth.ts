import { supabase } from '@/lib/supabase'
import Taro from '@tarojs/taro'


// 核心登录与自动注册函数
export async function loginAndRegister() {
  try {
    // 1. 调用微信登录拿到 code
    const { code } = await Taro.login()
    
    // 2. 将 code 传给云函数换取 openid
    const { result } = await Taro.cloud.callFunction({
      name: 'login', 
      data: { code }
    }) as any
    
    const openid = result.openid
    if (!openid) throw new Error('未能获取到openid')

    // 3. 去 Supabase 数据库查这个用户是否存在
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', openid)
      .single()

    if (fetchError && fetchError.code === 'PGRST116') {
      // PGRST116 表示未查到数据，说明是新用户，直接执行【自动注册】
      const defaultUser = {
        id: openid,
        nickname: `玩家_${openid.slice(-6)}`, // 默认取 openid 后六位作为名字
        avatar_url: 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0' // 微信默认灰色头像
      }
      
      const { error: insertError } = await supabase
        .from('profiles')
        .insert([defaultUser])

      if (insertError) throw insertError
      
      // 注册成功，存入本地缓存
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