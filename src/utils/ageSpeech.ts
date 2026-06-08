import type { Character } from '../types/game'
import { getAgeGroup, type AgeGroup } from './ageGroups'

/** 台词用语年龄档，与逻辑年龄段一致 */
export type SpeechAgeGroup = AgeGroup

export { getAgeGroup as getSpeechAgeGroup }

const AGE_POOL_FALLBACK_ORDER: Partial<Record<AgeGroup, AgeGroup[]>> = {
  teenager: ['youth', 'adult'],
  elder: ['adult', 'youth'],
  youth: ['adult'],
  adult: ['youth'],
}

function resolveSpeechPool(
  group: AgeGroup,
  pools: Partial<Record<AgeGroup, string[]>>,
  fallback: string[],
): string[] {
  const direct = pools[group]
  if (direct?.length) return direct

  for (const alt of AGE_POOL_FALLBACK_ORDER[group] ?? []) {
    const pool = pools[alt]
    if (pool?.length) return pool
  }

  return fallback
}

export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function pickSpeechLine(
  char: Character,
  pools: Partial<Record<SpeechAgeGroup, string[]>>,
  fallback: string[] = ['……'],
): string {
  const group = getAgeGroup(char.age)
  const pool = resolveSpeechPool(group, pools, fallback)
  return pick(pool.length > 0 ? pool : fallback)
}

/** 婴幼儿及儿童优先走年龄池；青少年及以上再走性格特质 */
export function lineByTraitsAndAge(
  char: Character,
  traitLines: Record<string, string[]>,
  poolsByAge: Partial<Record<SpeechAgeGroup, string[]>>,
  adultFallback: string[],
): string {
  const group = getAgeGroup(char.age)

  if (group === 'infant' || group === 'toddler' || group === 'child') {
    return pickSpeechLine(char, poolsByAge, ['……'])
  }

  if (group === 'teenager' || group === 'youth') {
    const agePool = poolsByAge[group] ?? poolsByAge.youth
    if (agePool?.length && Math.random() < 0.45) {
      return pick(agePool)
    }
  }

  if (group === 'elder') {
    const elderPool = poolsByAge.elder
    if (elderPool?.length && Math.random() < 0.4) {
      return pick(elderPool)
    }
  }

  for (const trait of char.traits) {
    const lines = traitLines[trait]
    if (lines?.length) return pick(lines)
  }

  return pickSpeechLine(char, poolsByAge, adultFallback)
}

const INFANT_EVENT_REACTIONS = ['（咿呀）', '呜……', '……', '（咯咯）']
const TODDLER_EVENT_REACTIONS = [
  '嗯？',
  '那个……是什么？',
  '……',
  '呜？',
  '呀！',
]
const CHILD_EVENT_REACTIONS = [
  '大人们在说什么？',
  '我也想去看看！',
  '……听不太懂。',
  '发生什么事了？',
  '哇……',
  '好热闹呀。',
]
const TEENAGER_EVENT_REACTIONS = [
  '跟我有关吗？',
  '大人们又在搞什么名堂……',
  '……先听听吧。',
  '别把我当小孩。',
  '到底怎么回事？',
]
const YOUTH_EVENT_REACTIONS = [
  '这事跟我有关吗？',
  '得弄清楚怎么回事。',
  '……先听听吧。',
  '看来不简单。',
  '倒是有点意思。',
]
const ELDER_EVENT_REACTIONS = [
  '唉，又是风波……',
  '老了，看什么都得多想一层。',
  '这种事，我见过太多次了。',
  '但愿不要伤及无辜。',
]

function childEventReaction(char: Character, entry: NarrativeEntryType): string {
  if (char.traits.includes('开朗')) return pick(['哇，发生什么了？', '好热闹呀！', '我也想去！'])
  if (char.traits.includes('敏感')) return pick(['有点害怕……', '……不想听这些。', '呜……'])
  if (char.traits.includes('求知欲强')) return pick(['这是什么意思？', '我想弄明白。', '能告诉我吗？'])
  if (entry === 'player') return pick(['大人在忙什么？', '……听不懂。', '嗯？'])
  return pick(CHILD_EVENT_REACTIONS)
}

function teenagerEventReaction(char: Character, entry: NarrativeEntryType): string {
  if (char.traits.includes('进取心强')) return pick(['机会来了。', '不能错过。', '得抓紧。'])
  if (char.traits.includes('敏感')) return pick(['……还是先看看吧。', '有点不安。', '希望别出事。'])
  if (char.traits.includes('骄傲')) return pick(['哼，不过如此。', '正合我意。', '我倒要瞧瞧。'])
  if (entry === 'player') return pick(['有人在背后推动。', '这步棋什么意思？', '得想清楚。'])
  return pick(TEENAGER_EVENT_REACTIONS)
}

