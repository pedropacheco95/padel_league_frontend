import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { emitResultSaved, resetResultSaved, useResultSaved } from './resultSaved'

describe('useResultSaved', () => {
  beforeEach(() => resetResultSaved())

  it('starts empty and numbers each save', () => {
    const { result } = renderHook(() => useResultSaved())
    expect(result.current).toBeNull()
    act(() => emitResultSaved({ groupId: 138, matchId: 7 }))
    expect(result.current).toEqual({ seq: 1, groupId: 138, matchId: 7 })
    act(() => emitResultSaved({ groupId: 139, matchId: 8 }))
    expect(result.current).toEqual({ seq: 2, groupId: 139, matchId: 8 })
  })
})
