import { useEffect, useState } from 'react'
import { View, Image, Text, Button, Input } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { getCurrentUser } from '@/utils/auth'
import { getRoomHistory, updateProfile } from '@/services/room'
import HistoryCard from '@/components/HistoryCard'
import type { GameRecord } from '@/types/game'
import changeIcon from '@/assets/icons/pen.svg'
import './userdetail.scss'

const UserDetail = () => {
  const [user, setUser] = useState(getCurrentUser())
  const [records, setRecords] = useState<GameRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [editingName, setEditingName] = useState(false)
  const [nickname, setNickname] = useState(user?.nickname ?? '')

  const avatarDefault = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'

  useEffect(() => {
    const u = getCurrentUser()
    if (u) {
      setUser(u)
      setNickname(u.nickname ?? '')
      loadHistory(u.id)
    }
  }, [])

  const loadHistory = async (playerId: string) => {
    setLoading(true)
    try {
      const data = await getRoomHistory(playerId)
      setRecords(data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  // 更换头像
  const handleAvatarClick = async () => {
    await Taro.vibrateShort({ type: 'light' })
    try {
      const res = await Taro.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
      })
      if (res.tempFilePaths.length > 0) {
        // 微信小程序头像更新（此处仅提示，实际上传需要云存储）
        Taro.showToast({ title: '头像更新功能待开放', icon: 'none' })
      }
    } catch {
      // 用户取消选择
    }
  }

  // 编辑昵称
  const handleEditName = async () => {
    setEditingName(true)
    setNickname(user?.nickname ?? '')
  }

  const handleSaveName = async () => {
    if (!nickname.trim()) {
      Taro.showToast({ title: '昵称不能为空', icon: 'error' })
      return
    }
    if (!user) return

    try {
      await updateProfile(user.id, { nickname: nickname.trim() })
      const updated = { ...user, nickname: nickname.trim() }
      Taro.setStorageSync('user_profile', updated)
      setUser(updated)
      setEditingName(false)
      Taro.showToast({ title: '修改成功', icon: 'success' })
    } catch (e: any) {
      Taro.showToast({ title: e.message ?? '修改失败', icon: 'error' })
    }
  }

  const handleCancelEdit = () => {
    setEditingName(false)
    setNickname(user?.nickname ?? '')
  }

  // 统计
  const totalScore = records.reduce((sum, r) => sum + r.my_score, 0)

  return (
    <View className='userdetail-container'>
      {/* 用户信息 */}
      <View className='userdetail-info'>
        <View
          className='userdetail-info-avatar'
          hoverClass='userdetail-info-avatar--active'
          hoverStartTime={0}
          hoverStayTime={100}
          onClick={handleAvatarClick}
        >
          <Image className='avatar' src={user?.avatar_url || avatarDefault} />
          <View className='change-icon'>
            <Image className='icon' src={changeIcon} />
          </View>
        </View>

        <View className='userdetail-info-name'>
          {editingName ? (
            <View className='edit-name-row'>
              <Input
                className='name-input'
                value={nickname}
                onInput={(e) => setNickname(e.detail.value)}
                maxlength={12}
                focus
              />
              <Button className='save-name-btn' size='mini' onClick={handleSaveName}>保存</Button>
              <Button className='cancel-name-btn' size='mini' onClick={handleCancelEdit}>取消</Button>
            </View>
          ) : (
            <View className='name-row' onClick={handleEditName}>
              <Text className='name'>{user?.nickname || '未知玩家'}</Text>
              <Text className='edit-hint'>点击修改</Text>
            </View>
          )}
        </View>

        <View className='userdetail-info-rate'>
          <Text>参与房间：{records.length}</Text>
          <Text>总净得分：{totalScore > 0 ? '+' : ''}{totalScore}</Text>
        </View>
      </View>

      {/* 历史战绩 */}
      <View className='userdetail-history'>
        <Text className='history-title'>历史战绩</Text>

        {loading ? (
          <Text className='history-empty'>加载中...</Text>
        ) : records.length === 0 ? (
          <Text className='history-empty'>暂无记录</Text>
        ) : (
          <View className='history-list'>
            {records.map((r) => (
              <HistoryCard key={r.room_id} record={r} />
            ))}
          </View>
        )}
      </View>
    </View>
  )
}

export default UserDetail
