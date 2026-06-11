import type { Character } from '../../types/game'
import { getSpeechAgeGroup, pick, pickSpeechLine } from '../../utils/ageSpeech'

function shortName(char: Character): string {
  return char.nickname || char.name.split('·')[0] || char.name
}

const ACTOR_LINES = {
  infant: ['（咿呀）', '……', '呜……'],
  toddler: ['嗯？', '……'],
  child: ['……这是什么？', '大人们在做什么？', '我不懂……'],
  youth: [
    '从今往后，我愿与您共度此生。',
    '今日起，您便是我的伴侣。',
    '愿上帝见证我们的誓言。',
    '我发誓，无论贫富，都将与您同行。',
  ],
  adult: [
    '从今往后，我愿与您共度此生。',
    '愿上帝见证我们的誓言。',
    '我发誓，无论贫富，都将与您同行。',
    '在众人面前，我承诺守护您一生一世。',
    '今日礼成，此生不负。',
    '从今往后，荣辱与共，不离不弃。',
    '我将以最诚挚的心意，与您结为夫妻。',
    '今日教堂钟声，便是我们誓言的回响。',
    '愿此后每一个清晨，都能与您相见。',
  ],
}

const TARGET_LINES = {
  infant: ['（咿呀）', '……'],
  toddler: ['嗯？', '……'],
  child: ['……什么？', '大人们在说什么？', '我不懂……'],
  youth: [
    '我愿意。',
    '今日起，我们便是夫妻了。',
    '我等这一天很久了，我愿意。',
  ],
  adult: [
    '我愿意。',
    '今日起，我们便是夫妻了。',
    '我等这一天很久了，我愿意。',
    '从今往后，请多关照。',
    '愿此后风雨同行，此生不渝。',
    '在上帝面前，我答应您。',
    '今日礼成，我心欢喜。',
    '好，我们是一起的了。',
  ],
}

function actorSpouseLine(target: Character): string {
  return target.gender === 'male'
    ? '今日起，您便是我的丈夫。'
    : '今日起，您便是我的妻子。'
}

function targetSpouseLine(actor: Character): string {
  return actor.gender === 'male'
    ? '能嫁给您，是我的幸事。'
    : '能娶您，是我的幸事。'
}

function targetNamedLine(actor: Character, target: Character): string {
  const name = shortName(actor)
  if (target.gender === 'male') {
    return pick([
      `好，${name}，我娶您。`,
      '您终于答应了……我愿意。',
    ])
  }
  return pick([
    `您终于娶我了……我愿意。`,
    `${name}，我愿意。`,
  ])
}

/** 婚礼：发起者台词 */
export function buildMarryActorLine(actor: Character, target: Character): string {
  const group = getSpeechAgeGroup(actor.age)
  if (group === 'adult' || group === 'elder') {
    return pick([
      `${shortName(target)}，从今往后，我愿与您共度此生。`,
      `${shortName(target)}，${actorSpouseLine(target).slice(4)}`,
      actorSpouseLine(target),
      ...ACTOR_LINES.adult!,
    ])
  }
  return pickSpeechLine(actor, ACTOR_LINES, ACTOR_LINES.adult!)
}

/** 婚礼：回应者台词 */
export function buildMarryTargetLine(actor: Character, target: Character): string {
  const group = getSpeechAgeGroup(target.age)
  if (group === 'adult' || group === 'elder') {
    return pick([
      `${shortName(actor)}，我愿意。`,
      `今日起，我们便是夫妻了，${shortName(actor)}。`,
      targetSpouseLine(actor),
      targetNamedLine(actor, target),
      ...TARGET_LINES.adult!,
    ])
  }
  return pickSpeechLine(target, TARGET_LINES, TARGET_LINES.adult!)
}
