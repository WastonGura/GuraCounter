import { View, Text, Image, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import './index.scss'

interface InviteCardProps {
  roomCode: string
}

const InviteCard = ({ roomCode }: InviteCardProps) => {
  const [visible, setVisible] = useState(false)

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${roomCode}`

  const handleCopyCode = async () => {
    await Taro.vibrateShort({ type: 'light' })
    Taro.setClipboardData({ data: roomCode })
    Taro.showToast({ title: '房间号已复制', icon: 'success' })
  }

  return (
    <>
      <View className='invite-card' onClick={() => { setVisible(true) }}>
        <View className='plus-icon'>
          <View className='plus-h' />
          <View className='plus-v' />
        </View>
      </View>

      {visible && (
        <View className='invite-overlay' onClick={() => setVisible(false)}>
          <View className='invite-dialog' onClick={e => e.stopPropagation()}>
            <Text className='invite-title'>邀请加入</Text>
            <Image className='qr-code' src={qrUrl} mode='aspectFit' />
            <Text className='room-code'>房间号：{roomCode}</Text>
            <Button className='btn-copy' onClick={handleCopyCode}>复制房间号</Button>
          </View>
        </View>
      )}
    </>
  )
}

export default InviteCard
