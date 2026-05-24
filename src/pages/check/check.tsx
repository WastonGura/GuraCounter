import { View, Text, Image } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useEffect, useState, useMemo } from 'react'
import { getRoomDetail, getTransferSummary } from '@/services/room'
import { getCurrentUser } from '@/utils/auth'
import type { RoomDetail } from '@/types/game'
import CheckCard from '@/components/CheckCard'
import HomeIcon from '@/assets/icons/home.svg'
import './check.scss'

const avatarDefault = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'

const Check = () => {
  const router = useRouter()
  const roomId = router.params.roomId as string
  const currentUser = getCurrentUser()

  const [room, setRoom] = useState<RoomDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!roomId || !currentUser) return
    getRoomDetail(roomId, currentUser.id).then((detail) => {
      setRoom(detail)
      setLoading(false)
    }).catch(() => {
      Taro.showToast({ title: '加载结算信息失败', icon: 'error' })
      setLoading(false)
    })
  }, [roomId])

  const groupedTransfers = useMemo(() => {
    if (!room) return []
    const summaries = getTransferSummary(room.transfers)
    const groupMap = new Map<string, { from_nickname: string; from_avatar: string; receivers: Array<{ nickname: string; avatar_url: string; amount: number }> }>()

    for (const s of summaries) {
      if (!groupMap.has(s.from_player)) {
        const player = room.players.find(p => p.player_id === s.from_player)
        groupMap.set(s.from_player, {
          from_nickname: s.from_nickname,
          from_avatar: player?.profile?.avatar_url ?? '',
          receivers: [],
        })
      }
      const toPlayer = room.players.find(p => p.player_id === s.to_player)
      groupMap.get(s.from_player)!.receivers.push({
        nickname: s.to_nickname,
        avatar_url: toPlayer?.profile?.avatar_url ?? '',
        amount: s.net_amount,
      })
    }

    return Array.from(groupMap.entries()).map(([from_player, data]) => ({
      from_player,
      ...data,
    }))
  }, [room])

  if (loading) {
    return <View className='check-container'><Text>加载中...</Text></View>
  }

  if (!room) {
    return <View className='check-container'><Text>无结算数据</Text></View>
  }

  return (
    <View className='check-container'>
      <View className='check-header'>
        <Image src={HomeIcon} className='home-icon' onClick={() => Taro.navigateTo({ url: '/pages/index/index' })}/>
      </View>
      
      <View className='check-room-info'>
        <Text className='info-item'>房间码: {room.room_code}</Text>
        <Text className='info-item'>
          结算时间: {room.settled_at ? new Date(room.settled_at).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '未结算'}
        </Text>
      </View>

      <View className='check-transfers'>
        {groupedTransfers.map(g => (
          <CheckCard
            key={g.from_player}
            payerName={g.from_nickname}
            payerAvatar={g.from_avatar}
            receivers={g.receivers}
            avatarDefault={avatarDefault}
          />
        ))}
      </View>
    </View>
  )
}

export default Check
