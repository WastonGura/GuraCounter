import { api } from '@/lib/supabase'
import type { Room, RoomDetail, RoomPlayer, ScoreTransfer, GameRecord, TransferSummary } from '@/types/game'

// 生成6位房间码（排除易混淆字符 0/O/1/I/L）
function generateRoomCode(): string {
  const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)]
  }
  return code
}

async function generateUniqueRoomCode(): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const code = generateRoomCode()
    const row = await api.maybeOne<{ id: string }>('rooms', { room_code: code }, 'id')
    if (!row) return code
  }
  throw new Error('无法生成唯一房间码，请重试')
}

// 创建房间
export async function createRoom(hostId: string): Promise<Room> {
  const room_code = await generateUniqueRoomCode()
  const room = await api.insert<Room>('rooms', { room_code, host_id: hostId, status: 'playing' })
  await api.insert('room_players', { room_id: room.id, player_id: hostId, score: 0 }, 'id')
  return room
}

// 加入房间
export async function joinRoom(roomCode: string, playerId: string): Promise<Room> {
  const code = roomCode.toUpperCase()
  const room = await api.one<Room>('rooms', { room_code: code })
  if (room.status === 'settled') throw new Error('该房间已结算，无法加入')

  const existing = await api.maybeOne<{ id: string }>('room_players', { room_id: room.id, player_id: playerId }, 'id')
  if (existing) return room

  await api.insert('room_players', { room_id: room.id, player_id: playerId, score: 0 }, 'id')
  return room
}

// 记录一笔转账，同时更新双方净得分
export async function addTransfer(
  roomId: string,
  fromPlayer: string,
  toPlayer: string,
  amount: number
): Promise<ScoreTransfer> {
  const transfer = await api.insert<ScoreTransfer>('score_transfers', {
    room_id: roomId,
    from_player: fromPlayer,
    to_player: toPlayer,
    amount,
  })

  // 更新输方净得分
  const fromData = await api.one<{ score: number }>('room_players', { room_id: roomId, player_id: fromPlayer }, 'score')
  await api.update('room_players', { room_id: roomId, player_id: fromPlayer }, { score: fromData.score - amount }, 'id')

  // 更新赢方净得分
  const toData = await api.one<{ score: number }>('room_players', { room_id: roomId, player_id: toPlayer }, 'score')
  await api.update('room_players', { room_id: roomId, player_id: toPlayer }, { score: toData.score + amount }, 'id')

  return transfer
}

// 删除转账记录，回滚双方分数
export async function deleteTransfer(transferId: string): Promise<void> {
  const transfer = await api.one<ScoreTransfer>('score_transfers', { id: transferId })

  // 回滚输方分数（加回）
  const fromData = await api.one<{ score: number }>('room_players', { room_id: transfer.room_id, player_id: transfer.from_player }, 'score')
  await api.update('room_players', { room_id: transfer.room_id, player_id: transfer.from_player }, { score: fromData.score + transfer.amount }, 'id')

  // 回滚赢方分数（减掉）
  const toData = await api.one<{ score: number }>('room_players', { room_id: transfer.room_id, player_id: transfer.to_player }, 'score')
  await api.update('room_players', { room_id: transfer.room_id, player_id: transfer.to_player }, { score: toData.score - transfer.amount }, 'id')

  await api.remove('score_transfers', { id: transferId })
}

// 获取房间详情
export async function getRoomDetail(roomId: string, currentUserId: string): Promise<RoomDetail> {
  const room = await api.one<Room>('rooms', { id: roomId })

  // 获取玩家列表（带 profile join）
  const playersRaw = await api.list<any>(
    'room_players',
    { room_id: roomId },
    'id,room_id,player_id,score,joined_at,profile:player_id(nickname,avatar_url)',
  )

  // 获取转账记录（带双向 profile join）
  const transfersRaw = await api.list<any>(
    'score_transfers',
    { room_id: roomId },
    'id,room_id,from_player,to_player,amount,created_at,from_p:from_player(nickname,avatar_url),to_p:to_player(nickname,avatar_url)',
    'created_at',
    false,
  )

  const resolvedPlayers: RoomPlayer[] = playersRaw.map((p: any) => ({
    id: p.id,
    room_id: p.room_id,
    player_id: p.player_id,
    score: p.score,
    joined_at: p.joined_at,
    profile: p.profile ? { nickname: p.profile.nickname, avatar_url: p.profile.avatar_url } : undefined,
  }))

  const resolvedTransfers: ScoreTransfer[] = transfersRaw.map((t: any) => ({
    id: t.id,
    room_id: t.room_id,
    from_player: t.from_player,
    to_player: t.to_player,
    amount: t.amount,
    created_at: t.created_at,
    from_profile: t.from_p ? { nickname: t.from_p.nickname, avatar_url: t.from_p.avatar_url } : undefined,
    to_profile: t.to_p ? { nickname: t.to_p.nickname, avatar_url: t.to_p.avatar_url } : undefined,
  }))

  return {
    ...(room as Room),
    players: resolvedPlayers,
    transfers: resolvedTransfers,
    is_host: room.host_id === currentUserId,
  }
}

