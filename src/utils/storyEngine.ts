import type { Character, GameState, NarrativeEntry } from '../types/game'
import { getAnnualDeathProbability, getAvatarVisualGroup } from './ageGroups'
import {
  isGeneratedAvatar,
  makeAvatarId,
  parseAvatarId,
} from './avatars'
import { enrichNarrativeEntry } from './eventReactions'
import { formatDate } from './familyTree'

let entryCounter = 100

function nextId(): string {
  return `n-${++entryCounter}`
}

function advanceYear(state: GameState): { year: number; month: number } {
  return { year: state.year + 1, month: state.month }
}

function ageCharacter(char: Character): Character {
  const newAge = char.age + 1
  let { avatar } = char

  if (isGeneratedAvatar(avatar)) {
    const parsed = parseAvatarId(avatar)
    if (parsed && getAvatarVisualGroup(char.age) !== getAvatarVisualGroup(newAge)) {
      avatar = makeAvatarId(parsed.gender, getAvatarVisualGroup(newAge), parsed.variant)
    }
  }

  return { ...char, age: newAge, avatar }
}

function ageAliveCharacters(
  characters: Record<string, Character>,
): Record<string, Character> {
  const updated: Record<string, Character> = {}
  for (const [id, char] of Object.entries(characters)) {
    if (char.isAlive) {
      updated[id] = ageCharacter(char)
    }
  }
  return updated
}

function applyNaturalDeaths(
  characters: Record<string, Character>,
): { characters: Record<string, Character>; deaths: Character[] } {
  const updated = { ...characters }
  const deaths: Character[] = []

  for (const [id, char] of Object.entries(updated)) {
    if (!char.isAlive) continue
    const probability = getAnnualDeathProbability(char.age)
    if (probability > 0 && Math.random() < probability) {
      const deceased = { ...char, isAlive: false }
      updated[id] = deceased
      deaths.push(deceased)
    }
  }

  return { characters: updated, deaths }
}

function buildDeathEntry(char: Character, year: number, month: number): NarrativeEntry {
  const templates = [
    `${char.name}（${char.age}岁）在${char.title}任上溘然长逝，家族上下为之震动。`,
    `${char.name}于本年辞世，享年${char.age}岁。`,
    `噩耗传来：${char.name}（${char.age}岁）已与世长辞。`,
  ]
  return {
    id: nextId(),
    year,
    month,
    type: 'system',
    text: pickRandom(templates),
    characterIds: [char.id],
  }
}


function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/** 推进时间时的随机纪事优先选用能参与社交场合的角色 */
function pickEventCharacters(state: GameState): {
  focus: Character
  other: Character
} | null {
  const alive = Object.values(state.characters).filter((c) => c.isAlive)
  if (alive.length < 2) return null

  const socialPool = alive.filter((c) => c.age >= 13)
  const pool = socialPool.length >= 2 ? socialPool : alive.filter((c) => c.age >= 6)
  const eventPool = pool.length >= 2 ? pool : alive

  const focus =
    eventPool.find((c) => c.id === state.selectedCharacterId) ??
    pickRandom(eventPool)
  const rest = eventPool.filter((c) => c.id !== focus.id)
  const other = pickRandom(rest.length > 0 ? rest : alive.filter((c) => c.id !== focus.id))

  return { focus, other }
}

function generateAmbientEvent(
  state: GameState,
  year: number,
  month: number,
): NarrativeEntry {
  const picked = pickEventCharacters(state)
  if (!picked) {
    const entry: NarrativeEntry = {
      id: nextId(),
      year,
      month,
      type: 'event',
      text: '这一年风平浪静，庄园里未见什么大事。',
      characterIds: [],
    }
    return entry
  }
  const { focus, other } = picked

  const templates = [
    `${focus.name}巡视庄园领地，佃户纷纷脱帽致意。`,
    `${focus.name}与${other.name}在郡宴上目光交汇，席间气氛微妙。`,
    `暮光河畔传来消息，${other.houseId === focus.houseId ? '本族' : '邻领'}派人请求会面。`,
    `${focus.name}独自在书房批阅地契，窗外春雨淅沥。`,
    `地方上传来消息：今年麦收${Math.random() > 0.5 ? '颇丰' : '平平'}，乡绅议论纷纷。`,
    `${focus.name}收到一封盖着伦敦邮戳的信，拆阅后神色凝重。`,
    `铁路公司的代表到访庄园，${focus.name}与${other.name}在客厅里商谈征地事宜。`,
    `狩猎季将近，${focus.name}命人整备马厩，庄园上下忙碌起来。`,
    `教堂钟声响起，${focus.name}乘车赴周日礼拜，途中与${other.name}的马车擦肩而过。`,
  ]

  const entry: NarrativeEntry = {
    id: nextId(),
    year,
    month,
    type: 'event',
    text: pickRandom(templates),
    characterIds: [focus.id, other.id],
    eventKind: 'ambient',
    reactionContext: { actorId: focus.id, targetId: other.id },
  }
  return enrichNarrativeEntry(entry, state.characters)
}

export function interveneAdvanceTime(state: GameState): {
  state: Partial<GameState>
  entry: NarrativeEntry
  extraEntries?: NarrativeEntry[]
} {
  const { year, month } = advanceYear(state)
  const aged = ageAliveCharacters(state.characters)
  const { characters, deaths } = applyNaturalDeaths(aged)
  const nextState = { ...state, year, month, characters }
  const entry = generateAmbientEvent(nextState, year, month)
  const extraEntries = deaths.map((char) => buildDeathEntry(char, year, month))
  return {
    state: { year, month, characters },
    entry,
    extraEntries: extraEntries.length > 0 ? extraEntries : undefined,
  }
}

