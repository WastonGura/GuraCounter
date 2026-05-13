import { View , Text, Image, Button} from '@tarojs/components'
import './index.scss'
import { useState } from 'react'
import avatarDefault from '../../assets/images/avatar.png'
import Taro from '@tarojs/taro'

const Index = () => {
  const [avatarUrl, setAvatarUrl] = useState(avatarDefault)

  const handleAvatarClick = async() => {
    await Taro.vibrateShort({
      type: 'light'
    })

    Taro.navigateTo({
      url: '/pages/userdetail/userdetail'
    })
  }

  const handleCreateButtonClicked = async() => {
    await Taro.vibrateShort({
      type: 'light'
    })

    Taro.navigateTo({
      url: '/pages/room/room'
    })
  }

  const handleJoinButtonClicked = async() => {
    await Taro.vibrateShort({
      type: 'light'
    })
  }

  return (
    <View className='index-container'>
      <View className='user'>
        <Image 
          className='avatar-img'
          src={avatarUrl} 
          onClick={handleAvatarClick}
        />
        <Text className='username'>
          小古拉
        </Text>
      </View>

      <View className='buttons'>
        <Button className='createbutton' onClick={handleCreateButtonClicked}>创建房间</Button>
        <Button className='joinbutton' onClick={handleJoinButtonClicked}>加入房间</Button>
      </View>

      <View className='footer'>
        <Text className='blessing'>好运连连~</Text>
        <Text className='studio'>© 2026 小古拉工作室</Text>
      </View>

    </View>
  )
}

export default Index