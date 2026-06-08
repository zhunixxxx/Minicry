import type { Character } from '../../types/game'

const ACTOR_LINES = [
  '你可愿与我缔结良缘？',
  '我愿以余生相托，请你应允这桩婚事。',
  '此生只愿与你共度，可愿嫁娶于我？',
]

const TARGET_LINES = [
  '我……愿意。',
  '好，我应下了。',
  '你的心意，我收下了。',
]

export function buildProposeActorLine(): string {
  return ACTOR_LINES[Math.floor(Math.random() * ACTOR_LINES.length)]
}

export function buildProposeTargetLine(_actor: Character, _target: Character): string {
  return TARGET_LINES[Math.floor(Math.random() * TARGET_LINES.length)]
}
