import type { Character } from '../../types/game'
import { getSpeechAgeGroup, pick, pickSpeechLine } from '../../utils/ageSpeech'

const ACTOR_LINES = {
  infant: ['（咿呀）', '……', '呜……'],
  toddler: ['嗯？', '……'],
  child: ['……这是什么意思？', '你在说什么呀？', '我不懂……'],
  youth: [
    '我以名誉与真心相托，恳请您答应我的求婚。',
    '愿与您缔结婚约，共度此生，您意下如何？',
    '我想正式向您求婚——您可愿应允？',
  ],
  adult: [
    '我以名誉与真心相托，恳请您答应我的求婚。',
    '愿与您缔结婚约，共度此生，您意下如何？',
    '我想正式向您求婚——您可愿应允？',
    '往后余生，我想与您同行，您答应吗？',
    '我准备好了，您呢？可愿与我订婚？',
    '愿将未来托付于您，您可愿接受？',
    '若蒙不弃，我想请求您答应这门亲事。',
  ],
}

const ACTOR_LINES_TO_FEMALE = [
  '我恳请您成为我的妻子，与我共度此生。',
  '并非一时冲动，我是认真的——请您嫁给我。',
]

const ACTOR_LINES_TO_MALE = [
  '我恳请您成为我的丈夫，与我共度此生。',
  '并非一时冲动，我是认真的——请您娶我。',
]

const TARGET_LINES = {
  infant: ['（咿呀）', '……'],
  toddler: ['嗯？', '……'],
  child: ['……什么？', '我不懂……', '你在说什么？'],
  youth: [
    '我……愿意。',
    '好，我答应您。',
    '您的心意，我收到了。',
    '嗯，我愿意。',
    '您终于说了……我愿意。',
  ],
  adult: [
    '我……愿意。',
    '好，我答应您。',
    '您的心意，我收到了。',
    '嗯，我愿意。',
    '好，我们订婚吧。',
    '您终于说了……我愿意。',
    '我等这句话很久了，我愿意。',
    '好，从今天起，我们是一起的了。',
    '您如此诚恳……我怎能拒绝。',
  ],
}

const TARGET_LINES_FEMALE = ['若父亲应允，我便愿意。']
const TARGET_LINES_MALE = ['若长辈应允，我便愿意。']

export function buildProposeActorLine(
  actor: Character,
  target: Character,
): string {
  const group = getSpeechAgeGroup(actor.age)
  if (group === 'infant' || group === 'toddler' || group === 'child') {
    return pickSpeechLine(actor, ACTOR_LINES, ACTOR_LINES.adult!)
  }

  const gendered =
    target.gender === 'male' ? ACTOR_LINES_TO_MALE : ACTOR_LINES_TO_FEMALE
  const pool = group === 'youth' ? ACTOR_LINES.youth! : ACTOR_LINES.adult!
  return pick([...pool, ...gendered])
}

export function buildProposeTargetLine(
  _actor: Character,
  target: Character,
): string {
  const group = getSpeechAgeGroup(target.age)
  if (group === 'child') {
    return pick(['……什么？', '我不懂……', '大人们在说什么？'])
  }

  const gendered =
    target.gender === 'male' ? TARGET_LINES_MALE : TARGET_LINES_FEMALE
  const pool =
    group === 'youth' ? TARGET_LINES.youth! : TARGET_LINES.adult!
  return pick([...pool, ...gendered])
}
