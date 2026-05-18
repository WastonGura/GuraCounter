import { supabase } from '@/lib/supabase'
import type { Room, RoomDetail, RoomPlayer, ScoreTransfer, GameRecord, TransferSummary } from '@/types/game'

// 生成6位房间码（排除易混淆字符 0/O/1/I/L）
function generateRoomCode(): string {
  const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  const array = new Uint8Array(6)
  crypto.getRandomValues(array)
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += CHARS[array[i] % CHARS.length]
  }
  return code
}

async function generateUniqueRoomCode(): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const code = generateRoomCode()
    const { data } = await supabase
      .from('rooms')
      .select('id')
      .eq('room_code', code)
      .maybeSingle()
    if (!data) return code
  }
  throw new Error('无法生成唯一房间码，请重试')
}

// 创建房间
export async function createRoom(hostId: string): Promise<Room> {
  const room_code = await generateUniqueRoomCode()

  const { data: room, error } = await supabase
    .from('rooms')
    .insert({ room_code, host_id: hostId, status: 'playing' })
    .select('*')
    .single()

  if (error || !room) throw new Error(error?.message ?? '创建房间失败')

  const { error: joinError } = await supabase
    .from('room_players')
    .insert({ room_id: room.id, player_id: hostId, score: 0 })

  if (joinError) throw new Error('房主加入房间失败')

  return room as Room
}

