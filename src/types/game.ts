export type RoomStatus = 'playing' | 'settled'

export interface Profile {
  id: string
  nickname: string
  avatar_url: string
  created_at: string
}

export interface Room {
  id: string
  room_code: string
  host_id: string
  status: RoomStatus
  created_at: string
  settled_at: string | null
}

export interface RoomPlayer {
  id: string
  room_id: string
  player_id: string
  score: number
  joined_at: string
  profile?: { nickname: string; avatar_url: string }
}

export interface ScoreTransfer {
  id: string
  room_id: string
  from_player: string
  to_player: string
  amount: number
  created_at: string
  from_profile?: { nickname: string; avatar_url: string }
  to_profile?: { nickname: string; avatar_url: string }
}

export interface RoomDetail extends Room {
  players: RoomPlayer[]
  transfers: ScoreTransfer[]
  is_host: boolean
}

export interface TransferSummary {
  from_player: string
  from_nickname: string
  to_player: string
  to_nickname: string
  net_amount: number
}

export interface GameRecord {
  room_id: string
  room_code: string
  created_at: string
  settled_at: string | null
  my_score: number
  players: Array<{ nickname: string; avatar_url: string; score: number }>
}
