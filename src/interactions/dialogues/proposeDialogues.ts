import type { Character } from '../../types/game'

const ACTOR_LINES = [
  '你愿意嫁给我吗？',
  '我想和你共度余生，你愿意吗？',
  '我们在一起吧，好吗？',
  '我想正式向你求婚——你愿意吗？',
  '往后余生，我想和你一起走，你答应吗？',
  '我准备好了，你呢？愿意和我订婚吗？',
  '不是一时冲动，我是认真的——嫁给我吧。',
  '我想把未来交到你手里，你愿意接受吗？',
]

const TARGET_LINES = [
  '我……愿意。',
  '好，我答应你。',
  '你的心意，我收到了。',
  '嗯，我愿意。',
  '好，我们订婚吧。',
  '你终于说了……我愿意。',
  '我等这句话很久了，我愿意。',
  '好，从今天起，我们是一起的了。',
]

export function buildProposeActorLine(): string {
  return ACTOR_LINES[Math.floor(Math.random() * ACTOR_LINES.length)]
}

export function buildProposeTargetLine(_actor: Character, _target: Character): string {
  return TARGET_LINES[Math.floor(Math.random() * TARGET_LINES.length)]
}
