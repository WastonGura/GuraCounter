import { useState } from 'react'
import { View, Text, Input, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.scss'

interface JoinRoomProps {
  visible: boolean
  onConfirm: (roomCode: string) => void
  onCancel: () => void
}

const JoinRoom = ({ visible, onConfirm, onCancel }: JoinRoomProps) => {
  const [roomCode, setRoomCode] = useState('')

  if (!visible) return null

  const handleScan = async () => {
    try {
      const res = await Taro.scanCode({ onlyFromCamera: true })
      if (res.result) {
        setRoomCode(res.result.toUpperCase().trim().substring(0, 6))
      }
    } catch {
      // 用户取消扫码
    }
  }

  const handleConfirm = () => {
    if (!roomCode.trim()) {
      Taro.showToast({ title: '请输入房间码', icon: 'error' })
      return
    }
    onConfirm(roomCode.trim().toUpperCase())
  }

  const handleCancel = () => {
    setRoomCode('')
    onCancel()
  }

  return (
    <View className='join-room-overlay' catchMove>
      <View className='join-room-modal'>
        <Text className='join-room-title'>加入房间</Text>

        <Input
          className='join-room-input'
          type='text'
          value={roomCode}
          onInput={(e) => setRoomCode(e.detail.value.toUpperCase())}
          placeholder='输入房间码'
          maxlength={6}
          focus
        />

        <View className='join-room-scan' onClick={handleScan}>
          <Text className='scan-text'>扫描二维码加入</Text>
        </View>

        <View className='join-room-buttons'>
          <Button className='join-room-cancel' onClick={handleCancel}>取消</Button>
          <Button className='join-room-confirm' onClick={handleConfirm}>确定</Button>
        </View>
      </View>
    </View>
  )
}

export default JoinRoom
