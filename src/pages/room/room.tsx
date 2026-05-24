import { View, Text, Button, Image } from '@tarojs/components'
import Taro, { useRouter, useDidShow } from '@tarojs/taro'
import { useEffect, useState, useRef } from 'react'
import { getRoomDetail, addTransfer as addTransferService, deleteTransfer, settleRoom } from '@/services/room'
import { useRoomStore } from '@/stores/room'
import { getCurrentUser } from '@/utils/auth'
import type { RoomPlayer, RoomDetail } from '@/types/game'
import checkIcon from '@/assets/icons/check.svg'
import historyIcon from '@/assets/icons/history.svg'
import PlayerCard from '@/components/PlayerCard'
import InviteCard from '@/components/InviteCard'
import TransferCard from '@/components/TransferCard'
import './room.scss'

// 开发模式：设为 true 直接预览 room 页面 UI，无需登录和创建房间
const DEV_MOCK = true

const MOCK_ROOM: RoomDetail = {
  id: 'mock-room-1',
  room_code: 'ABC123',
  host_id: 'player-1',
  status: 'playing',
  created_at: new Date().toISOString(),
  settled_at: null,
  is_host: true,
  players: [
    { id: 'rp-1', room_id: 'mock-room-1', player_id: 'player-1', score: 150, joined_at: '', profile: { nickname: '小明', avatar_url: '' } },
    { id: 'rp-2', room_id: 'mock-room-1', player_id: 'player-2', score: -60, joined_at: '', profile: { nickname: '小红', avatar_url: '' } },
    { id: 'rp-3', room_id: 'mock-room-1', player_id: 'player-3', score: -90, joined_at: '', profile: { nickname: '小刚', avatar_url: '' } },
  ],
  transfers: [
    { id: 't-1', room_id: 'mock-room-1', from_player: 'player-2', to_player: 'player-1', amount: 100, created_at: '', from_profile: { nickname: '小红', avatar_url: '' }, to_profile: { nickname: '小明', avatar_url: '' } },
    { id: 't-2', room_id: 'mock-room-1', from_player: 'player-3', to_player: 'player-1', amount: 50, created_at: '', from_profile: { nickname: '小刚', avatar_url: '' }, to_profile: { nickname: '小明', avatar_url: '' } },
  ],
}

const getMockCurrentUser = () => ({ id: 'player-1', nickname: '小明', avatar_url: '' })
const avatarDefault = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'