export function interveneBoostDiplomacy(
  state: GameState,
): { state: Partial<GameState>; entry: NarrativeEntry } {
  const char = state.characters[state.selectedCharacterId]
  const updated = {
    ...char,
    attributes: { ...char.attributes, diplomacy: Math.min(20, char.attributes.diplomacy + 2) },
  }

  const entry = enrichNarrativeEntry(
    {
      id: nextId(),
      year: state.year,
      month: state.month,
      type: 'player',
      text: `【玩家干预】你安排${char.name}参与一系列公关活动。${char.name}的公关能力提升了，两族之间的紧张气氛略有缓和。`,
      characterIds: [char.id],
      eventKind: 'intervention_diplomacy',
      reactionContext: { actorId: char.id },
    },
    state.characters,
  )
  return {
    state: {
      characters: { ...state.characters, [char.id]: updated },
    },
    entry,
  }
}

export function interveneArrangeMarriage(
  state: GameState,
): { state: Partial<GameState>; entry: NarrativeEntry } {
  const char = state.characters[state.selectedCharacterId]
  const candidates = Object.values(state.characters).filter(
    (c) =>
      c.id !== char.id &&
      c.isAlive &&
      c.spouseIds.length === 0 &&
      c.houseId !== char.houseId,
  )
  const partner = candidates[0]

  if (!partner) {
    const entry = enrichNarrativeEntry(
      {
        id: nextId(),
        year: state.year,
        month: state.month,
        type: 'player',
        text: `【玩家干预】你试图为${char.name}撮合婚约，但目前没有合适的对象。`,
        characterIds: [char.id],
        eventKind: 'intervention_marriage',
        reactionContext: { actorId: char.id },
      },
      state.characters,
    )
    return { state: {}, entry }
  }

  const updatedChar: Character = {
    ...char,
    relations: [
      ...char.relations,
      { targetId: partner.id, type: 'lover', label: '政治婚约对象' },
    ],
  }

  const entry = enrichNarrativeEntry(
    {
      id: nextId(),
      year: state.year,
      month: state.month,
      type: 'player',
      text: `【玩家干预】你撮合了${char.name}与${partner.name}的会面。双方家族开始秘密磋商婚约条款，消息已在社交圈流传。`,
      characterIds: [char.id, partner.id],
      eventKind: 'intervention_marriage',
      reactionContext: { actorId: char.id, targetId: partner.id },
    },
    state.characters,
  )
  return {
    state: {
      characters: { ...state.characters, [char.id]: updatedChar },
    },
    entry,
  }
}

export function interveneSparkRivalry(
  state: GameState,
): { state: Partial<GameState>; entry: NarrativeEntry } {
  const char = state.characters[state.selectedCharacterId]
  const rivals = Object.values(state.characters).filter(
    (c) => c.id !== char.id && c.houseId !== char.houseId && c.isAlive,
  )
  const rival = rivals[0]

  if (!rival) {
    const entry = enrichNarrativeEntry(
      {
        id: nextId(),
        year: state.year,
        month: state.month,
        type: 'player',
        text: `【玩家干预】你想挑起${char.name}与政敌的争端，但局势尚不明朗。`,
        characterIds: [char.id],
        eventKind: 'intervention_rivalry',
        reactionContext: { actorId: char.id },
      },
      state.characters,
    )
    return { state: {}, entry }
  }

  const entry = enrichNarrativeEntry(
    {
      id: nextId(),
      year: state.year,
      month: state.month,
      type: 'player',
      text: `【玩家干预】你授意散布${char.name}与${rival.name}之间的负面消息。双方随行人员在边境发生肢体冲突，外交危机一触即发。`,
      characterIds: [char.id, rival.id],
      eventKind: 'intervention_rivalry',
      reactionContext: { actorId: char.id, targetId: rival.id },
    },
    state.characters,
  )
  return { state: {}, entry }
}

export function interveneCustomStory(
  state: GameState,
  prompt: string,
): { state: Partial<GameState>; entry: NarrativeEntry } {
  const char = state.characters[state.selectedCharacterId]
  const house = state.houses[char.houseId]

  const responses = [
    `【AI 推演 · ${formatDate(state.year, state.month)}】按照你的安排，${char.name}开始行动：${prompt}。这一举动在${house.name}内部引发震动，管家与家臣议论纷纷，邻领局势似乎也随之升温。`,
    `【AI 推演 · ${formatDate(state.year, state.month)}】"${prompt}"——${char.name}收到指令。数日后，庄园传出消息：局势正朝着不可预测的方向演变。`,
    `【AI 推演 · ${formatDate(state.year, state.month)}】你发出指令：${prompt}。${char.name}随即着手安排。${house.emblem} ${house.name}的纹章在庄园门廊上熠熠生辉，下一幕尚未揭晓。`,
  ]

  const entry = enrichNarrativeEntry(
    {
      id: nextId(),
      year: state.year,
      month: state.month,
      type: 'player',
      text: pickRandom(responses),
      characterIds: [char.id],
      eventKind: 'intervention_custom',
      reactionContext: { actorId: char.id },
    },
    state.characters,
  )
  return { state: {}, entry }
}
