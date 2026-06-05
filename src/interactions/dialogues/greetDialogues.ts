import type { Character } from '../../types/game'

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function shortName(char: Character): string {
  return char.nickname || char.name.split('·')[0] || char.name
}

function lineByTraits(
  char: Character,
  traitLines: Record<string, string[]>,
  fallback: string[],
): string {
  for (const trait of char.traits) {
    const lines = traitLines[trait]
    if (lines?.length) return pick(lines)
  }
  return pick(fallback)
}

const ACTOR_TRAIT_LINES: Record<string, string[]> = {
  傲慢: ['你也在这儿？', '哼，倒是巧。'],
  仁慈: ['愿您安好。', '见到你很高兴。'],
  野心勃勃: ['巧遇。', '正好遇上你。'],
  谨慎: ['……是你。', '日安，别来无恙？'],
  活泼: ['嘿，你也来啦！', '呀，好巧！'],
  狡黠: ['哟，是你呀。', '这可真巧。'],
  冷酷: ['嗯。', '日安。'],
  急躁: ['喂，等等——', '正好，跟你说句话。'],
}

const TARGET_TRAIT_LINES: Record<string, string[]> = {
  傲慢: ['彼此彼此。', '哼。'],
  怯懦: ['你、你好……', '啊，是你……'],
  活泼: ['呀，你好呀！', '哈哈，真巧！'],
  狡黠: ['别来无恙？', '哦？是你。'],
  冷酷: ['嗯。', '日安。'],
  仁慈: ['你好，愿平安。', '见到你真好。'],
  多疑: ['……何事？', '你找我有事？'],
  优雅: ['幸会。', '日安。'],
}

const ACTOR_DEFAULT = ['日安。', '好久不见。', '见到你真好。']
const TARGET_DEFAULT = ['日安。', '你好。', '幸会。']

const CROSS_HOUSE_ACTOR = ['向您致意。', '日安，阁下。']
const CROSS_HOUSE_TARGET = ['有礼了。', '日安。']

/** 打招呼：发起者台词 */
export function buildGreetActorLine(
  actor: Character,
  target: Character,
): string {
  const crossHouse = actor.houseId !== target.houseId
  if (crossHouse) {
    return lineByTraits(actor, ACTOR_TRAIT_LINES, CROSS_HOUSE_ACTOR)
  }
  const named = pick([
    `${shortName(target)}，日安。`,
    `嘿，${shortName(target)}。`,
    ...ACTOR_DEFAULT,
  ])
  if (named.length <= 16) return named
  return lineByTraits(actor, ACTOR_TRAIT_LINES, ACTOR_DEFAULT)
}

/** 打招呼：回应者台词 */
export function buildGreetTargetLine(
  actor: Character,
  target: Character,
): string {
  const crossHouse = actor.houseId !== target.houseId
  if (crossHouse) {
    return lineByTraits(target, TARGET_TRAIT_LINES, CROSS_HOUSE_TARGET)
  }
  const named = pick([
    `${shortName(actor)}，你好。`,
    `呀，${shortName(actor)}！`,
    ...TARGET_DEFAULT,
  ])
  if (named.length <= 16) return named
  return lineByTraits(target, TARGET_TRAIT_LINES, TARGET_DEFAULT)
}
