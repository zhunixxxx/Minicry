import { initialGameState } from '../data/initialState'
import type { GameState } from '../types/game'

const STORAGE_KEY = 'minicry:game-state'

export function loadGameState(): GameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as GameState
    if (
      typeof parsed.year !== 'number' ||
      typeof parsed.characters !== 'object' ||
      typeof parsed.houses !== 'object' ||
      !Array.isArray(parsed.narrative)
    ) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

export function saveGameState(state: GameState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // quota exceeded or private browsing — silently ignore
  }
}

export function clearGameState(): void {
  localStorage.removeItem(STORAGE_KEY)
}

export function getInitialGameState(): GameState {
  return loadGameState() ?? initialGameState
}
