import type {
  Character,
  NarrativeEntry,
  NarrativeEventKind,
} from '../types/game'
import { getSpeechAgeGroup, pick, pickSpeechLine } from './ageSpeech'
import { comparePersonalMeetingRelations } from './meetingRelations'

type ReactionRole = 'actor' | 'target' | 'child' | 'witness'

function getReactionRole(
  charId: string,
  entry: NarrativeEntry,
  characters: Record<string, Character>,
): ReactionRole {
  const { actorId, targetId } = entry.reactionContext ?? {}
  if (actorId && charId === actorId) return 'actor'
  if (targetId && charId === targetId) return 'target'

  const char = characters[charId]
  if (char && actorId && targetId) {
    if (
      char.parentIds.includes(actorId) ||
      char.parentIds.includes(targetId)
    ) {
      return 'child'
    }
  }
  return 'witness'
}

function withTraitFlavor(char: Character, lines: string[]): string {
  for (const trait of char.traits) {
    const flavored = TRAIT_FLAVOR[trait]
    if (flavored?.length && Math.random() < 0.35) {
      return pick(flavored)
    }
  }
  return pick(lines)
}

const TRAIT_FLAVOR: Record<string, string[]> = {
  重感情: ['心里忽然空了一块。', '往后想起今日，仍会鼻酸。', '话到嘴边，又咽了回去。'],
  骄傲: ['我绝不会让人看笑话。', '体面，比什么都重要。', '哼，我自有分寸。'],
  敏感: ['……先让我静一静。', '这消息来得太突然了。', '我有点喘不上气。'],
  冷静: ['嗯，知道了。', '意料之中。', '且观望后续。'],
  急性子: ['还等什么？快有个了断！', '拖下去只会更难看。', '今日就要说清楚。'],
  审慎: ['得把每个细节都记清楚。', '这一步须三思。', '容我再想想后果。'],
  有同理心: ['但愿旁人不要受累。', '最苦的还是无辜的人。', '大家都要保重。'],
}

// ── 离婚：协议 ──────────────────────────────────────────

const AMICABLE_ACTOR = [
  '往后各走各路，望你安好。',
  '能平静结束，已是最好的结果。',
  '这段路走到这里，我不怨你。',
  '好聚好散，各生欢喜。',
  '手续办完了，我们仍是朋友。',
]
const AMICABLE_TARGET = [
  '好，就这样吧。',
  '愿你日后顺心。',
  '不必再提了，各自珍重。',
  '嗯，我接受。',
  '往后还请你多关照。',
]
const AMICABLE_CHILD = {
  infant: ['（咿呀）', '呜……', '……'],
  toddler: ['嗯？', '……', '爹/娘？'],
  child: ['……你们还是分开了。', '我会乖乖的。', '以后我跟谁住？'],
  youth: ['我明白你们的决定。', '……我会适应的。', '别为我吵架就好。'],
  adult: ['各自安好，我尊重你们的决定。', '往后我会常回来看你们。', '家变了，但你们仍是我的父母。'],
}
const AMICABLE_WITNESS = [
  '总算没闹到不可收拾。',
  '体面分手，也算难得。',
  '乡绅圈里会怎么说，难料。',
]

// ── 离婚：法庭 ──────────────────────────────────────────

const LEGAL_ACTOR = [
  '法庭见便见，我不会退让。',
  '该争的我一样都不会让。',
  '到此为止，往后莫要再来烦我。',
  '判决下来之前，我无话可说。',
  '这官司，我奉陪到底。',
]
const LEGAL_TARGET = [
  '您会为此后悔的。',
  '这场官司，我奉陪到底。',
  '休想让我签字让步。',
  '律师会处理一切，您请便。',
  '我们法庭上见真章。',
]
const LEGAL_CHILD = {
  infant: ['（哭）', '呜……', '……'],
  toddler: ['怕……', '……', '别吵……'],
  child: ['别当着面吵了……', '我不想听这些。', '为什么要闹上法庭？'],
  youth: ['你们非要走到这一步吗？', '我谁都不想选……', '能不能别把我卷进去？'],
  adult: ['家丑不可外扬，你们却偏要闹大。', '判决下来之前，我哪里都不去。', '我受够了这种场面。'],
}
const LEGAL_WITNESS = [
  '这官司怕是要登报了。',
  '两家颜面尽失。',
  '《泰晤士报》又有题材了。',
]

