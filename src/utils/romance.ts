import type { Character } from '../types/game'
import { isMutualRomance } from './relationshipBonds'

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

  return isSpouse || isMutualRomance(aId, bId, characters)
}