// 按房间码查房间
export async function getRoomByCode(roomCode: string): Promise<Room | null> {
  return api.maybeOne<Room>('rooms', { room_code: roomCode.toUpperCase() })
}

// 结算房间
export async function settleRoom(roomId: string, hostId: string): Promise<void> {
  await api.update(
    'rooms',
    { id: roomId, host_id: hostId, status: 'playing' },
    { status: 'settled', settled_at: new Date().toISOString() },
    'id',
  )
}

// 获取转账汇总（用于结算页）
export function getTransferSummary(transfers: ScoreTransfer[]): TransferSummary[] {
  const map = new Map<string, number>()

  for (const t of transfers) {
    const key = `${t.from_player}->${t.to_player}`
    const reverseKey = `${t.to_player}->${t.from_player}`
    map.set(key, (map.get(key) ?? 0) + t.amount)
    if (!map.has(reverseKey)) map.set(reverseKey, 0)
  }

  const result: TransferSummary[] = []
  const processed = new Set<string>()

  for (const [key, amount] of map) {
    const [from, to] = key.split('->')
    const pairKey = [from, to].sort().join('::')
    if (processed.has(pairKey)) continue
    processed.add(pairKey)

    const reverseAmount = map.get(`${to}->${from}`) ?? 0
    const netAmount = amount - reverseAmount

    if (netAmount === 0) continue

    if (netAmount > 0) {
      const fromTransfer = transfers.find(t => t.from_player === from && t.to_player === to)
      const toTransfer = transfers.find(t => t.from_player === to && t.to_player === from)
      result.push({
        from_player: from,
        from_nickname: fromTransfer?.from_profile?.nickname ?? '',
        to_player: to,
        to_nickname: (fromTransfer ?? toTransfer)?.to_profile?.nickname ?? '',
        net_amount: netAmount,
      })
    } else {
      const fromTransfer = transfers.find(t => t.from_player === to && t.to_player === from)
      const toTransfer = transfers.find(t => t.from_player === from && t.to_player === to)
      result.push({
        from_player: to,
        from_nickname: fromTransfer?.from_profile?.nickname ?? '',
        to_player: from,
        to_nickname: (fromTransfer ?? toTransfer)?.to_profile?.nickname ?? '',
        net_amount: -netAmount,
      })
    }
  }

  return result
}

// 获取玩家历史房间
export async function getRoomHistory(playerId: string): Promise<GameRecord[]> {
  const participations = await api.list<{ room_id: string; score: number }>(
    'room_players',
    { player_id: playerId },
    'room_id,score',
  )

  if (!participations.length) return []

  const roomIds = participations.map(p => p.room_id)
  const rooms = await api.listIn<Room>(
    'rooms',
    'id',
    roomIds,
    { status: 'settled' },
    '*',
    'settled_at',
    false,
  )

  if (!rooms.length) return []

  const records: GameRecord[] = []

  for (const room of rooms) {
    const roomPlayers = await api.list<any>(
      'room_players',
      { room_id: room.id },
      'score,profile:player_id(nickname,avatar_url)',
    )

    const myParticipation = participations.find(p => p.room_id === room.id)

    records.push({
      room_id: room.id,
      room_code: room.room_code,
      created_at: room.created_at,
      settled_at: room.settled_at,
      my_score: myParticipation?.score ?? 0,
      players: roomPlayers.map((p: any) => ({
        nickname: p.profile?.nickname ?? '未知',
        avatar_url: p.profile?.avatar_url ?? '',
        score: p.score,
      })),
    })
  }

  return records
}

// 更新玩家资料
export async function updateProfile(
  playerId: string,
  data: { nickname?: string; avatar_url?: string }
): Promise<void> {
  await api.update('profiles', { id: playerId }, data as Record<string, string>, 'id')
}
