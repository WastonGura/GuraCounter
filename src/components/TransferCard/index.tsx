import { View, Text, Image } from '@tarojs/components'
import type { ScoreTransfer } from '@/types/game'
import './index.scss'

interface TransferCardProps {
  transfer: ScoreTransfer
  avatarDefault: string
}

const TransferCard = ({ transfer, avatarDefault }: TransferCardProps) => {
  const { from_profile, to_profile, amount } = transfer

  return (
    <View className='transfer-card'>
      <View className='transfer-from'>
        <Image
          className='avatar'
          src={from_profile?.avatar_url || avatarDefault}
        />
        <Text className='name'>{from_profile?.nickname || '未知'}</Text>
      </View>

      <View className='transfer-middle'>
        <Text className='amount'>{amount}</Text>
        <View className='arrow'>
          <View className='arrow-line' />
          <View className='arrow-head' />
        </View>
      </View>

      <View className='transfer-to'>
        <Image
          className='avatar'
          src={to_profile?.avatar_url || avatarDefault}
        />
        <Text className='name'>{to_profile?.nickname || '未知'}</Text>
      </View>
    </View>
  )
}

export default TransferCard
