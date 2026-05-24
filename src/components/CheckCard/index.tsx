import { View, Text, Image } from '@tarojs/components'
import './index.scss'

interface Receiver {
  nickname: string
  avatar_url: string
  amount: number
}

interface CheckCardProps {
  payerName: string
  payerAvatar: string
  receivers: Receiver[]
  avatarDefault: string
}

const CheckCard = ({ payerName, payerAvatar, receivers, avatarDefault }: CheckCardProps) => {
  return (
    <View className='check-card'>
      <View className='payer'>
        <Image className='avatar' src={payerAvatar || avatarDefault} />
        <Text className='name'>{payerName}</Text>
        <Text className='label'>需支付</Text>
      </View>
      <View className='receivers'>
        {receivers.map((r, i) => (
          <View key={i} className='receiver-item'>
            <Image className='avatar' src={r.avatar_url || avatarDefault} />
            <Text className='name'>{r.nickname}</Text>
            <Text className='amount'>{r.amount}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

export default CheckCard