// ── 推进时间 · 日常纪事 ─────────────────────────────────

const AMBIENT_ACTOR = [
  '今日倒是颇为周折。',
  '且看看事态如何演变。',
  '这一趟不算白走。',
  '回府后再细细思量。',
  '得把今日的事记入日记。',
]
const AMBIENT_TARGET = [
  '您找我有何要事？',
  '今日偶遇，倒是巧了。',
  '改日再叙？',
  '嗯，我记下了。',
  '回见。',
]
const AMBIENT_WITNESS = [
  '今日风闻不少。',
  '庄园里又起波澜了。',
  '且看看后续如何。',
]

// ── 会晤 ────────────────────────────────────────────────

const MEETING_START_SAME = [
  '幸会，请坐。',
  '今日人齐了，有话但说无妨。',
  '茶已备好，请。',
]
const MEETING_START_CROSS = [
  '两家同席，礼数不可废。',
  '今日会面，望能开诚布公。',
  '邻领到访，务必以礼相待。',
]
const MEETING_END_SAME = [
  '今日叨扰，改日再叙。',
  '话已说完，我先告退。',
  '后会有期。',
]
const MEETING_END_CROSS = [
  '依礼告别，望两家安好。',
  '车马已备，就此别过。',
  '今日会谈，各自思量。',
]

const MEETING_END_IMPROVED = [
  '还想再见到你。',
  '今天聊得很开心，改日再聚。',
  '后会有期，期待下次见面。',
  '难得谈得这么投机，别让我等太久。',
  '走之前，我想再说声——很高兴今天来了。',
]
const MEETING_END_WORSEENED = [
  '下次不想再见了。',
  '今日到此为止，告辞。',
  '不必相送了，我先走。',
  '话已说尽，往后各走各路吧。',
  '今日这一面，够了。',
]
const MEETING_END_UNCHANGED = [
  '那就先这样，回见。',
  '今日先告退，改日再联系。',
  '话已说完，我先走了。',
]

// ── 求婚 ────────────────────────────────────────────────

const PROPOSE_ACTOR = [
  '您答应了……我此生无憾。',
  '婚约既成，我定不负您。',
  '方才那番话，我是认真的。',
]
const PROPOSE_TARGET = [
  '我……愿意。',
  '好，我答应您。',
  '从今往后，请多关照。',
]

// ── 生育 ────────────────────────────────────────────────

const REPRODUCTION_PARENT = [
  '是个健康的孩子，感谢上帝。',
  '家族又添新丁了。',
  '得给孩子起个好名字。',
]
const REPRODUCTION_WITNESS = [
  '恭喜恭喜！',
  '庄园里又要添喜事了。',
  '这孩子生得端正。',
]

// ── 玩家干预 ────────────────────────────────────────────

const INTERVENTION_DIPLOMACY = [
  '有人在背后推动局面。',
  '这步棋什么意思？',
  '外交场上，须步步为营。',
]
const INTERVENTION_MARRIAGE = [
  '政治婚约？得从长计议。',
  '两家结亲，未必是坏事。',
  '这消息传得真快。',
]
const INTERVENTION_RIVALRY = [
  '风声不对，得小心。',
  '怕是要生变故了。',
  '这步太险，恐引火烧身。',
]
const INTERVENTION_CUSTOM = [
  '局势正朝着不可预测的方向走。',
  '下一幕会是什么？',
  '得看清楚再行动。',
]

