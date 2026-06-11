import { describe, it, expect, vi } from 'vitest'

// Mock @tarojs/taro before importing the service module
vi.mock('@tarojs/taro', () => ({
  default: {
    request: vi.fn(),
  },
}))

import { getTransferSummary } from '@/services/room'
import type { ScoreTransfer } from '@/types/game'

function makeTransfer(overrides: Partial<ScoreTransfer> = {}): ScoreTransfer {
  return {
    id: 't-1',
    room_id: 'room-1',
    from_player: 'player-a',
    to_player: 'player-b',
    amount: 100,
    created_at: '2026-01-01T00:00:00Z',
    from_profile: { nickname: 'Alice', avatar_url: '' },
    to_profile: { nickname: 'Bob', avatar_url: '' },
    ...overrides,
  }
}

describe('getTransferSummary', () => {
  it('空数组返回空结果', () => {
    expect(getTransferSummary([])).toEqual([])
  })

  it('单笔转账返回一条汇总', () => {
    const transfers = [
      makeTransfer({ from_player: 'A', to_player: 'B', amount: 100 }),
    ]

    const result = getTransferSummary(transfers)

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      from_player: 'A',
      to_player: 'B',
      net_amount: 100,
    })
  })

  it('同方向多笔转账合并金额', () => {
    const transfers = [
      makeTransfer({ id: 't-1', from_player: 'A', to_player: 'B', amount: 50 }),
      makeTransfer({ id: 't-2', from_player: 'A', to_player: 'B', amount: 30 }),
    ]

    const result = getTransferSummary(transfers)

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      from_player: 'A',
      to_player: 'B',
      net_amount: 80,
    })
  })

  it('双向转账正确计算净额（A→B多则A是净输方）', () => {
    const transfers = [
      makeTransfer({ id: 't-1', from_player: 'A', to_player: 'B', amount: 100,
        from_profile: { nickname: 'Alice', avatar_url: '' },
        to_profile: { nickname: 'Bob', avatar_url: '' },
      }),
      makeTransfer({ id: 't-2', from_player: 'B', to_player: 'A', amount: 30,
        from_profile: { nickname: 'Bob', avatar_url: '' },
        to_profile: { nickname: 'Alice', avatar_url: '' },
      }),
    ]

    const result = getTransferSummary(transfers)

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      from_player: 'A',
      to_player: 'B',
      net_amount: 70,
    })
  })

  it('双向等额转账（净额为0）被排除', () => {
    const transfers = [
      makeTransfer({ from_player: 'A', to_player: 'B', amount: 50 }),
      makeTransfer({ from_player: 'B', to_player: 'A', amount: 50 }),
    ]

    const result = getTransferSummary(transfers)
    expect(result).toEqual([])
  })

  it('三人之间的转账正确汇总', () => {
    const transfers = [
      makeTransfer({ id: 't-1', from_player: 'A', to_player: 'B', amount: 100,
        from_profile: { nickname: 'Alice', avatar_url: '' },
        to_profile: { nickname: 'Bob', avatar_url: '' },
      }),
      makeTransfer({ id: 't-2', from_player: 'B', to_player: 'C', amount: 60,
        from_profile: { nickname: 'Bob', avatar_url: '' },
        to_profile: { nickname: 'Charlie', avatar_url: '' },
      }),
      makeTransfer({ id: 't-3', from_player: 'C', to_player: 'A', amount: 40,
        from_profile: { nickname: 'Charlie', avatar_url: '' },
        to_profile: { nickname: 'Alice', avatar_url: '' },
      }),
    ]

    const result = getTransferSummary(transfers)

    // Should have up to 3 entries (one per pair)
    expect(result.length).toBeGreaterThanOrEqual(1)

    // A→B: 100 (no reverse)
    const ab = result.find(r => r.from_player === 'A' && r.to_player === 'B')
    expect(ab).toBeDefined()
    expect(ab!.net_amount).toBe(100)

    // B→C: 60 (no reverse)
    const bc = result.find(r => r.from_player === 'B' && r.to_player === 'C')
    expect(bc).toBeDefined()
    expect(bc!.net_amount).toBe(60)

    // C→A: 40 (no reverse)
    const ca = result.find(r => r.from_player === 'C' && r.to_player === 'A')
    expect(ca).toBeDefined()
    expect(ca!.net_amount).toBe(40)
  })

  it('缺少 profile 时昵称回退为空字符串', () => {
    const transfers = [
      {
        id: 't-1',
        room_id: 'room-1',
        from_player: 'A',
        to_player: 'B',
        amount: 100,
        created_at: '',
      } as ScoreTransfer,
    ]

    const result = getTransferSummary(transfers)

    expect(result).toHaveLength(1)
    expect(result[0].from_nickname).toBe('')
    expect(result[0].to_nickname).toBe('')
  })

  it('部分有 profile 时正确提取昵称', () => {
    const transfers = [
      makeTransfer({
        id: 't-1',
        from_player: 'A',
        to_player: 'B',
        amount: 100,
        from_profile: { nickname: 'Alice', avatar_url: '' },
        // to_profile missing
      }),
    ]
    // Remove to_profile
    delete (transfers[0] as any).to_profile

    const result = getTransferSummary(transfers)

    expect(result).toHaveLength(1)
    expect(result[0].from_nickname).toBe('Alice')
    expect(result[0].to_nickname).toBe('')
  })

  it('反转方向时 net_amount 始终为正数', () => {
    // B→A amount > A→B, so B is the net payer
    const transfers = [
      makeTransfer({ id: 't-1', from_player: 'A', to_player: 'B', amount: 30,
        from_profile: { nickname: 'Alice', avatar_url: '' },
        to_profile: { nickname: 'Bob', avatar_url: '' },
      }),
      makeTransfer({ id: 't-2', from_player: 'B', to_player: 'A', amount: 100,
        from_profile: { nickname: 'Bob', avatar_url: '' },
        to_profile: { nickname: 'Alice', avatar_url: '' },
      }),
    ]

    const result = getTransferSummary(transfers)

    expect(result).toHaveLength(1)
    // B paid more, so B is from_player
    expect(result[0].from_player).toBe('B')
    expect(result[0].to_player).toBe('A')
    expect(result[0].net_amount).toBe(70)
    expect(result[0].net_amount).toBeGreaterThan(0)
  })
})
