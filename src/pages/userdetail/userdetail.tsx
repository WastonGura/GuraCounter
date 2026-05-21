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
    if (!user) return

    try {
      const res = await Taro.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
      })
      if (res.tempFiles.length > 0) {
        // 裁剪为 1:1 头像比例
        const cropRes = await Taro.cropImage({
          src: res.tempFiles[0].tempFilePath,
          cropScale: '1:1',
        })

        Taro.showLoading({ title: '上传中...' })

        // 删除旧的头像文件
        if (user.avatar_url?.startsWith('cloud://')) {
          Taro.cloud.deleteFile({ fileList: [user.avatar_url] }).catch(() => {})
        }

        const cloudPath = `avatars/${user.id}_${Date.now()}.jpg`

        const uploadRes = await Taro.cloud.uploadFile({
          cloudPath,
          filePath: cropRes.tempFilePath,
        })

        await updateProfile(user.id, { avatar_url: uploadRes.fileID })
        const updated = { ...user, avatar_url: uploadRes.fileID }
        Taro.setStorageSync('user_profile', updated)
        setUser(updated)

        Taro.hideLoading()
        Taro.showToast({ title: '修改成功', icon: 'success' })
      }
    } catch (e: any) {
      Taro.hideLoading()
      if (e.errMsg?.includes('cancel')) return
      Taro.showToast({ title: '修改失败', icon: 'error' })
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
          <Text>赢：{records.filter(r => r.my_score > 0).length}</Text>
          <Text>输：{records.filter(r => r.my_score < 0).length}</Text>
          <Text>胜率：{records.length > 0 ? ((records.filter(r => r.my_score > 0).length - records.filter(r => r.my_score < 0).length) / records.length * 100).toFixed(2) + '%' : '0%'}</Text>
        </View>
      </View>

      {/* 战绩 */}
      <View className='userdetail-history'>
        <Text className='history-title'>战绩</Text>

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
