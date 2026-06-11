import type { Character } from '../../types/game'
import {
  getSpeechAgeGroup,
  lineByTraitsAndAge,
  pick,
  pickSpeechLine,
} from '../../utils/ageSpeech'
import { MUTUAL_ROMANCE_THRESHOLD, getRomanceLevel } from '../../utils/relationshipBonds'

function shortName(char: Character): string {
  return char.nickname || char.name.split('·')[0] || char.name
}

function hasMutualRomance(actor: Character, target: Character): boolean {
  return (
    getRomanceLevel(actor, target.id) >= MUTUAL_ROMANCE_THRESHOLD &&
    getRomanceLevel(target, actor.id) >= MUTUAL_ROMANCE_THRESHOLD
  )
}

function hasRomanticFeelings(actor: Character, target: Character): boolean {
  return getRomanceLevel(actor, target.id) >= MUTUAL_ROMANCE_THRESHOLD
}

const ACTOR_TRAIT_LINES: Record<string, string[]> = {
  很有魅力: ['您今日这身装束，教人移不开眼。', '您这一笑，厅里仿佛都亮了。', '恕我冒昧，您今日格外动人。'],
  骄傲: ['能同您说话，算您走运。', '别误会，我只是随口一赞。', '别得意，我并无他意。'],
  开朗: ['笑一个嘛！', '您今日瞧着真好看！', '来，同我说说话？'],
  重感情: ['见到您，心跳总会快一些。', '今夜月色很好，想与您同看。', '不知为何，看见您便想靠近些。'],
  机灵: ['哦？您脸红了。', '别躲，让我好好瞧瞧您。', '被我瞧见了吧，您在偷看我。'],
  冷静: ['……您今日不错。', '别多想，随口一说。', '嗯，颇为顺眼。'],
  审慎: ['若冒昧了，还请见谅……', '容我说一句心里话。', '不知合不合适，但我想说……'],
}

const TARGET_TRAIT_LINES: Record<string, string[]> = {
  骄傲: ['哼，油嘴滑舌。', '少来这套。', '以为我会信？'],
  敏感: ['您、您说什么……', '别、别这样……', '别靠太近……'],
  开朗: ['哈哈，您真会说话！', '讨厌啦！', '行行行，算您会说。'],
  重感情: ['我也是……', '心跳得好快。', '别说了，脸都红了。'],
  机灵: ['哦？您胆子不小。', '有趣，继续说。', '您这套对我可不管用——大概吧。'],
  冷静: ['……无聊。', '说完了？', '嗯，知道了。'],
  审慎: ['这、这合适吗……', '别让人瞧见。', '您小声些……'],
  戒心重: ['您到底想做什么？', '少在我面前耍花样。', '别以为我听不出您的意图。'],
  急性子: ['有话快说！', '别磨磨蹭蹭！', '您到底想说什么？'],
}

const ACTOR_POOLS = {
  infant: ['（咿呀）', '呜……', '……'],
  toddler: ['嗯？', '……', '呜？'],
  child: ['你在说什么？', '……听不懂。', '别这样啦！', '讨厌！'],
  youth: [
    '您今日格外好看。',
    '能同您说会儿话，真好。',
    '别走，陪我说说话。',
    '若能在舞会上与您共舞，便是今晚幸事。',
  ],
  adult: [
    '您今日格外好看。',
    '能同您单独说会儿话，真好。',
    '方才还在想您，您便出现了。',
    '请留步，陪我说说话。',
    '您今日的笑容很犯规。',
    '不知为何，看见您便想逗您。',
    '有空吗？想邀您去花园走走。',
    '若能在舞会上与您共舞，便是今晚幸事。',
  ],
}

