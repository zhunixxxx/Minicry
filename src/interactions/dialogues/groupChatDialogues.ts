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

const ACTOR_LINES = {
  infant: ['（咿呀）', '……'],
  toddler: ['嗯？', '……'],
  child: ['我也想说话！', '你们在聊什么？', '我也要听！'],
  youth: [
    '难得齐聚，不妨闲聊片刻。',
    '大家近来可还顺心？',
    '既然都在，说说近日要闻？',
    '来，谁先开个头？',
  ],
  adult: [
    '难得齐聚，不妨闲聊片刻。',
    '今日茶叙，各位近况如何？',
    '既然都在，说说近日要闻？',
    '大家近来可还顺心？',
    '人齐了，聊几句吧。',
    '别站着了，请入座说话。',
    '正好诸位都在，我有件事想听听看法。',
    '难得碰头，各自说说近况吧。',
    '来，谁先开个头？',
    '客厅里暖和，正适合说话。',
  ],
}

const TRAIT_LINES: Record<string, string[]> = {
  开朗: ['哈哈，好呀好呀！', '太好了，我正想说话呢！', '聊什么？我都行！'],
  骄傲: ['哼，也罢。', '既然您开了口……', '行吧，听听也无妨。'],
  审慎: ['……也好。', '嗯，听听无妨。', '可以，但别聊太久。'],
  机灵: ['有趣，说来听听。', '哦？那便聊聊。', '正好，我也有点消息要分享。'],
  有同理心: ['好啊，正合适。', '说来听听。', '大家近来都还好吗？'],
  急性子: ['快说快说！', '别绕圈子了！', '有话直说，别磨蹭。'],
  求知欲强: ['正好，有些问题想请教。', '倒是可以交流一下。', '我正好有个话题想讨论。'],
}

const PARTICIPANT_POOLS = {
  infant: ['（咿呀）', '……', '呜……'],
  toddler: ['嗯？', '……', '呀！'],
  child: ['嗯，也好。', '我也想听！', '说什么呢？', '好呀！'],
  youth: ['嗯，也好。', '请讲。', '说来听听。', '正有此意。', '好。'],
  adult: [
    '嗯，也好。',
    '请讲。',
    '说来听听。',
    '正有此意。',
    '好。',
    '可以，您说吧。',
    '我听着呢。',
    '行，聊聊看。',
    '没问题。',
    '甚好，请继续。',
  ],
}

export function buildGroupChatActorLine(actor: Character): string {
  const group = getSpeechAgeGroup(actor.age)
  if (group === 'infant' || group === 'toddler' || group === 'child') {
    return pickSpeechLine(actor, ACTOR_LINES)
  }
  return pickSpeechLine(actor, ACTOR_LINES, ACTOR_LINES.adult!)
}

export function buildGroupChatParticipantLine(char: Character): string {
  const group = getSpeechAgeGroup(char.age)

  if (group === 'infant' || group === 'toddler') {
    return pickSpeechLine(char, PARTICIPANT_POOLS)
  }

  if (group === 'child') {
    return pick([`${shortName(char)}也想听！`, ...PARTICIPANT_POOLS.child])
  }

  return lineByTraitsAndAge(
    char,
    TRAIT_LINES,
    PARTICIPANT_POOLS,
    PARTICIPANT_POOLS.adult!,
  )
}
