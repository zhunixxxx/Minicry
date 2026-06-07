import type {
  Character,
  CreateCharacterInput,
  GameState,
  NarrativeEntry,
  Relation,
} from '../types/game'

function nextCharId(characters: Record<string, Character>): string {
  const prefix = 'char-new-'
  let max = 0
  for (const id of Object.keys(characters)) {
    if (!id.startsWith(prefix)) continue
    const n = parseInt(id.slice(prefix.length), 10)
    if (!Number.isNaN(n) && n > max) max = n
  }
  return `${prefix}${max + 1}`
}

function parseList(text: string): string[] {
  return text
    .split(/[,，、]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export function parseTraitsInput(text: string): string[] {
  return parseList(text)
}

export function parsePreferencesInput(text: string): string[] {
  return parseList(text)
}

function addRelation(
  relations: Relation[],
  targetId: string,
  type: Relation['type'],
  label?: string,
): Relation[] {
  if (relations.some((r) => r.targetId === targetId && r.type === type)) {
    return relations
  }
  return [...relations, { targetId, type, label }]
}

function childLabel(gender: Character['gender']): string {
  return gender === 'male' ? '儿子' : '女儿'
}

export function formatCharacterName(
  givenName: string,
  surname: string,
): string {
  const given = givenName.trim()
  const sur = surname.trim()
  if (given && sur) return `${given}·${sur}`
  return given || sur
}

export function buildCharacterFromInput(
  input: CreateCharacterInput,
  existingCharacters: Record<string, Character>,
): Character {
  const id = nextCharId(existingCharacters)
  const relations: Relation[] = []
  const givenName = input.givenName.trim()
  const surname = input.surname.trim()
  const nickname = input.nickname.trim()

  for (const parentId of input.parentIds) {
    relations.push({ targetId: parentId, type: 'parent', label: '父母' })
  }

  if (input.spouseId) {
    relations.push({ targetId: input.spouseId, type: 'spouse', label: '配偶' })
  }

  return {
    id,
    name: formatCharacterName(givenName, surname),
    givenName,
    surname,
    nickname: nickname || undefined,
    age: input.age,
    gender: input.gender,
    title: input.title.trim() || '族人',
    houseId: input.houseId,
    avatar: input.avatar.trim() || '👤',
    traits: input.traits,
    preferences: input.preferences,
    relations,
    parentIds: [...input.parentIds],
    spouseIds: input.spouseId ? [input.spouseId] : [],
    isAlive: true,
    attributes: { ...input.attributes },
    bio: input.bio.trim() || '此人刚刚踏入谱系，生平尚待书写。',
  }
}

export function applyNewCharacter(
  state: GameState,
  input: CreateCharacterInput,
): { state: Partial<GameState>; entry: NarrativeEntry } {
  const character = buildCharacterFromInput(input, state.characters)
  const updatedCharacters: Record<string, Character> = {
    ...state.characters,
    [character.id]: character,
  }

  for (const parentId of character.parentIds) {
    const parent = updatedCharacters[parentId]
    if (!parent) continue
    updatedCharacters[parentId] = {
      ...parent,
      relations: addRelation(
        parent.relations,
        character.id,
        'child',
        childLabel(character.gender),
      ),
    }
  }

  if (character.spouseIds[0]) {
    const spouseId = character.spouseIds[0]
    const spouse = updatedCharacters[spouseId]
    if (spouse) {
      updatedCharacters[spouseId] = {
        ...spouse,
        spouseIds: spouse.spouseIds.includes(character.id)
          ? spouse.spouseIds
          : [...spouse.spouseIds, character.id],
        relations: addRelation(spouse.relations, character.id, 'spouse', '配偶'),
      }
    }
  }

  const house = state.houses[character.houseId]
  const relationParts: string[] = []

  if (character.parentIds.length > 0) {
    const parentNames = character.parentIds
      .map((id) => updatedCharacters[id]?.name)
      .filter(Boolean)
      .join('与')
    relationParts.push(`系${parentNames}之后`)
  }

  if (character.spouseIds[0]) {
    const spouseName = updatedCharacters[character.spouseIds[0]]?.name
    if (spouseName) relationParts.push(`与${spouseName}结为连理`)
  }

  const relationText = relationParts.length > 0 ? `，${relationParts.join('，')}` : ''

  return {
    state: {
      characters: updatedCharacters,
      selectedCharacterId: character.id,
      treeFocusCharacterId: character.id,
      focusedHouseId: character.houseId,
    },
    entry: {
      id: `n-create-${character.id}`,
      year: state.year,
      month: state.month,
      type: 'system',
      text: `【谱系更新】${character.name}被记入${house?.name ?? '家族'}世系${relationText}。${character.traits[0] ? `世人初评其性${character.traits.join('、')}。` : ''}`,
      characterIds: [character.id, ...character.parentIds, ...character.spouseIds],
    },
  }
}

export const DEFAULT_ATTRIBUTES: Character['attributes'] = {
  diplomacy: 10,
  martial: 10,
  stewardship: 10,
  intrigue: 10,
  learning: 10,
}

export function togglePresetValue(list: string[], value: string): string[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value]
}

export function getParentOptions(
  characters: Record<string, Character>,
  houseId: string,
): Character[] {
  return Object.values(characters)
    .filter((c) => c.isAlive && c.houseId === houseId)
    .sort((a, b) => b.age - a.age)
}

export function getSpouseOptions(
  characters: Record<string, Character>,
  houseId: string,
  excludeIds: string[] = [],
): Character[] {
  const excluded = new Set(excludeIds)
  return Object.values(characters)
    .filter(
      (c) =>
        c.isAlive &&
        c.spouseIds.length === 0 &&
        !excluded.has(c.id),
    )
    .sort((a, b) => a.houseId === houseId ? -1 : b.houseId === houseId ? 1 : 0)
}
