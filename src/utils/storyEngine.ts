import type { Character, GameState, NarrativeEntry } from '../types/game'
import {
  getAgeGroup,
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
    if (parsed && getAgeGroup(char.age) !== getAgeGroup(newAge)) {
      avatar = makeAvatarId(parsed.gender, getAgeGroup(newAge), parsed.variant)
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

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function generateAmbientEvent(
  state: GameState,
  year: number,
  month: number,
): NarrativeEntry {
  const chars = Object.values(state.characters).filter((c) => c.isAlive)
  const focus = chars.find((c) => c.id === state.selectedCharacterId) ?? pickRandom(chars)
  const other = pickRandom(chars.filter((c) => c.id !== focus.id))

  const templates = [
    `${focus.name}在领地内巡视，百姓纷纷驻足行礼。`,
    `${focus.name}与${other.name}在宫廷晚宴上目光交汇，气氛微妙。`,
    `边境传来驿报，${other.houseId === focus.houseId ? '家族' : '敌族'}使者求见。`,
    `${focus.name}独自在书房批阅文书，窗外春雨淅沥。`,
    `市集上传来消息：今年收成${Math.random() > 0.5 ? '颇丰' : '欠佳'}，民间议论纷纷。`,
  ]

  const entry: NarrativeEntry = {
    id: nextId(),
    year,
    month,
    type: 'event',
    text: pickRandom(templates),
    characterIds: [focus.id, other.id],
  }
  return enrichNarrativeEntry(entry, state.characters)
}

export function interveneAdvanceTime(state: GameState): {
  state: Partial<GameState>
  entry: NarrativeEntry
} {
  const { year, month } = advanceYear(state)
  const characters = ageAliveCharacters(state.characters)
  const entry = generateAmbientEvent(state, year, month)
  return { state: { year, month, characters }, entry }
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
      text: `【玩家干预】你暗中安排${char.name}参与一系列外交宴会。${char.name}的外交能力提升了，领地间的紧张气氛略有缓和。`,
      characterIds: [char.id],
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
        text: `【玩家干预】你试图为${char.name}安排联姻，但目前没有合适的对象。`,
        characterIds: [char.id],
      },
      state.characters,
    )
    return { state: {}, entry }
  }

  const updatedChar: Character = {
    ...char,
    relations: [
      ...char.relations,
      { targetId: partner.id, type: 'lover', label: '政治联姻对象' },
    ],
  }

  const entry = enrichNarrativeEntry(
    {
      id: nextId(),
      year: state.year,
      month: state.month,
      type: 'player',
      text: `【玩家干预】你撮合了${char.name}与${partner.name}的会面。双方家族开始秘密磋商联姻条款，流言已在贵族圈中蔓延。`,
      characterIds: [char.id, partner.id],
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
        text: `【玩家干预】你想挑起${char.name}的宿敌之争，但局势尚不明朗。`,
        characterIds: [char.id],
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
      text: `【玩家干预】你授意散布${char.name}与${rival.name}之间的诽谤信件。双方侍卫在边境酒馆发生斗殴，外交危机一触即发。`,
      characterIds: [char.id, rival.id],
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
    `【AI 推演 · ${formatDate(state.year, state.month)}】受你的意志驱使，${char.name}开始行动：${prompt}。这一举动在${house.name}内部引发震动，侍从们窃窃私语，而边境的暗流似乎也随之加速了。`,
    `【AI 推演 · ${formatDate(state.year, state.month)}】"${prompt}"——这一指令落入${char.name}耳中。数日后，城堡大厅传出消息：局势正朝着不可预测的方向演变。`,
    `【AI 推演 · ${formatDate(state.year, state.month)}】你写下旨意：${prompt}。${char.name}领命而去。月光下，${house.emblem} 家族的旗帜在城墙上静静飘扬，仿佛在等待命运的下一幕。`,
  ]

  const entry = enrichNarrativeEntry(
    {
      id: nextId(),
      year: state.year,
      month: state.month,
      type: 'player',
      text: pickRandom(responses),
      characterIds: [char.id],
    },
    state.characters,
  )
  return { state: {}, entry }
}
