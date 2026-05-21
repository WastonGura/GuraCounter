import { View, Text, Button } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useEffect, useState } from 'react'
import { getRoomDetail, getTransferSummary } from '@/services/room'
import { getCurrentUser } from '@/utils/auth'
import type { RoomDetail, TransferSummary } from '@/types/game'
import './check.scss'

const Check = () => {
  const router = useRouter()
  const roomId = router.params.roomId as string
  const currentUser = getCurrentUser()

  const [room, setRoom] = useState<RoomDetail | null>(null)
  const [summaries, setSummaries] = useState<TransferSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!roomId || !currentUser) return
    getRoomDetail(roomId, currentUser.id).then((detail) => {
      setRoom(detail)
      setSummaries(getTransferSummary(detail.transfers))
      setLoading(false)
    }).catch(() => {
      Taro.showToast({ title: '加载结算信息失败', icon: 'error' })
      setLoading(false)
    })
  }, [roomId])

  if (loading) {
    return <View className='check-container'><Text>加载中...</Text></View>
  }

  if (!room) {
    return <View className='check-container'><Text>无结算数据</Text></View>
  }

  // 按分数降序排列
  const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score)

  return (
    <View className='check-container'>
      <Text className='check-title'>结算结果</Text>

      {/* 房间信息 */}
      <View className='check-room-info'>
        <Text className='info-item'>房间码: {room.room_code}</Text>
        <Text className='info-item'>
          结算时间: {room.settled_at ? new Date(room.settled_at).toLocaleString('zh-CN') : '未结算'}
        </Text>
      </View>

      {/* 玩家总得分排名 */}
      <View className='score-ranking'>
        <Text className='section-title'>得分排名</Text>
        {sortedPlayers.map((p, i) => (
          <View key={p.player_id} className={`rank-item ${i === 0 ? 'rank-first' : ''}`}>
            <View className='rank-left'>
              <Text className='rank-index'>
                {i === 0 ? '👑 ' : ''}第{i + 1}名
              </Text>
              <Text className='rank-name'>{p.profile?.nickname ?? '未知'}</Text>
            </View>
            <Text className={`rank-score ${p.score > 0 ? 'positive' : p.score < 0 ? 'negative' : ''}`}>
              {p.score > 0 ? '+' : ''}{p.score}
            </Text>
          </View>
        ))}
      </View>

      {/* 转账关系汇总 */}
      <View className='transfer-summary'>
        <Text className='section-title'>输赢关系</Text>
        {summaries.length === 0 ? (
          <Text className='empty-hint'>无转账记录</Text>
        ) : (
          summaries.map((s, i) => (
            <View key={i} className='summary-item'>
              <Text className='summary-from'>{s.from_nickname || '未知'}</Text>
              <Text className='summary-arrow'>净输给</Text>
              <Text className='summary-to'>{s.to_nickname || '未知'}</Text>
              <Text className='summary-amount'>+{s.net_amount}</Text>
            </View>
          ))
        )}
      </View>

      <Button className='back-btn' onClick={() => Taro.navigateBack()}>返回</Button>
    </View>
  )
}

export default Check
