import { useState, useEffect } from 'react'
import { View, Text, Image, Button, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { loginAndRegister } from '@/utils/auth'
import { createRoom, joinRoom } from '@/services/room'
import JoinRoom from '@/components/JoinRoom'
import './index.scss'

const Index = () => {
  const [user, setUser] = useState<any>(null)
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const avatarDefault = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'

  useEffect(() => {
    async function initAuth() {
      const profile = await loginAndRegister()
      if (profile) setUser(profile)
    }
    initAuth()
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    const cached = Taro.getStorageSync('user_profile')
    if (cached) setUser(cached)
    setTimeout(() => setRefreshing(false), 300)
  }

  async function handleLogin() {
    const profile = await loginAndRegister()
    if (profile) setUser(profile)
  }

  const requireLogin = (): boolean => {
    if (!user) {
      Taro.showToast({ title: '请先登录', icon: 'none' })
      handleLogin()
      return false
    }
    return true
  }

  // 进入个人中心
  const handleAvatarClick = async () => {
    await Taro.vibrateShort({ type: 'light' })
    if (!requireLogin()) return
    Taro.navigateTo({ url: '/pages/userdetail/userdetail' })
  }

  // 创建房间
  const handleCreateRoom = async () => {
    await Taro.vibrateShort({ type: 'light' })
    if (!requireLogin()) return
    if (creating) return

    setCreating(true)
    try {
      const room = await createRoom(user.id)
      Taro.navigateTo({ url: `/pages/room/room?roomId=${room.id}` })
    } catch (e: any) {
      Taro.showToast({ title: e.message ?? '创建失败', icon: 'error' })
    } finally {
      setCreating(false)
    }
  }

  // 加入房间
  const handleJoinRoom = async () => {
    await Taro.vibrateShort({ type: 'light' })
    if (!requireLogin()) return
    setShowJoinModal(true)
  }

  const handleConfirmJoin = async (roomCode: string) => {
    if (joining) return

    setJoining(true)
    try {
      const room = await joinRoom(roomCode, user.id)
      setShowJoinModal(false)
      Taro.navigateTo({ url: `/pages/room/room?roomId=${room.id}` })
    } catch (e: any) {
      Taro.showToast({ title: e.message ?? '加入失败', icon: 'error' })
    } finally {
      setJoining(false)
    }
  }

  const handleCancelJoin = () => {
    setShowJoinModal(false)
  }

  return (
    <ScrollView
      className='index-container'
      refresherEnabled
      refresherTriggered={refreshing}
      onRefresherRefresh={handleRefresh}
    >
      <View className='user'>
        <Image
          className='avatar-img'
          src={user?.avatar_url || avatarDefault}
          onClick={handleAvatarClick}
        />
        <Text className='username'>
          {user?.nickname || '小古拉'}
        </Text>
      </View>

      <View className='buttons'>
        <Button className='createbutton' onClick={handleCreateRoom} loading={creating} disabled={creating}>创建房间</Button>
        <Button className='joinbutton' onClick={handleJoinRoom}>加入房间</Button>
      </View>

      <JoinRoom
        visible={showJoinModal}
        onConfirm={handleConfirmJoin}
        onCancel={handleCancelJoin}
      />

      <View className='footer'>
        <Text className='blessing'>好运连连~</Text>
        <Text className='contact'>email: <Text className='email'>jiker@gmail.com</Text></Text>
        <Text className='studio'>© 2026 小古拉工作室</Text>
      </View>
    </ScrollView>
  )
}

export default Index
