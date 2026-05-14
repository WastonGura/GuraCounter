export interface GameRecord {
  id: string
  created_at: string
  room_id: string
  player_count: number
  result: 'win' | 'lose'
}