function youthEventReaction(char: Character, entry: NarrativeEntryType): string {
  if (char.traits.includes('进取心强')) return pick(['机会来了。', '不能错过。', '得抓紧。'])
  if (char.traits.includes('敏感')) return pick(['……还是先看看吧。', '有点不安。', '希望别出事。'])
  if (char.traits.includes('骄傲')) return pick(['哼，不过如此。', '正合我意。', '我倒要瞧瞧。'])
  if (entry === 'player') return pick(['有人在背后推动。', '这步棋什么意思？', '得想清楚。'])
  return pick(YOUTH_EVENT_REACTIONS)
}

type NarrativeEntryType = 'event' | 'player' | 'system'

function adultEventReaction(char: Character, entry: NarrativeEntryType): string {
  const traits = char.traits

  if (entry === 'player') {
    if (traits.includes('进取心强')) return pick(['机会来了……', '得抓紧这步棋。', '有人在背后推动。'])
    if (traits.includes('审慎') || traits.includes('戒心重')) return '这步太冒险，得再想想。'
    if (traits.includes('有同理心')) return '但愿不要伤及无辜。'
    if (traits.includes('骄傲')) return pick(['正合我意。', '哼，倒也有趣。'])
    if (traits.includes('机灵')) return '有意思，看看怎么借力。'
    return '有人在背后推动局面。'
  }

  if (traits.includes('进取心强')) {
    return pick(['机会来了，不能错过。', '得抓住眼前的时机。', '正是出手的好时候。'])
  }
  if (traits.includes('敏感') || traits.includes('低调')) return '……还是先观望吧。'
  if (traits.includes('骄傲')) {
    return pick(['不过如此。', '哼，正合我意。', '我倒要瞧瞧。'])
  }
  if (traits.includes('有同理心')) return '但愿乡邻不要受累。'
  if (traits.includes('抗压强')) return '事已至此，只能往前。'
  if (traits.includes('机灵')) return '这事没那么简单。'
  if (traits.includes('有原则')) return '但愿一切合乎礼数。'
  if (traits.includes('急性子')) return '还等什么？快行动！'
  if (traits.includes('求知欲强')) return '得把今日的事记入日记……'
  if (traits.includes('冷静')) return '正合我意。'
  if (traits.includes('重感情')) return '心里忽然有些乱。'

  return '乡绅圈里，风声越来越紧。'
}

/** 纪事事件触发的角色气泡反应，按年龄分段 */
export function buildEventReaction(char: Character, entryType: NarrativeEntryType): string {
  const group = getAgeGroup(char.age)

  switch (group) {
    case 'infant':
      return pick(INFANT_EVENT_REACTIONS)
    case 'toddler':
      return pick(TODDLER_EVENT_REACTIONS)
    case 'child':
      return childEventReaction(char, entryType)
    case 'teenager':
      return teenagerEventReaction(char, entryType)
    case 'youth':
      return youthEventReaction(char, entryType)
    case 'elder':
      if (Math.random() < 0.35) return pick(ELDER_EVENT_REACTIONS)
      return adultEventReaction(char, entryType)
    default:
      return adultEventReaction(char, entryType)
  }
}

/** 旁观者式随机反应，按年龄分段 */
export function buildWitnessReaction(char: Character): string {
  const group = getAgeGroup(char.age)

  if (group === 'infant') return pick(['（咿呀）', '……', '呜……'])
  if (group === 'toddler') return pick(['嗯？', '……', '那个是什么？'])
  if (group === 'child') {
    return pick([
      '大人们在说什么？',
      '好奇怪呀……',
      '我也想知道！',
      '……听不懂。',
    ])
  }
  if (group === 'teenager') {
    return pick([
      '跟我有关吗？',
      '大人们又在搞什么……',
      '得弄清楚怎么回事。',
      pick(['有些不安。', '倒也有趣。', '意料之中。']),
    ])
  }
  if (group === 'youth') {
    return pick([
      '这事跟我有关吗？',
      '得弄清楚怎么回事。',
      '怕是要传开了。',
      pick(['有些不安。', '倒也有趣。', '意料之中。']),
    ])
  }

  const lines = [
    `这跟${char.title}有何干系？`,
    '怕是要惊动乡绅圈了。',
    '且看看《泰晤士报》怎说。',
    pick(['有些不安。', '倒也有趣。', '意料之中。']),
  ]
  if (char.traits.includes('戒心重')) return '这里面必有蹊跷。'
  if (group === 'elder') return pick([...lines, '唉，又是风波……'])
  return pick(lines)
}
