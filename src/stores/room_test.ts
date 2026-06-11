import { describe, it, expect, beforeEach } from 'vitest'
import { useRoomStore } from '@/stores/room'
import type { RoomDetail } from '@/types/game'

function makeRoom(overrides: Partial<RoomDetail> = {}): RoomDetail {
  return {
    id: 'room-1',
    room_code: 'ABC123',
    host_id: 'host-1',
    status: 'playing',
    created_at: '2026-01-01T00:00:00Z',
    settled_at: null,
    is_host: false,
    players: [
      {
        id: 'rp-1',
        room_id: 'room-1',
        player_id: 'player-1',
        score: 10,
        joined_at: '',
        profile: { nickname: 'Alice', avatar_url: '' },
      },
    ],
    transfers: [],
    ...overrides,
  }
}

describe('useRoomStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useRoomStore.setState({
      room: null,
      isHost: false,
      loading: false,
    })
  })

  it('初始状态为 null/ false/ false', () => {
    const state = useRoomStore.getState()
    expect(state.room).toBeNull()
    expect(state.isHost).toBe(false)
    expect(state.loading).toBe(false)
  })

  describe('setRoom', () => {
    it('设置 room、isHost，并将 loading 置为 false', () => {
      const room = makeRoom()
      useRoomStore.getState().setRoom(room, true)
      const state = useRoomStore.getState()
      expect(state.room).toEqual(room)
      expect(state.isHost).toBe(true)
      expect(state.loading).toBe(false)
    })

    it('loading 初始为 true 时也会被置为 false', () => {
      useRoomStore.setState({ loading: true })
      useRoomStore.getState().setRoom(makeRoom(), false)
      expect(useRoomStore.getState().loading).toBe(false)
    })
  })

  describe('setLoading', () => {
    it('更新 loading 状态', () => {
      useRoomStore.getState().setLoading(true)
      expect(useRoomStore.getState().loading).toBe(true)

      useRoomStore.getState().setLoading(false)
      expect(useRoomStore.getState().loading).toBe(false)
    })
  })

  describe('addTransfer', () => {
    it('在 transfers 列表头部添加新转账记录', () => {
      const room = makeRoom()
      useRoomStore.getState().setRoom(room, false)

      const transfer = {
        id: 't-1',
        room_id: 'room-1',
        from_player: 'player-1',
        to_player: 'player-2',
        amount: 50,
        created_at: '',
      }
      useRoomStore.getState().addTransfer(transfer)

      const { room: updated } = useRoomStore.getState()
      expect(updated!.transfers).toHaveLength(1)
      expect(updated!.transfers[0]).toEqual(transfer)
    })

    it('多条转账时保持插入顺序（后插入的在前面）', () => {
      const room = makeRoom()
      useRoomStore.getState().setRoom(room, false)

      useRoomStore.getState().addTransfer({ id: 't-1', room_id: 'room-1', from_player: 'a', to_player: 'b', amount: 10, created_at: '' })
      useRoomStore.getState().addTransfer({ id: 't-2', room_id: 'room-1', from_player: 'b', to_player: 'c', amount: 20, created_at: '' })

      const transfers = useRoomStore.getState().room!.transfers
      expect(transfers).toHaveLength(2)
      expect(transfers[0].id).toBe('t-2')
      expect(transfers[1].id).toBe('t-1')
    })

    it('room 为 null 时不做任何操作', () => {
      useRoomStore.getState().addTransfer({ id: 't-1', room_id: 'room-1', from_player: 'a', to_player: 'b', amount: 10, created_at: '' })
      expect(useRoomStore.getState().room).toBeNull()
    })
  })

  describe('removeTransfer', () => {
    it('按 id 删除转账记录', () => {
      const room = makeRoom({
        transfers: [
          { id: 't-1', room_id: 'room-1', from_player: 'a', to_player: 'b', amount: 10, created_at: '' },
          { id: 't-2', room_id: 'room-1', from_player: 'b', to_player: 'c', amount: 20, created_at: '' },
        ],
      })
      useRoomStore.getState().setRoom(room, false)

      useRoomStore.getState().removeTransfer('t-1')

      const transfers = useRoomStore.getState().room!.transfers
      expect(transfers).toHaveLength(1)
      expect(transfers[0].id).toBe('t-2')
    })

    it('删除不存在的 id 不影响列表', () => {
      const room = makeRoom({
        transfers: [
          { id: 't-1', room_id: 'room-1', from_player: 'a', to_player: 'b', amount: 10, created_at: '' },
        ],
      })
      useRoomStore.getState().setRoom(room, false)

      useRoomStore.getState().removeTransfer('nonexistent')

      expect(useRoomStore.getState().room!.transfers).toHaveLength(1)
    })

    it('room 为 null 时不做任何操作', () => {
      useRoomStore.getState().removeTransfer('t-1')
      expect(useRoomStore.getState().room).toBeNull()
    })
  })

  describe('updatePlayerScore', () => {
    it('更新指定玩家的分数', () => {
      const room = makeRoom({
        players: [
          { id: 'rp-1', room_id: 'room-1', player_id: 'player-1', score: 10, joined_at: '', profile: { nickname: 'Alice', avatar_url: '' } },
          { id: 'rp-2', room_id: 'room-1', player_id: 'player-2', score: -5, joined_at: '', profile: { nickname: 'Bob', avatar_url: '' } },
        ],
      })
      useRoomStore.getState().setRoom(room, false)

      useRoomStore.getState().updatePlayerScore('player-1', 50)

      const players = useRoomStore.getState().room!.players
      expect(players[0].score).toBe(50)
      expect(players[1].score).toBe(-5) // unchanged
    })

    it('不存在的 playerId 不改变任何玩家', () => {
      const room = makeRoom({
        players: [
          { id: 'rp-1', room_id: 'room-1', player_id: 'player-1', score: 10, joined_at: '', profile: { nickname: 'Alice', avatar_url: '' } },
        ],
      })
      useRoomStore.getState().setRoom(room, false)

      useRoomStore.getState().updatePlayerScore('nonexistent', 99)

      expect(useRoomStore.getState().room!.players[0].score).toBe(10)
    })

    it('room 为 null 时不做任何操作', () => {
      useRoomStore.getState().updatePlayerScore('player-1', 50)
      expect(useRoomStore.getState().room).toBeNull()
    })
  })

  describe('clearRoom', () => {
    it('重置所有状态', () => {
      useRoomStore.getState().setRoom(makeRoom(), true)
      expect(useRoomStore.getState().room).not.toBeNull()

      useRoomStore.getState().clearRoom()

      const state = useRoomStore.getState()
      expect(state.room).toBeNull()
      expect(state.isHost).toBe(false)
      expect(state.loading).toBe(false)
    })
  })
})
