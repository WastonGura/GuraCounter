import { View, Text, Button, Picker, Input } from '@tarojs/components'
import Taro, { useRouter, useDidShow } from '@tarojs/taro'
import { useEffect, useState, useRef } from 'react'
import { getRoomDetail, addTransfer as addTransferService, deleteTransfer, settleRoom } from '@/services/room'
import { useRoomStore } from '@/stores/room'
import { getCurrentUser } from '@/utils/auth'
import type { RoomPlayer } from '@/types/game'

const Room = () => {
  const router = useRouter()
  const roomId = router.params.roomId as string
  const currentUser = getCurrentUser()
  const { room, isHost, loading, setRoom, setLoading, addTransfer, removeTransfer, updatePlayerScore, clearRoom } = useRoomStore()

  // 转账表单
  const [fromIndex, setFromIndex] = useState(0)
  const [toIndex, setToIndex] = useState(0)
  const [amount, setAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchRoom = async () => {
    if (!roomId || !currentUser) return
    try {
      const detail = await getRoomDetail(roomId, currentUser.id)
      setRoom(detail, detail.is_host)
    } catch {
      Taro.showToast({ title: '获取房间信息失败', icon: 'error' })
    }
  }

  // 开始轮询
  const startPolling = () => {
    pollingRef.current = setInterval(fetchRoom, 3000)
  }

  useEffect(() => {
    setLoading(true)
    fetchRoom().then(startPolling)
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
      clearRoom()
    }
  }, [roomId])

  // 页面从其他页面返回时刷新
  useDidShow(() => {
    if (roomId) fetchRoom()
  })

  // 复制房间码
  const handleCopyCode = async () => {
    if (!room) return
    await Taro.vibrateShort({ type: 'light' })
    Taro.setClipboardData({ data: room.room_code })
    Taro.showToast({ title: '房间码已复制', icon: 'success' })
  }

  // 添加转账
  const handleAddTransfer = async () => {
    if (!room || !currentUser) return
    const amt = parseInt(amount)
    if (!amt || amt <= 0) {
      Taro.showToast({ title: '请输入有效金额', icon: 'error' })
      return
    }
    const players = room.players
    if (fromIndex === toIndex) {
      Taro.showToast({ title: '输方和赢方不能相同', icon: 'error' })
      return
    }

    setSubmitting(true)
    try {
      const transfer = await addTransferService(room.id, players[fromIndex].player_id, players[toIndex].player_id, amt)
      addTransfer(transfer)
      // 更新本地双方分数
      updatePlayerScore(players[fromIndex].player_id, players[fromIndex].score - amt)
      updatePlayerScore(players[toIndex].player_id, players[toIndex].score + amt)
      setAmount('')
      Taro.showToast({ title: '记录成功', icon: 'success' })
    } catch (e: any) {
      Taro.showToast({ title: e.message ?? '记录失败', icon: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  // 删除转账
  const handleDeleteTransfer = async (transferId: string, fromPlayer: string, toPlayer: string, transferAmount: number) => {
    try {
      await deleteTransfer(transferId)
      removeTransfer(transferId)
      updatePlayerScore(fromPlayer, (room!.players.find(p => p.player_id === fromPlayer)?.score ?? 0) + transferAmount)
      updatePlayerScore(toPlayer, (room!.players.find(p => p.player_id === toPlayer)?.score ?? 0) - transferAmount)
      Taro.showToast({ title: '已删除', icon: 'success' })
    } catch (e: any) {
      Taro.showToast({ title: e.message ?? '删除失败', icon: 'error' })
    }
  }

  // 结算
  const handleSettle = async () => {
    if (!room || !currentUser) return
    const res = await Taro.showModal({ title: '确认结算', content: '结算后无法再修改分数，确定吗？' })
    if (!res.confirm) return
    try {
      await settleRoom(room.id, currentUser.id)
      Taro.removeStorageSync('current_room')
      Taro.showToast({ title: '结算成功', icon: 'success' })
      fetchRoom()
    } catch (e: any) {
      Taro.showToast({ title: e.message ?? '结算失败', icon: 'error' })
    }
  }

  // 跳转结算页
  const handleGoCheck = async () => {
    if (!room) return
    await Taro.vibrateShort({ type: 'light' })
    Taro.navigateTo({ url: `/pages/check/check?roomId=${room.id}` })
  }

  // 返回首页
  const handleGoHome = async () => {
    await Taro.vibrateShort({ type: 'light' })
    Taro.navigateBack()
  }

  if (loading || !room) {
    return <View className='room-container'><Text>加载中...</Text></View>
  }

  const players = room.players
  const isSettled = room.status === 'settled'
  const playerNames = players.map(p => p.profile?.nickname ?? '未知')

  return (
    <View className='room-container'>
      {/* 房间码 */}
      <View className='room-code-bar' onClick={handleCopyCode}>
        <Text className='room-code-label'>房间码</Text>
        <Text className='room-code-value'>{room.room_code}</Text>
        <Text className='room-code-hint'>点击复制</Text>
      </View>

      {/* 状态标签 */}
      {isSettled && <View className='settled-badge'><Text>已结算</Text></View>}

      {/* 玩家列表 */}
      <View className='player-section'>
        <Text className='section-title'>玩家 ({players.length}人)</Text>
        {players.map((p: RoomPlayer) => (
          <View key={p.player_id} className='player-card'>
            <Text className='player-name'>{p.profile?.nickname ?? '未知'}</Text>
            <Text className={`player-score ${p.score > 0 ? 'positive' : p.score < 0 ? 'negative' : ''}`}>
              {p.score > 0 ? '+' : ''}{p.score}
            </Text>
          </View>
        ))}
      </View>

      {/* 记录转账（仅限进行中 + 房主 + 多于1个玩家） */}
      {!isSettled && isHost && players.length >= 2 && (
        <View className='transfer-form'>
          <Text className='section-title'>记录输赢</Text>

          <View className='transfer-pickers'>
            <Picker mode='selector' range={playerNames} value={fromIndex} onChange={(e) => setFromIndex(Number(e.detail.value))}>
              <View className='picker-item'>
                <Text className='picker-label'>输方</Text>
                <Text className='picker-value'>{playerNames[fromIndex]}</Text>
              </View>
            </Picker>

            <Text className='transfer-arrow'>{'>'}</Text>

            <Picker mode='selector' range={playerNames} value={toIndex} onChange={(e) => setToIndex(Number(e.detail.value))}>
              <View className='picker-item'>
                <Text className='picker-label'>赢方</Text>
                <Text className='picker-value'>{playerNames[toIndex]}</Text>
              </View>
            </Picker>
          </View>

          <View className='transfer-amount'>
            <Text className='amount-label'>金额</Text>
            <Input
              className='amount-input'
              type='number'
              value={amount}
              onInput={(e) => setAmount(e.detail.value)}
              placeholder='输入分数'
            />
            <Button
              className='confirm-btn'
              size='mini'
              onClick={handleAddTransfer}
              loading={submitting}
              disabled={submitting}
            >
              确认
            </Button>
          </View>
        </View>
      )}

      {/* 转账历史 */}
      <View className='transfer-history'>
        <Text className='section-title'>转账记录</Text>
        {room.transfers.length === 0 ? (
          <Text className='empty-hint'>暂无记录</Text>
        ) : (
          room.transfers.map((t) => (
            <View key={t.id} className='transfer-item'>
              <View className='transfer-info'>
                <Text className='transfer-from'>{t.from_profile?.nickname ?? '未知'}</Text>
                <Text className='transfer-arrow-mini'>→</Text>
                <Text className='transfer-to'>{t.to_profile?.nickname ?? '未知'}</Text>
                <Text className='transfer-amount-value'>+{t.amount}</Text>
              </View>
              {!isSettled && isHost && (
                <Button
                  className='delete-btn'
                  size='mini'
                  onClick={() => handleDeleteTransfer(t.id, t.from_player, t.to_player, t.amount)}
                >
                  删除
                </Button>
              )}
            </View>
          ))
        )}
      </View>

      {/* 底部操作按钮 */}
      <View className='room-actions'>
        {isSettled ? (
          <>
            <Button className='action-btn check-btn' onClick={handleGoCheck}>查看结算</Button>
            <Button className='action-btn home-btn' onClick={handleGoHome}>返回首页</Button>
          </>
        ) : (
          isHost && (
            <Button className='action-btn settle-btn' onClick={handleSettle}>结算房间</Button>
          )
        )}
      </View>
    </View>
  )
}

export default Room
