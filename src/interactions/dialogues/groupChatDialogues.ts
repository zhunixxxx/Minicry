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
  '今天有空，随便聊聊。',
  '大家最近怎么样？',
  '既然都在，不如聊几句？',
  '别站着了，坐下说说话。',
  '正好人齐，我有件事想听听大家的看法。',
  '难得碰头，各自汇报一下近况吧。',
  '来，谁先开个头？',
]

const TRAIT_LINES: Record<string, string[]> = {
  开朗: ['哈哈，好呀好呀！', '太棒了，我正想说话呢！', '聊什么？我都行！'],
  骄傲: ['哼，也罢。', '既然你开了口……', '行吧，听听也无妨。'],
  审慎: ['……也好。', '嗯，听听无妨。', '可以，但别聊太久。'],
  机灵: ['有趣，说来听听。', '哦？那便聊聊。', '正好，我也有点消息要分享。'],
  有同理心: ['好啊，正合适。', '说来听听。', '大家最近都还好吗？'],
  急性子: ['快说快说！', '别绕圈子了！', '有话直说，别磨蹭。'],
  求知欲强: ['正好，有些问题想请教。', '倒是可以交流一下。', '我正好有个话题想讨论。'],
}

const DEFAULT_LINES = [
  '嗯，也好。',
  '请讲。',
  '说来听听。',
  '正有此意。',
  '好。',
  '可以，你说吧。',
  '我听着呢。',
  '行，聊聊看。',
  '没问题。',
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
