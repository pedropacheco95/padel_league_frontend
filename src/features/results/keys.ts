export const groupMatchesKey = (groupId: number) => ['v2', 'groups', groupId, 'matches'] as const

export type SeatKey = `${'home' | 'away'}-${1 | 2}`
export const seatKey = (p: { side: 'home' | 'away'; slot: 1 | 2 }): SeatKey => `${p.side}-${p.slot}`
