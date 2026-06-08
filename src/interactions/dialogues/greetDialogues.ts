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
  骄傲: ['你也在这儿？', '哼，倒是巧。', '没想到会碰见你。'],
  有同理心: ['你好，最近还好吗？', '见到你很高兴。', '今天气色不错。'],
  进取心强: ['巧啊。', '正好碰上你。', '来得正好，我正找你。'],
  审慎: ['……是你。', '嗨，好久不见。', '哦，是你啊。'],
  开朗: ['嘿，你也来啦！', '呀，好巧！', '哇，居然遇到你！'],
  机灵: ['哟，是你呀。', '这可真巧。', '哈，让我猜猜你怎么在这儿。'],
  冷静: ['嗯。', '你好。', '好久不见。'],
  急性子: ['喂，等等——', '正好，跟你说句话。', '别走，我有话跟你说。'],
}

const TARGET_TRAIT_LINES: Record<string, string[]> = {
  骄傲: ['彼此彼此。', '哼。', '哦，是你。'],
  敏感: ['你、你好……', '啊，是你……', '吓我一跳……'],
  开朗: ['呀，你好呀！', '哈哈，真巧！', '你也在这儿呀！'],
  机灵: ['最近怎么样？', '哦？是你。', '又见面了。'],
  冷静: ['嗯。', '你好。', '好久不见。'],
  有同理心: ['你好，希望你一切都好。', '见到你真好。', '最近还顺利吗？'],
  戒心重: ['……有事？', '你找我有事？', '怎么突然跟我打招呼？'],
  很有气质: ['很高兴见到你。', '你好。', '幸会。'],
}

const ACTOR_DEFAULT = [
  '你好。',
  '好久不见。',
  '见到你真好。',
  '嗨，最近怎么样？',
  '正好遇到你。',
  '今天天气不错，是吧？',
  '路过打个招呼。',
  '嘿，忙什么呢？',
]
const TARGET_DEFAULT = [
  '你好。',
  '嗨。',
  '很高兴见到你。',
  '你也在这儿呀。',
  '好久不见，最近好吗？',
  '嗯，你好。',
  '巧了，我刚想找你。',
  '今天状态不错嘛。',
]

const CROSS_HOUSE_ACTOR = [
  '您好。',
  '你好，幸会。',
  '打扰了，您好。',
  '两族见面，请多关照。',
  '您好，没想到在这儿遇见。',
  '向您问好。',
  '幸会，久仰大名。',
]
const CROSS_HOUSE_TARGET = [
  '您好。',
  '你好。',
  '彼此彼此，您好。',
  '幸会。',
  '你好，请多关照。',
  '嗯，您好。',
  '久仰，今日得见。',
]

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
    `${shortName(target)}，你好。`,
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
