import { View, Text } from '@tarojs/components'
import type { GameRecord } from '@/types/game'
import './index.scss'

interface Props {
  record: GameRecord
}

const HistoryCard = ({ record }: Props) => {
  const raw = new Date(record.settled_at || record.created_at)
  const year = raw.getFullYear()
  const md = `${String(raw.getMonth() + 1).padStart(2, '0')}/${String(raw.getDate()).padStart(2, '0')}`
  const hm = `${String(raw.getHours()).padStart(2, '0')}:${String(raw.getMinutes()).padStart(2, '0')}`

  return (
    <View className='history-card-container'>
      <View className='history-card-header'>
        <View className='history-card-date'>
          <Text className='date-year'>{year}</Text>
          <Text className='date-time'>{md} {hm}</Text>
        </View>
        <View className='history-card-players'>
          {record.players.map((p, i) => (
            <Text key={i} className='player-score-text'>
              {p.nickname}: {p.score > 0 ? '+' : ''}{p.score}
            </Text>
          ))}
        </View>
        <Text className={`history-card-score ${record.my_score > 0 ? 'positive' : record.my_score < 0 ? 'negative' : ''}`}>
          {record.my_score > 0 ? '+' : ''}{record.my_score}
        </Text>
      </View>
      <Text className='history-card-code'>房间 {record.room_code}</Text>
    </View>
  )
}

export default HistoryCard