// 加入房间
export async function joinRoom(roomCode: string, playerId: string): Promise<Room> {
  const code = roomCode.toUpperCase()

  const { data: room, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('room_code', code)
    .single()

  if (error || !room) throw new Error('房间不存在')
  if (room.status === 'settled') throw new Error('该房间已结算，无法加入')

  const { data: existing } = await supabase
    .from('room_players')
    .select('id')
    .eq('room_id', room.id)
    .eq('player_id', playerId)
    .maybeSingle()

  if (existing) return room as Room

  const { error: joinError } = await supabase
    .from('room_players')
    .insert({ room_id: room.id, player_id: playerId, score: 0 })

  if (joinError) throw new Error('加入房间失败')

  return room as Room
}

// 记录一笔转账，同时更新双方净得分
export async function addTransfer(
  roomId: string,
  fromPlayer: string,
  toPlayer: string,
  amount: number
): Promise<ScoreTransfer> {
  // 1. 插入转账记录
  const { data: transfer, error } = await supabase
    .from('score_transfers')
    .insert({
      room_id: roomId,
      from_player: fromPlayer,
      to_player: toPlayer,
      amount: amount,
    })
    .select('*')
    .single()

  if (error || !transfer) throw new Error(error?.message ?? '记录转账失败')

  // 2. 更新输方净得分
  const { data: fromData } = await supabase
    .from('room_players')
    .select('score')
    .eq('room_id', roomId)
    .eq('player_id', fromPlayer)
    .single()

  const { error: fromError } = await supabase
    .from('room_players')
    .update({ score: (fromData?.score ?? 0) - amount })
    .eq('room_id', roomId)
    .eq('player_id', fromPlayer)

  if (fromError) throw new Error('更新输方分数失败')

  // 3. 更新赢方净得分
  const { data: toData } = await supabase
    .from('room_players')
    .select('score')
    .eq('room_id', roomId)
    .eq('player_id', toPlayer)
    .single()

  const { error: toError } = await supabase
    .from('room_players')
    .update({ score: (toData?.score ?? 0) + amount })
    .eq('room_id', roomId)
    .eq('player_id', toPlayer)

  if (toError) throw new Error('更新赢方分数失败')

  return transfer as ScoreTransfer
}

// 删除转账记录，回滚双方分数
export async function deleteTransfer(transferId: string): Promise<void> {
  const { data: transfer, error: fetchError } = await supabase
    .from('score_transfers')
    .select('*')
    .eq('id', transferId)
    .single()

  if (fetchError || !transfer) throw new Error('转账记录不存在')

  // 回滚输方分数（加回）
  const { data: fromData } = await supabase
    .from('room_players')
    .select('score')
    .eq('room_id', transfer.room_id)
    .eq('player_id', transfer.from_player)
    .single()

  if (fromData) {
    await supabase
      .from('room_players')
      .update({ score: fromData.score + transfer.amount })
      .eq('room_id', transfer.room_id)
      .eq('player_id', transfer.from_player)
  }

  // 回滚赢方分数（减掉）
  const { data: toData } = await supabase
    .from('room_players')
    .select('score')
    .eq('room_id', transfer.room_id)
    .eq('player_id', transfer.to_player)
    .single()

  if (toData) {
    await supabase
      .from('room_players')
      .update({ score: toData.score - transfer.amount })
      .eq('room_id', transfer.room_id)
      .eq('player_id', transfer.to_player)
  }

  const { error } = await supabase
    .from('score_transfers')
    .delete()
    .eq('id', transferId)

  if (error) throw new Error('删除转账失败')
}

// 获取房间详情
export async function getRoomDetail(roomId: string, currentUserId: string): Promise<RoomDetail> {
  const { data: room, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', roomId)
    .single()

  if (error || !room) throw new Error('房间不存在')

  // 获取玩家列表
  const { data: players } = await supabase
    .from('room_players')
    .select(`
      id, room_id, player_id, score, joined_at,
      profile:player_id ( nickname, avatar_url )
    `)
    .eq('room_id', roomId)

  // 获取转账记录
  const { data: transfers } = await supabase
    .from('score_transfers')
    .select(`
      id, room_id, from_player, to_player, amount, created_at,
      from_p:from_player ( nickname, avatar_url ),
      to_p:to_player ( nickname, avatar_url )
    `)
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })

  const resolvedPlayers: RoomPlayer[] = (players ?? []).map((p: any) => ({
    id: p.id,
    room_id: p.room_id,
    player_id: p.player_id,
    score: p.score,
    joined_at: p.joined_at,
    profile: p.profile ? { nickname: p.profile.nickname, avatar_url: p.profile.avatar_url } : undefined,
  }))

  const resolvedTransfers: ScoreTransfer[] = (transfers ?? []).map((t: any) => ({
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
  const { data } = await supabase
    .from('rooms')
    .select('*')
    .eq('room_code', roomCode.toUpperCase())
    .maybeSingle()

  return (data as Room) ?? null
}

// 结算房间
export async function settleRoom(roomId: string, hostId: string): Promise<void> {
  const { error } = await supabase
    .from('rooms')
    .update({ status: 'settled', settled_at: new Date().toISOString() })
    .eq('id', roomId)
    .eq('host_id', hostId)
    .eq('status', 'playing')

  if (error) throw new Error('结算失败')
}

// 获取转账汇总（用于结算页）
export function getTransferSummary(transfers: ScoreTransfer[]): TransferSummary[] {
  const map = new Map<string, number>()

  for (const t of transfers) {
    const key = `${t.from_player}->${t.to_player}`
    const reverseKey = `${t.to_player}->${t.from_player}`
    map.set(key, (map.get(key) ?? 0) + t.amount)
    // 确保反方向 key 存在以计算净额
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
  const { data: participations } = await supabase
    .from('room_players')
    .select('room_id, score')
    .eq('player_id', playerId)

  if (!participations) return []

  const roomIds = participations.map(p => p.room_id)

  const { data: rooms } = await supabase
    .from('rooms')
    .select('*')
    .in('id', roomIds)
    .eq('status', 'settled')
    .order('settled_at', { ascending: false })

  if (!rooms) return []

  const records: GameRecord[] = []

  for (const room of rooms) {
    const { data: roomPlayers } = await supabase
      .from('room_players')
      .select('score, profile:player_id ( nickname, avatar_url )')
      .eq('room_id', room.id)

    const myParticipation = participations.find(p => p.room_id === room.id)

    records.push({
      room_id: room.id,
      room_code: room.room_code,
      created_at: room.created_at,
      settled_at: room.settled_at,
      my_score: myParticipation?.score ?? 0,
      players: (roomPlayers ?? []).map((p: any) => ({
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
  const { error } = await supabase
    .from('profiles')
    .update(data)
    .eq('id', playerId)

  if (error) throw new Error(error.message ?? '更新资料失败')
}
