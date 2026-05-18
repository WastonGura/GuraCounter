import { create } from 'zustand'
import type { RoomDetail, ScoreTransfer } from '@/types/game'

interface RoomStore {
  room: RoomDetail | null
  isHost: boolean
  loading: boolean

  setRoom: (room: RoomDetail, isHost: boolean) => void
  setLoading: (loading: boolean) => void
  addTransfer: (transfer: ScoreTransfer) => void
  removeTransfer: (transferId: string) => void
  updatePlayerScore: (playerId: string, score: number) => void
  clearRoom: () => void
}

export const useRoomStore = create<RoomStore>((set) => ({
  room: null,
  isHost: false,
  loading: false,

  setRoom: (room, isHost) => set({ room, isHost, loading: false }),
  setLoading: (loading) => set({ loading }),

  addTransfer: (transfer) =>
    set((state) => {
      if (!state.room) return state
      return {
        room: {
          ...state.room,
          transfers: [transfer, ...state.room.transfers],
        },
      }
    }),

  removeTransfer: (transferId) =>
    set((state) => {
      if (!state.room) return state
      return {
        room: {
          ...state.room,
          transfers: state.room.transfers.filter((t) => t.id !== transferId),
        },
      }
    }),

  updatePlayerScore: (playerId, score) =>
    set((state) => {
      if (!state.room) return state
      return {
        room: {
          ...state.room,
          players: state.room.players.map((p) =>
            p.player_id === playerId ? { ...p, score } : p
          ),
        },
      }
    }),

  clearRoom: () => set({ room: null, isHost: false, loading: false }),
}))
