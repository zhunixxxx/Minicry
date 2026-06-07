import type { Character } from '../types/game'

export function isOppositeGender(a: Character, b: Character): boolean {
  return a.gender !== b.gender
}
