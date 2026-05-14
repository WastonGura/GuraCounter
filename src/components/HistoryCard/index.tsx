import { View, Text } from '@tarojs/components'
import type { GameRecord } from '../../types/game'

interface Props {
  record: GameRecord
}

const HistoryCard = ({ record }: Props) => {
  return (
    <View className='history-card-container'>
      <Text className='history-card-date'>{record.created_at}</Text>
      <Text className='history-card-result'>{record.result === 'win' ? '胜利' : '失败'}</Text>
    </View>
  )
}

export default HistoryCard