function buildDivorceReaction(
  char: Character,
  entry: NarrativeEntry,
  characters: Record<string, Character>,
  kind: 'amicable' | 'legal',
): string {
  const role = getReactionRole(char.id, entry, characters)
  const amicable = kind === 'amicable'

  if (role === 'child') {
    const pools = amicable ? AMICABLE_CHILD : LEGAL_CHILD
    return pickSpeechLine(char, pools, pools.adult ?? ['……'])
  }

  if (role === 'actor') {
    return withTraitFlavor(char, amicable ? AMICABLE_ACTOR : LEGAL_ACTOR)
  }

  if (role === 'target') {
    const lines = amicable ? AMICABLE_TARGET : LEGAL_TARGET
    if (char.traits.includes('骄傲') && !amicable) {
      return pick(['休想让我低头。', '这屈辱，我记下了。', ...lines])
    }
    if (char.traits.includes('重感情') && amicable) {
      return pick(['往后仍会想起你。', '愿你找到更好的归宿。', ...lines])
    }
    return withTraitFlavor(char, lines)
  }

  return pick(amicable ? AMICABLE_WITNESS : LEGAL_WITNESS)
}

function buildAmbientReaction(
  char: Character,
  entry: NarrativeEntry,
  characters: Record<string, Character>,
): string {
  const role = getReactionRole(char.id, entry, characters)
  const group = getSpeechAgeGroup(char.age)

  if (group === 'infant' || group === 'toddler') {
    return pick(['（咿呀）', '嗯？', '……'])
  }
  if (group === 'child') {
    return pick(['大人们在忙什么？', '发生什么事了？', '我也想去看看！'])
  }
  if (group === 'teenager') {
    return pick(['跟我有关吗？', '大人们又在忙什么……', '到底怎么回事？'])
  }

  if (role === 'actor') {
    if (char.traits.includes('进取心强')) {
      return pick(['得抓住今日的机会。', '时机正好，不可错过。', ...AMBIENT_ACTOR])
    }
    return withTraitFlavor(char, AMBIENT_ACTOR)
  }
  if (role === 'target') {
    if (char.traits.includes('骄傲')) {
      return pick(['哼，倒也有趣。', '不过如此。', ...AMBIENT_TARGET])
    }
    return withTraitFlavor(char, AMBIENT_TARGET)
  }
  return pick(AMBIENT_WITNESS)
}

function buildMeetingReaction(
  char: Character,
  entry: NarrativeEntry,
  phase: 'start' | 'end',
  characters: Record<string, Character>,
): string {
  const crossHouse = entry.reactionContext?.crossHouse ?? false
  const group = getSpeechAgeGroup(char.age)

  if (group === 'infant' || group === 'toddler' || group === 'child') {
    return pick(['……', '大人们在说什么？', '好正式呀。'])
  }
  if (group === 'teenager') {
    return pick(['……', '大人们又在搞什么名堂？', '好正式呀。'])
  }

  if (phase === 'start') {
    const pool = crossHouse ? MEETING_START_CROSS : MEETING_START_SAME
    if (char.traits.includes('戒心重') && crossHouse) {
      return pick(['今日会面，须防有诈。', '礼数到了即可，莫多言。', ...pool])
    }
    return withTraitFlavor(char, pool)
  }

  const initialRelations = entry.reactionContext?.meetingInitialRelations ?? {}
  const initialBonds = entry.reactionContext?.meetingInitialBonds ?? {}
  const participantIds = entry.characterIds ?? []
  let outcome = entry.reactionContext?.meetingOutcome ?? 'unchanged'

  if (participantIds.length > 0) {
    outcome = comparePersonalMeetingRelations(
      char.id,
      participantIds,
      initialRelations,
      initialBonds,
      characters,
    )
  }

  if (outcome === 'improved') {
    if (char.traits.includes('重感情')) {
      return pick(['今天真是难忘。', '我会记住这一面的。', ...MEETING_END_IMPROVED])
    }
    if (char.traits.includes('开朗')) {
      return pick(['太开心了，下次还要来！', ...MEETING_END_IMPROVED])
    }
    return withTraitFlavor(char, MEETING_END_IMPROVED)
  }

  if (outcome === 'worsened') {
    if (char.traits.includes('骄傲')) {
      return pick(['今日之辱，我记下了。', '休想我再踏足一步。', ...MEETING_END_WORSEENED])
    }
    if (char.traits.includes('冷静')) {
      return pick(['不必多言，告辞。', '今日够了。', ...MEETING_END_WORSEENED])
    }
    return withTraitFlavor(char, MEETING_END_WORSEENED)
  }

  const pool = crossHouse ? MEETING_END_CROSS : [...MEETING_END_SAME, ...MEETING_END_UNCHANGED]
  return withTraitFlavor(char, pool)
}

