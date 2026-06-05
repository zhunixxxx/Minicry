import type { Character } from '../../types/game'

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function shortName(char: Character): string {
  return char.nickname || char.name.split('·')[0] || char.name
}

const ACTOR_LINES = [
  '来，大家聊聊吧。',
  '难得聚在一起，说说近况？',
  '今日倒是有空，随便聊聊。',
  '诸位近来可好？',
]

const TRAIT_LINES: Record<string, string[]> = {
  活泼: ['哈哈，好呀好呀！', '太棒了，我正想说话呢！'],
  傲慢: ['哼，也罢。', '既然你开了口……'],
  谨慎: ['……也好。', '嗯，听听无妨。'],
  狡黠: ['有趣，说来听听。', '哦？那便聊聊。'],
  仁慈: ['好啊，正合适。', '愿闻其详。'],
  急躁: ['快说快说！', '别绕圈子了！'],
  好学: ['正好，有些问题想请教。', '倒是可以交流一二。'],
}

const DEFAULT_LINES = [
  '嗯，也好。',
  '请讲。',
  '愿闻其详。',
  '正有此意。',
  '好。',
]

export function buildGroupChatActorLine(): string {
  return pick(ACTOR_LINES)
}

export function buildGroupChatParticipantLine(char: Character): string {
  for (const trait of char.traits) {
    const lines = TRAIT_LINES[trait]
    if (lines?.length) return pick(lines)
  }
  const named = pick([
    `${shortName(char)}，请说。`,
    ...DEFAULT_LINES,
  ])
  return named.length <= 16 ? named : pick(DEFAULT_LINES)
}