const Room = () => {
  const router = useRouter()
  const roomId = DEV_MOCK ? 'mock-room-1' : (router.params.roomId as string)
  const currentUser = DEV_MOCK ? getMockCurrentUser() : getCurrentUser()
  const { room, isHost, loading, setRoom, setLoading, addTransfer, removeTransfer, updatePlayerScore, clearRoom } = useRoomStore()

  // 底部标签页切换
  const [activeTab, setActiveTab] = useState<'transfer' | 'history'>('transfer')

  // 转账弹窗
  const [transferTarget, setTransferTarget] = useState<RoomPlayer | null>(null)
  const [transferAmount, setTransferAmount] = useState('')
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
    if (DEV_MOCK) {
      setRoom(MOCK_ROOM, true)
      return () => clearRoom()
    }
    setLoading(true)
    fetchRoom().then(startPolling)
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
      clearRoom()
    }
  }, [roomId])

  // 页面从其他页面返回时刷新
  useDidShow(() => {
    if (DEV_MOCK) return
    if (roomId) fetchRoom()
  })

  // 复制房间码
  // const handleCopyCode = async () => {
  //   if (!room) return
  //   await Taro.vibrateShort({ type: 'light' })
  //   Taro.setClipboardData({ data: room.room_code })
  //   Taro.showToast({ title: '房间码已复制', icon: 'success' })
  // }

  // 进入个人中心
  const handleAvatarClick = async () => {
    await Taro.vibrateShort({ type: 'light' })
    Taro.navigateTo({ url: '/pages/userdetail/userdetail' })
  }

  // 点击玩家卡 → 弹出转账弹窗
  const handleCardClick = async (player: RoomPlayer) => {
    await Taro.vibrateShort({ type: 'light' })
    setTransferTarget(player)
    setTransferAmount('')
  }

  // 确认转账
  const handleAddTransfer = async () => {
    if (!room || !currentUser || !transferTarget) return
    const amt = parseInt(transferAmount)
    if (!amt || amt <= 0) {
      Taro.showToast({ title: '请输入有效金额', icon: 'error' })
      return
    }
    if (transferTarget.player_id === currentUser.id) {
      Taro.showToast({ title: '不能给自己转账', icon: 'error' })
      return
    }

    setSubmitting(true)
    try {
      const transfer = await addTransferService(room.id, currentUser.id, transferTarget.player_id, amt)
      addTransfer(transfer)
      updatePlayerScore(currentUser.id, (room.players.find(p => p.player_id === currentUser.id)?.score ?? 0) - amt)
      updatePlayerScore(transferTarget.player_id, transferTarget.score + amt)
      setTransferTarget(null)
      setTransferAmount('')
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

  // 切换标签
  const handleTabSwitch = async (tab: 'transfer' | 'history') => {
    await Taro.vibrateShort({ type: 'light' })
    setActiveTab(tab)
  }

  // 结算
  const handleSettle = async () => {
    if (!room || !currentUser) return
    await Taro.vibrateShort({ type: 'light' })
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
  // const playerNames = players.map(p => p.profile?.nickname ?? '未知')

  return (
    <View className='room-container'>
      <View className='room-header'>
        <View className='user'>
          <Image
            className='avatar'
            src={currentUser?.avatar_url || avatarDefault}
            onClick={handleAvatarClick}
          />
          <Text className='username'>
            {currentUser?.nickname || '小古拉'}
          </Text>
        </View>

        <Text className="score">分数:{players.find(p => p.player_id === currentUser?.id)?.score ?? 0}</Text>

        <Button className='settle-btn' onClick={handleSettle}>结算</Button>
      </View>

      <View className='room-body'>
        {activeTab === 'transfer' && (
          <View className='tab-content'>
            <View className='player-list'>
              {players.filter(p => p.player_id !== currentUser?.id).map(p => (
                <PlayerCard
                  key={p.id}
                  player={p}
                  avatarDefault={avatarDefault}
                  onClick={() => handleCardClick(p)}
                />
              ))}
              <InviteCard roomCode={room.room_code} />
            </View>
          </View>
        )}
        {activeTab === 'history' && (
          <View className='tab-content'>
            <View className='player-list'>
              {room.transfers.map(t => (
                <TransferCard
                  key={t.id}
                  transfer={t}
                  avatarDefault={avatarDefault}
                />
              ))}
            </View>
          </View>
        )}
      </View>

      {transferTarget && (
        <View className='transfer-overlay' onClick={() => setTransferTarget(null)}>
          <View className='transfer-dialog' onClick={e => e.stopPropagation()}>
            <Text className='dialog-title'>转账给 {transferTarget.profile?.nickname}</Text>
            <View className='dialog-body'>
              <Text className='label'>金额</Text>
              <View className='amount-display'>{transferAmount || '0'}</View>
              <View className='input-row'>
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(n => (
                  <Button
                    key={n}
                    className='num-btn'
                    onClick={() => setTransferAmount(prev => prev + n)}
                  >{n}</Button>
                ))}
                <Button
                  className='num-btn backspace'
                  onClick={() => setTransferAmount(prev => prev.slice(0, -1))}
                >回退</Button>
                <Button
                  className='num-btn zero'
                  onClick={() => setTransferAmount(prev => prev + '0')}
                >0</Button>
                <Button
                  className='num-btn clear'
                  onClick={() => setTransferAmount('')}
                >清空</Button>
              </View>
            </View>
            <View className='dialog-footer'>
              <Button className='btn-cancel' onClick={() => setTransferTarget(null)}>取消</Button>
              <Button className='btn-confirm' onClick={handleAddTransfer} loading={submitting}>确认</Button>
            </View>
          </View>
        </View>
      )}

      <View className='room-footer'>
        <View
          className={`footer-tab ${activeTab === 'transfer' ? 'active' : ''}`}
          onClick={() => handleTabSwitch('transfer')}
        >
          <Image className='icon' src={checkIcon} />
          <Text className='text'>记账</Text>
        </View>

        <View
          className={`footer-tab reverse ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => handleTabSwitch('history')}
        >
          <Text className='text'>记录</Text>
          <Image className='icon' src={historyIcon} />
        </View>
      </View>
    </View>
  )
}

export default Room