function buildProposeReaction(
  char: Character,
  entry: NarrativeEntry,
  characters: Record<string, Character>,
): string {
  const role = getReactionRole(char.id, entry, characters)
  const group = getSpeechAgeGroup(char.age)

  if (group === 'infant' || group === 'toddler' || group === 'child') {
    return pick(['……大人们在说什么？', '我不懂……'])
  }

  if (role === 'actor') {
    return withTraitFlavor(char, PROPOSE_ACTOR)
  }
  if (role === 'target') {
    if (char.traits.includes('敏感')) {
      return pick(['我……心跳好快。', '您真的愿意？', ...PROPOSE_TARGET])
    }
    return withTraitFlavor(char, PROPOSE_TARGET)
  }
  return pick(['恭喜！', '真是喜讯。'])
}

function buildReproductionReaction(
  char: Character,
  entry: NarrativeEntry,
): string {
  const { actorId, targetId } = entry.reactionContext ?? {}
  const isParent =
    char.id === actorId ||
    char.id === targetId ||
    (actorId &&
      targetId &&
      char.parentIds.includes(actorId) &&
      char.parentIds.includes(targetId))

  const group = getSpeechAgeGroup(char.age)
  if (group === 'infant') return pick(['（咿呀）', '呜……'])
  if (group === 'toddler') return pick(['嗯？', '……'])
  if (group === 'child') {
    return pick(['我有弟弟妹妹了？', '哇，好小！', '……这是谁？'])
  }

  if (isParent) {
    return withTraitFlavor(char, REPRODUCTION_PARENT)
  }
  return pick(REPRODUCTION_WITNESS)
}

function buildInterventionReaction(
  char: Character,
  pool: string[],
): string {
  const group = getSpeechAgeGroup(char.age)
  if (group === 'infant' || group === 'toddler') {
    return pick(['（咿呀）', '……'])
  }
  if (group === 'child') {
    return pick(['大人在忙什么？', '……听不懂。'])
  }
  if (group === 'teenager') {
    return pick(['又有人要插手了……', '跟我有关吗？', '……先看看吧。'])
  }
  return withTraitFlavor(char, pool)
}

const KIND_BUILDERS: Partial<
  Record<
    NarrativeEventKind,
    (
      char: Character,
      entry: NarrativeEntry,
      characters: Record<string, Character>,
    ) => string
  >
> = {
  divorce_amicable: (char, entry, chars) =>
    buildDivorceReaction(char, entry, chars, 'amicable'),
  divorce_legal: (char, entry, chars) =>
    buildDivorceReaction(char, entry, chars, 'legal'),
  ambient: buildAmbientReaction,
  meeting_start: (char, entry, chars) =>
    buildMeetingReaction(char, entry, 'start', chars),
  meeting_end: (char, entry, chars) =>
    buildMeetingReaction(char, entry, 'end', chars),
  marriage_propose: buildProposeReaction,
  reproduction: (char, entry) => buildReproductionReaction(char, entry),
  intervention_diplomacy: (char) =>
    buildInterventionReaction(char, INTERVENTION_DIPLOMACY),
  intervention_marriage: (char) =>
    buildInterventionReaction(char, INTERVENTION_MARRIAGE),
  intervention_rivalry: (char) =>
    buildInterventionReaction(char, INTERVENTION_RIVALRY),
  intervention_custom: (char) =>
    buildInterventionReaction(char, INTERVENTION_CUSTOM),
}

/** 按 eventKind 生成情境化气泡；无匹配时返回 null，由调用方回退通用逻辑 */
export function buildEventKindReaction(
  char: Character,
  entry: NarrativeEntry,
  characters: Record<string, Character>,
): string | null {
  if (!entry.eventKind || entry.eventKind === 'story_preset') return null

  const builder = KIND_BUILDERS[entry.eventKind]
  if (!builder) return null

  return builder(char, entry, characters)
}
