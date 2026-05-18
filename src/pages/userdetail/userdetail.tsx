import { View, Image, Text } from '@tarojs/components'
import './userdetail.scss'
import avatarDefault from '../../assets/images/avatar.png'
import changeIcon from '../../assets/icons/pen.svg'
import Taro from '@tarojs/taro'
import { useEffect, useState } from 'react'

interface HistoryCard {
  id: string
  result: string
  timestamp: string
}

const UserDetail = () => {
  const handleAvatarClick = async () => {
    console.log("更换头像按钮被点击");
    await Taro.vibrateShort({
      type: 'light'
    })
  }

  const [historyCards, setHistoryCards] = useState<HistoryCard[]>([])
  const [hasMore, setHasMore] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  

  useEffect(() => {
    const fetchHistory = async () => {
      // 模拟获取用户战绩数据
      const mockHistory = [
        { id: 1, result: 'win', timestamp: '2024-06-01' },
        { id: 2, result: 'lose', timestamp: '2024-06-02' },
        { id: 3, result: 'win', timestamp: '2024-06-03' },
      ]
      setHistoryCards(mockHistory)
    }

    fetchHistory()
  }, [])

  return (
    <View className='userdetail-container'>
        <View className='userdetail-info'>
            <View className='userdetail-info-avatar' hoverClass='userdetail-info-avatar--active' hoverStartTime={0} hoverStayTime={100} onClick={handleAvatarClick}>
                <Image className='avatar' src={avatarDefault} />

                <View className='change-icon'>
                  {/* 更换头像图标 */}
                  <Image className='icon' src={changeIcon} />
                </View>
            </View>

            <View className='userdetail-info-name'>
                {/* 用户昵称 */}
                <Text className='name'>小古拉</Text>
            </View>

            <View className='userdetail-info-rate'>
                {/* 用户胜率栏 */}
                <Text className='win-times'>赢：3</Text>
                <Text className='lose-times'>输：1</Text>
                <Text className='win-rate'>胜率：75%</Text>
            </View>
        </View>

        <View className='userdetail-history'>
            {/* 用户战绩 */}
            <View className='history-title'>战绩</View>

            <View className='history-list'>
                <Text className='history-empty'>暂无记录</Text>
            </View>
        </View>
    </View>
    )
}

export default UserDetail