const TARGET_POOLS = {
  infant: ['……', '（咿呀）', '呜……'],
  toddler: ['嗯？', '……'],
  child: ['你说什么呀？', '……', '别闹了！', '耳朵都红了，还说这些。'],
  youth: [
    '……',
    '您这话从何说起？',
    '别闹。',
    '您是认真的？',
    '在这客厅里，您也不怕被人听见。',
  ],
  adult: [
    '……',
    '您这话从何说起？',
    '别闹。',
    '您是认真的？',
    '再这样我可要生气了——大概吧。',
    '耳朵都红了，还说这些。',
    '好啦好啦，我知道了。',
    '在这客厅里，您也不怕被人听见。',
  ],
}

const LOVER_ACTOR = {
  infant: ['（咿呀）', '……'],
  toddler: ['嗯……', '……'],
  child: ['我喜欢你！', '……别走。', '你能多待一会儿吗？'],
  youth: [
    '只有在您面前，我才敢这样说话。',
    '每次看见您，仍像初见那般心动。',
    '若能一直这样待着就好了。',
    '别走，再让我看您一会儿。',
  ],
  adult: [
    '只有在您面前，我才敢这样说话。',
    '每次看见您，仍像初见那般心动。',
    '若能一直这样待着就好了。',
    '您知道的，我对旁人从不会如此。',
    '别走，再让我看您一会儿。',
    '同您在一起时，时间总是过得太快。',
    '这话我藏了很久——我在乎您，比言语所能表达的更多。',
    '若被人知晓我们的事，后果不堪设想——可我仍想见您。',
  ],
}

const LOVER_TARGET = {
  infant: ['……', '（咯咯）'],
  toddler: ['嗯……', '……'],
  child: ['我也是……', '嗯，我也是。', '你别说了……'],
  youth: [
    '我也是……',
    '您总知道怎么说进我心里。',
    '别说了，我会当真的。',
    '您再说下去，我便舍不得走了。',
  ],
  adult: [
    '我也是……',
    '您总知道怎么说进我心里。',
    '别说了，我会当真的。',
    '您再说下去，我便舍不得走了。',
    '嗯，我也是这么想的。',
    '您这个人啊……真拿您没办法。',
    '我也是，每次看见您都一样。',
    '快回去吧，仆役就要过来了。',
  ],
}

/** 调情：发起者台词 */
export function buildFlirtActorLine(
  actor: Character,
  target: Character,
): string {
  if (hasMutualRomance(actor, target)) {
    return pickSpeechLine(actor, LOVER_ACTOR, ['……'])
  }
  if (hasRomanticFeelings(actor, target)) {
    return pickSpeechLine(actor, LOVER_ACTOR, ['……'])
  }

  const group = getSpeechAgeGroup(actor.age)
  if (group === 'infant' || group === 'toddler' || group === 'child') {
    return pickSpeechLine(actor, ACTOR_POOLS)
  }

  const named = pick([
    `${shortName(target)}，您今日真好看。`,
    `${shortName(target)}——`,
    ...ACTOR_POOLS.adult!,
  ])
  if ((group === 'adult' || group === 'elder') && named.length <= 18) return named
  return lineByTraitsAndAge(actor, ACTOR_TRAIT_LINES, ACTOR_POOLS, ACTOR_POOLS.adult!)
}

/** 调情：回应者台词 */
export function buildFlirtTargetLine(
  actor: Character,
  target: Character,
): string {
  if (hasMutualRomance(actor, target)) {
    return pickSpeechLine(target, LOVER_TARGET, ['……'])
  }
  if (hasRomanticFeelings(target, actor)) {
    return pickSpeechLine(target, LOVER_TARGET, ['……'])
  }

  const group = getSpeechAgeGroup(target.age)
  if (group === 'infant' || group === 'toddler' || group === 'child') {
    return pickSpeechLine(target, TARGET_POOLS)
  }

  const named = pick([`${shortName(actor)}，您……`, ...TARGET_POOLS.adult!])
  if ((group === 'adult' || group === 'elder') && named.length <= 16) return named
  return lineByTraitsAndAge(target, TARGET_TRAIT_LINES, TARGET_POOLS, TARGET_POOLS.adult!)
}
