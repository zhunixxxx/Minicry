import type { Character } from '../../types/game'
import {
  getSpeechAgeGroup,
  lineByTraitsAndAge,
  pick,
  pickSpeechLine,
} from '../../utils/ageSpeech'

function shortName(char: Character): string {
  return char.nickname || char.name.split('·')[0] || char.name
}

const ACTOR_TRAIT_LINES: Record<string, string[]> = {
  骄傲: ['哦，是您。', '倒是巧了。', '没想到会在此处遇见您。'],
  有同理心: ['日安，近来可好？', '见到您很高兴。', '您今日气色甚好。'],
  进取心强: ['正好遇见您。', '来得正好，我正想找您。', '巧了，我正有话要说。'],
  审慎: ['……是您。', '日安，许久不见。', '哦，是您啊。'],
  开朗: ['呀，您也来了！', '真巧，竟在此处遇见！', '日安，见到您真高兴！'],
  机灵: ['哟，是您呀。', '这可真巧。', '让我猜猜，您也是来赴宴的？'],
  冷静: ['嗯。', '日安。', '许久不见。'],
  急性子: ['且慢——', '正好，我有话同您说。', '请留步，容我说两句。'],
}

const TARGET_TRAIT_LINES: Record<string, string[]> = {
  骄傲: ['彼此彼此。', '哼。', '哦，是您。'],
  敏感: ['您、您好……', '啊，是您……', '吓了我一跳……'],
  开朗: ['呀，日安！', '哈哈，真巧！', '您也在这儿呀！'],
  机灵: ['近来可好？', '哦？是您。', '又见面了。'],
  冷静: ['嗯。', '日安。', '许久不见。'],
  有同理心: ['日安，愿您一切安好。', '见到您真好。', '近来一切顺利吗？'],
  戒心重: ['……有事？', '您找我有事？', '怎的突然同我搭话？'],
  很有气质: ['很高兴见到您。', '日安。', '幸会。'],
}

const ACTOR_POOLS = {
  infant: ['（咿呀）', '呜……', '……'],
  toddler: ['嗨！', '嗯？', '……'],
  child: ['你好呀！', '嘿！', '日安！', '你在这儿呀！'],
  youth: ['日安。', '嗨，好久不见。', '正好遇到你。', '你近来好吗？'],
  adult: [
    '日安。',
    '许久不见，您可安好？',
    '见到您，甚是荣幸。',
    '承蒙问候，您近来如何？',
    '正好遇见您。',
    '今日天色晴好，是吧？',
    '路过，向您致意。',
    '日安，今日可还顺心？',
  ],
}

const TARGET_POOLS = {
  infant: ['（咿呀）', '……', '呜……'],
  toddler: ['嗯！', '嗨？', '……'],
  child: ['你好！', '呀，是你！', '嘿！', '你也在这儿呀！'],
  youth: ['日安。', '嗨。', '好久不见。', '你也在这儿呀。'],
  adult: [
    '日安。',
    '承蒙问候。',
    '很高兴见到您。',
    '您也在这儿呀。',
    '许久不见，您可安好？',
    '嗯，日安。',
    '巧了，我正想找您说句话。',
    '您今日瞧着精神很好。',
  ],
}

const CROSS_HOUSE_ACTOR = {
  infant: ['……', '（咿呀）'],
  toddler: ['嗯？', '……'],
  child: ['您好。', '日安。', '你好。'],
  youth: ['日安，幸会。', '向您问好。', '您好。'],
  adult: [
    '向您致意，大人。',
    '日安，幸会。',
    '冒昧打扰，向您问好。',
    '两家会面，礼数不可废。',
    '日安，未料在此遇见。',
    '谨向您问安。',
    '幸会，久仰大名。',
    '承蒙赏光，向您致意。',
  ],
}

const CROSS_HOUSE_TARGET = {
  infant: ['……', '呜……'],
  toddler: ['嗯？', '……'],
  child: ['日安。', '您好。', '你好。'],
  youth: ['日安。', '幸会。', '您好。'],
  adult: [
    '向您致意。',
    '日安。',
    '彼此彼此，向您问好。',
    '幸会。',
    '日安，请多关照。',
    '嗯，向您致意。',
    '久仰，今日得见，荣幸之至。',
    '承蒙问候，大人。',
  ],
}

/** 打招呼：发起者台词 */
export function buildGreetActorLine(
  actor: Character,
  target: Character,
): string {
  const crossHouse = actor.houseId !== target.houseId
  const group = getSpeechAgeGroup(actor.age)

  if (group === 'infant' || group === 'toddler') {
    return pickSpeechLine(actor, crossHouse ? CROSS_HOUSE_ACTOR : ACTOR_POOLS)
  }

  if (group === 'child') {
    return pick([
      `${shortName(target)}！`,
      '你好呀！',
      '嘿！',
      ...ACTOR_POOLS.child,
    ])
  }

  if (crossHouse) {
    return lineByTraitsAndAge(
      actor,
      ACTOR_TRAIT_LINES,
      CROSS_HOUSE_ACTOR,
      CROSS_HOUSE_ACTOR.adult!,
    )
  }

  const named = pick([
    `${shortName(target)}，日安。`,
    `${shortName(target)}，许久不见。`,
    ...ACTOR_POOLS.adult!,
  ])
  if (group === 'adult' || group === 'elder') {
    if (named.length <= 16) return named
  }
  return lineByTraitsAndAge(actor, ACTOR_TRAIT_LINES, ACTOR_POOLS, ACTOR_POOLS.adult!)
}

/** 打招呼：回应者台词 */
export function buildGreetTargetLine(
  actor: Character,
  target: Character,
): string {
  const crossHouse = actor.houseId !== target.houseId
  const group = getSpeechAgeGroup(target.age)

  if (group === 'infant' || group === 'toddler') {
    return pickSpeechLine(target, crossHouse ? CROSS_HOUSE_TARGET : TARGET_POOLS)
  }

  if (group === 'child') {
    return pick([
      `${shortName(actor)}！`,
      '呀，是你！',
      '你好！',
      ...TARGET_POOLS.child,
    ])
  }

  if (crossHouse) {
    return lineByTraitsAndAge(
      target,
      TARGET_TRAIT_LINES,
      CROSS_HOUSE_TARGET,
      CROSS_HOUSE_TARGET.adult!,
    )
  }

  const named = pick([
    `${shortName(actor)}，日安。`,
    `呀，${shortName(actor)}！`,
    ...TARGET_POOLS.adult!,
  ])
  if (group === 'adult' || group === 'elder') {
    if (named.length <= 16) return named
  }
  return lineByTraitsAndAge(target, TARGET_TRAIT_LINES, TARGET_POOLS, TARGET_POOLS.adult!)
}
