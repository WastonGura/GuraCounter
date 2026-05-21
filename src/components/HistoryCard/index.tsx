import { View, Text } from '@tarojs/components'
import type { GameRecord } from '@/types/game'

interface Props {
  record: GameRecord
}

const HistoryCard = ({ record }: Props) => {
  const date = record.settled_at
    ? new Date(record.settled_at).toLocaleDateString('zh-CN')
    : record.created_at

  return (
    <View className='history-card-container'>
      <View className='history-card-header'>
        <Text className='history-card-code'>房间 {record.room_code}</Text>
        <Text className='history-card-date'>{date}</Text>
        <Text className={`history-card-score ${record.my_score > 0 ? 'positive' : record.my_score < 0 ? 'negative' : ''}`}>
          {record.my_score > 0 ? '+' : ''}{record.my_score}
        </Text>
      </View>

      <View className='history-card-players'>
        {record.players.map((p, i) => (
          <Text key={i} className='player-score-text'>
            {p.nickname}: {p.score > 0 ? '+' : ''}{p.score}
          </Text>
        ))}
      </View>
    </View>
  )
}

export default HistoryCard
