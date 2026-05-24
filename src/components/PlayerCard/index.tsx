import { View, Text, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import type { RoomPlayer } from '@/types/game'
import './index.scss'

interface PlayerCardProps {
  player: RoomPlayer
  avatarDefault: string
  onClick: () => void
}

const PlayerCard = ({ player, avatarDefault, onClick }: PlayerCardProps) => {
  const { profile, score } = player
  const isNegative = score < 0

  const handleClick = async () => {
    await Taro.vibrateShort({ type: 'light' })
    onClick()
  }

  return (
    <View className='player-card' onClick={handleClick}>
      <View className='card-left'>
        <Image
          className='avatar'
          src={profile?.avatar_url || avatarDefault}
        />
        <Text className='nickname'>{profile?.nickname || '未知'}</Text>
      </View>

      <View className='card-right'>
        <View className='decorator' />
        <Text className={`score ${isNegative ? 'negative' : ''}`}>
          {score}
        </Text>
      </View>
    </View>
  )
}

export default PlayerCard
