import { View , Text, Image, Button} from '@tarojs/components'
import './index.scss'
import { useState, useEffect } from 'react'
import avatarDefault from '../../assets/images/avatar.png'
import Taro from '@tarojs/taro'
import { loginAndRegister } from '@/utils/auth'

const Index = () => {
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    async function initAuth() {
      const profile = await loginAndRegister()
      if (profile) {
        setUser(profile)
      }
    }

    initAuth()
  }, [])

  async function handleLogin() {
    const profile = await loginAndRegister()
    if (profile) {
      setUser(profile)
    }
  }

  // 进入个人中心
  const handleAvatarClick = async() => {
    // 震动反馈
    await Taro.vibrateShort({
      type: 'light'
    })

    // 如果用户未登录，提示登录
    if (!user) {
      Taro.showToast({
        title: '请先登录',
        icon: 'none'
      })
      handleLogin()
      return
    }

    // 如果用户已登录，进入个人中心
    Taro.navigateTo({
      url: '/pages/userdetail/userdetail'
    })
  }

  // 创建房间
  const handleCreateRoom = async() => {
    // 震动反馈
    await Taro.vibrateShort({
      type: 'light'
    })

    // 如果用户未登录，提示登录
    if (!user) {
      Taro.showToast({
        title: '请先登录',
        icon: 'none'
      })
      handleLogin()
      return
    }

    // 如果用户已登录，创建并进入房间页面
    async function createRoom() {}

    createRoom()

    Taro.navigateTo({
      url: '/pages/room/room'
    })
  }

  // 加入房间
  const handleJoinRoom = async() => {
    // 震动反馈
    await Taro.vibrateShort({
      type: 'light'
    })

    // 如果用户未登录，提示登录
    if (!user) {
      Taro.showToast({
        title: '请先登录',
        icon: 'none'
      })
      handleLogin()
      return
    }

    // 如果用户已登录，输入房间号或扫描二维码加入房间
    async function joinRoom() {}

    joinRoom()

    Taro.navigateTo({
      url: '/pages/room/room'
    })
  }

  return (
    <View className='index-container'>
      <View className='user'>
        <Image 
          className='avatar-img'
          src={user?.avatarUrl || avatarDefault} 
          onClick={handleAvatarClick}
        />
        <Text className='username'>
          {user?.nickname || '小古拉'}
        </Text>
      </View>

      <View className='buttons'>
        <Button className='createbutton' onClick={handleCreateRoom}>创建房间</Button>
        <Button className='joinbutton' onClick={handleJoinRoom}>加入房间</Button>
      </View>

      <View className='footer'>
        <Text className='blessing'>好运连连~</Text>
        <Text className='studio'>© 2026 小古拉工作室</Text>
      </View>

    </View>
  )
}

export default Index