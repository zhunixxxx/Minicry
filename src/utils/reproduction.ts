import type {
  Character,
  CreateCharacterInput,
  GameState,
  Gender,
  NarrativeEntry,
} from '../types/game'
import type { InteractionContext } from '../types/interactions'
import { getAgeGroup, getAvatarOptions } from './avatars'
import {
  applyNewCharacter,
  DEFAULT_ATTRIBUTES,
  formatCharacterName,
} from './createCharacter'
import { isOppositeGender } from './gender'
import { isRomanticPartner } from './romance'
import { canRomanticInteract } from '../interactions/utils'

export interface ReproductionDraft {
  actorId: string
  targetId: string
  fatherId: string
  motherId: string
  childGender: Gender
  inheritedTraits: string[]
  fatherSurname: string
  motherSurname: string
  fatherHouseId: string
  motherHouseId: string
  fatherName: string
  motherName: string
}

export function getCharacterSurname(char: Character): string {
  if (char.surname) return char.surname
  const parts = char.name.split('·')
  return parts.length > 1 ? parts[parts.length - 1] : ''
}

function pickRandom<T>(arr: T[]): T | undefined {
  if (arr.length === 0) return undefined
  return arr[Math.floor(Math.random() * arr.length)]
}

export function rollChildGender(): Gender {
  return Math.random() < 0.5 ? 'male' : 'female'
}

export function inheritTraits(
  father: Character,
  mother: Character,
): string[] {
  const traits: string[] = []
  const fromFather = pickRandom(father.traits)
  const fromMother = pickRandom(mother.traits)
  if (fromFather) traits.push(fromFather)
  if (fromMother && fromMother !== fromFather) traits.push(fromMother)
  return traits
}

export function resolveParents(
  a: Character,
  b: Character,
): { father: Character; mother: Character } | null {
  if (a.gender === 'male' && b.gender === 'female') {
    return { father: a, mother: b }
  }
  if (a.gender === 'female' && b.gender === 'male') {
    return { father: b, mother: a }
  }
  return null
}

export function canReproduce(
  ctx: InteractionContext,
  state: GameState,
): boolean {
  if (!canRomanticInteract(ctx, state)) return false
  const actor = state.characters[ctx.actorId]
  const target = state.characters[ctx.targetId]
  if (!actor || !target) return false
  if (!actor.isAlive || !target.isAlive) return false
  if (!isOppositeGender(actor, target)) return false
  if (!isRomanticPartner(ctx.actorId, ctx.targetId, state.characters)) {
    return false
  }
  if (getAgeGroup(actor.age) === 'child' || getAgeGroup(target.age) === 'child') {
    return false
  }
  return resolveParents(actor, target) !== null
}

export function reproduceDisabledReason(
  ctx: InteractionContext,
  state: GameState,
): string {
  const actor = state.characters[ctx.actorId]
  const target = state.characters[ctx.targetId]
  if (!actor || !target) return '角色不存在'
  if (ctx.actorId === ctx.targetId) return '无法对自己发起互动'
  if (!isOppositeGender(actor, target)) return '传宗接代仅限异性伴侣'
  if (!isRomanticPartner(ctx.actorId, ctx.targetId, state.characters)) {
    return '双方须为恋人或配偶'
  }
  if (!actor.isAlive) return '发起者已不在世'
  if (!target.isAlive) return '目标已不在世'
  if (getAgeGroup(actor.age) === 'child' || getAgeGroup(target.age) === 'child') {
    return '年幼者无法生育'
  }
  if (!canRomanticInteract(ctx, state)) return '当前情境下无法生育'
  return '暂时无法执行'
}

export function prepareReproductionDraft(
  ctx: InteractionContext,
  state: GameState,
): ReproductionDraft | null {
  if (!canReproduce(ctx, state)) return null

  const actor = state.characters[ctx.actorId]
  const target = state.characters[ctx.targetId]
  if (!actor || !target) return null

  const parents = resolveParents(actor, target)
  if (!parents) return null

  const { father, mother } = parents
  const childGender = rollChildGender()

  return {
    actorId: ctx.actorId,
    targetId: ctx.targetId,
    fatherId: father.id,
    motherId: mother.id,
    childGender,
    inheritedTraits: inheritTraits(father, mother),
    fatherSurname: getCharacterSurname(father),
    motherSurname: getCharacterSurname(mother),
    fatherHouseId: father.houseId,
    motherHouseId: mother.houseId,
    fatherName: father.name,
    motherName: mother.name,
  }
}

export function surnameForHouse(
  draft: ReproductionDraft,
  houseId: string,
): string {
  if (houseId === draft.fatherHouseId) return draft.fatherSurname
  if (houseId === draft.motherHouseId) return draft.motherSurname
  return ''
}

export interface ReproductionConfirmInput {
  givenName: string
  surname: string
  houseId: string
}

export function buildReproductionCharacterInput(
  draft: ReproductionDraft,
  confirm: ReproductionConfirmInput,
): CreateCharacterInput {
  const age = 0
  const gender = draft.childGender
  return {
    surname: confirm.surname.trim(),
    givenName: confirm.givenName.trim(),
    nickname: '',
    age,
    gender,
    title: '新生儿',
    houseId: confirm.houseId,
    avatar: getAvatarOptions(gender, age)[0],
    traits: [...draft.inheritedTraits],
    preferences: [],
    bio: '刚刚降生，人生尚未展开。',
    parentIds: [draft.fatherId, draft.motherId],
    spouseId: '',
    attributes: { ...DEFAULT_ATTRIBUTES },
  }
}

export function applyReproduction(
  state: GameState,
  draft: ReproductionDraft,
  confirm: ReproductionConfirmInput,
): { state: Partial<GameState>; entry: NarrativeEntry } {
  const input = buildReproductionCharacterInput(draft, confirm)
  const result = applyNewCharacter(state, input)
  const newCharId = Object.keys(result.state.characters ?? {}).find(
    (id) => !state.characters[id],
  )
  const house = state.houses[input.houseId]
  const childName = formatCharacterName(input.givenName, input.surname)
  const traitText =
    input.traits.length > 0 ? `继承了${input.traits.join('、')}。` : ''

  return {
    state: result.state,
    entry: {
      id: `n-reproduce-${newCharId ?? Date.now()}`,
      year: state.year,
      month: state.month,
      type: 'player',
      text: `【浪漫】${childName}降生人世，为${draft.fatherName}与${draft.motherName}之${input.gender === 'male' ? '子' : '女'}，入籍${house?.name ?? '家族'}。${traitText}`,
      characterIds: result.entry.characterIds,
    },
  }
}
