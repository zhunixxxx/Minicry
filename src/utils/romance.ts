import type { Character } from '../types/game'

export function isRomanticPartner(
  aId: string,
  bId: string,
  characters: Record<string, Character>,
): boolean {
  const a = characters[aId]
  const b = characters[bId]
  if (!a || !b) return false

  const isSpouse =
    a.spouseIds.includes(bId) && b.spouseIds.includes(aId)

  const aLovesB = a.relations.some(
    (r) => r.targetId === bId && r.type === 'lover',
  )
  const bLovesA = b.relations.some(
    (r) => r.targetId === aId && r.type === 'lover',
  )

  return isSpouse || (aLovesB && bLovesA)
}
