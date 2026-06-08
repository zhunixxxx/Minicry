import type {
  Character,
  GameState,
  Gender,
  House,
  NarrativeEntry,
  Relation,
} from '../types/game'
import type { InteractionContext } from '../types/interactions'
import {
  canMarriageInteract,
  canRomanticInteract,
  marriageInteractDisabledReason,
  romanticInteractDisabledReason,
} from '../interactions/utils'
import { formatCharacterName } from './createCharacter'
import { getCharacterSurname, resolveParents } from './reproduction'

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

function removeRelations(
  relations: Relation[],
  targetId: string,
  types: Relation['type'][],
): Relation[] {
  return relations.filter(
    (r) => !(r.targetId === targetId && types.includes(r.type)),
  )
}

export function isEngagedTo(
  aId: string,
  bId: string,
  characters: Record<string, Character>,
): boolean {
  const a = characters[aId]
  const b = characters[bId]
  if (!a || !b) return false
  return (
    a.relations.some((r) => r.targetId === bId && r.type === 'engaged') &&
    b.relations.some((r) => r.targetId === aId && r.type === 'engaged')
  )
}

export function isMarriedTo(
  aId: string,
  bId: string,
  characters: Record<string, Character>,
): boolean {
  const a = characters[aId]
  const b = characters[bId]
  if (!a || !b) return false
  return a.spouseIds.includes(bId) && b.spouseIds.includes(aId)
}

function hasSpouse(char: Character): boolean {
  return char.spouseIds.length > 0
}

function hasOtherEngagement(
  char: Character,
  exceptId: string,
): boolean {
  return char.relations.some(
    (r) => r.type === 'engaged' && r.targetId !== exceptId,
  )
}

function bothAlive(ctx: InteractionContext, state: GameState): boolean {
  const actor = state.characters[ctx.actorId]
  const target = state.characters[ctx.targetId]
  return Boolean(actor?.isAlive && target?.isAlive)
}

export function canPropose(
  ctx: InteractionContext,
  state: GameState,
): boolean {
  if (!canRomanticInteract(ctx, state)) return false
  if (!bothAlive(ctx, state)) return false
  const actor = state.characters[ctx.actorId]
  const target = state.characters[ctx.targetId]
  if (!actor || !target) return false
  if (hasSpouse(actor) || hasSpouse(target)) return false
  if (isEngagedTo(ctx.actorId, ctx.targetId, state.characters)) return false
  if (
    hasOtherEngagement(actor, ctx.targetId) ||
    hasOtherEngagement(target, ctx.actorId)
  ) {
    return false
  }
  return true
}

export function proposeDisabledReason(
  ctx: InteractionContext,
  state: GameState,
): string {
  const actor = state.characters[ctx.actorId]
  const target = state.characters[ctx.targetId]
  if (!actor || !target) return '角色不存在'
  if (ctx.actorId === ctx.targetId) return '无法对自己发起互动'
  if (!canRomanticInteract(ctx, state)) {
    return romanticInteractDisabledReason(ctx, state)
  }
  if (!actor.isAlive) return '发起者已故'
  if (!target.isAlive) return '目标已故'
  if (hasSpouse(actor) || hasSpouse(target)) return '一方已有配偶'
  if (isEngagedTo(ctx.actorId, ctx.targetId, state.characters)) {
    return '双方已订婚'
  }
  if (hasOtherEngagement(actor, ctx.targetId)) {
    return `${actor.name}已有婚约`
  }
  if (hasOtherEngagement(target, ctx.actorId)) {
    return `${target.name}已有婚约`
  }
  return '暂时无法执行'
}

export function canMarry(
  ctx: InteractionContext,
  state: GameState,
): boolean {
  if (!canRomanticInteract(ctx, state)) return false
  if (!bothAlive(ctx, state)) return false
  const actor = state.characters[ctx.actorId]
  const target = state.characters[ctx.targetId]
  if (!actor || !target) return false
  if (hasSpouse(actor) || hasSpouse(target)) return false
  return isEngagedTo(ctx.actorId, ctx.targetId, state.characters)
}

export function marryDisabledReason(
  ctx: InteractionContext,
  state: GameState,
): string {
  const actor = state.characters[ctx.actorId]
  const target = state.characters[ctx.targetId]
  if (!actor || !target) return '角色不存在'
  if (ctx.actorId === ctx.targetId) return '无法对自己发起互动'
  if (!canRomanticInteract(ctx, state)) {
    return romanticInteractDisabledReason(ctx, state)
  }
  if (!actor.isAlive) return '发起者已故'
  if (!target.isAlive) return '目标已故'
  if (hasSpouse(actor) || hasSpouse(target)) return '一方已有配偶'
  if (!isEngagedTo(ctx.actorId, ctx.targetId, state.characters)) {
    return '须先与对方订婚'
  }
  return '暂时无法执行'
}

let proposeCounter = 0

function nextProposeId(): string {
  proposeCounter += 1
  return `n-marriage-propose-${proposeCounter}`
}

function buildProposeNarrative(actorName: string, targetName: string): string {
  const templates = [
    `【婚姻】${actorName}郑重向${targetName}求婚，${targetName}答应了，二人正式订婚。`,
    `【婚姻】${actorName}单膝跪地，向${targetName}递出戒指。对方点头应允，婚约成立。`,
    `【婚姻】${actorName}与${targetName}在亲友见证下互许终身，正式订立婚约。`,
    `【婚姻】${actorName}在私密场合向${targetName}求婚，${targetName}含泪应允，消息很快传开。`,
    `【婚姻】${actorName}将戒指递给${targetName}，问出那句期待已久的话。${targetName}伸手接过，二人订婚。`,
    `【婚姻】${actorName}与${targetName}在晚宴后单独相处，${actorName}正式提出婚约，${targetName}欣然答应。`,
    `【婚姻】${actorName}向${targetName}坦陈心意，请求携手共度余生。${targetName}沉默片刻，随后点头应允。`,
    `【婚姻】${actorName}与${targetName}在花园散步时，${actorName}突然停下脚步求婚。${targetName}答允，婚约既成。`,
  ]
  return templates[Math.floor(Math.random() * templates.length)]
}

export function applyProposal(
  ctx: InteractionContext,
  state: GameState,
): { state: Partial<GameState>; entry: NarrativeEntry } {
  const actor = state.characters[ctx.actorId]
  const target = state.characters[ctx.targetId]
  if (!actor || !target) {
    throw new Error('Proposal actors not found')
  }

  const updatedCharacters: Record<string, Character> = { ...state.characters }

  updatedCharacters[ctx.actorId] = {
    ...actor,
    relations: addRelation(actor.relations, ctx.targetId, 'engaged', '未婚夫/妻'),
  }
  updatedCharacters[ctx.targetId] = {
    ...target,
    relations: addRelation(target.relations, ctx.actorId, 'engaged', '未婚夫/妻'),
  }

  return {
    state: { characters: updatedCharacters },
    entry: {
      id: nextProposeId(),
      year: state.year,
      month: state.month,
      type: 'player',
      text: buildProposeNarrative(actor.name, target.name),
      characterIds: [ctx.actorId, ctx.targetId],
    },
  }
}

export interface MarriageDraft {
  actorId: string
  targetId: string
  actorHouseId: string
  targetHouseId: string
  actorName: string
  targetName: string
  actorSurname: string
  targetSurname: string
}

export interface MarriageRelocatableChild {
  id: string
  name: string
}

export interface MarriageConfirmInput {
  houseId: string
  /** 随外嫁/入赘一方迁入新家族的孩子 */
  bringChildIds: string[]
}

/** 跨家族结婚时，随搬迁方可一并带走的子女（仍留原家族者） */
export function getMarriageRelocatableChildren(
  draft: MarriageDraft,
  houseId: string,
  characters: Record<string, Character>,
): MarriageRelocatableChild[] {
  if (draft.actorHouseId === draft.targetHouseId) return []

  const moverId =
    houseId === draft.actorHouseId ? draft.targetId : draft.actorId
  const oldHouseId =
    houseId === draft.actorHouseId ? draft.targetHouseId : draft.actorHouseId

  return Object.values(characters)
    .filter(
      (c) =>
        c.isAlive &&
        c.parentIds.includes(moverId) &&
        c.houseId === oldHouseId,
    )
    .map((c) => ({ id: c.id, name: c.name }))
}

export function getMarriageMoverId(
  draft: MarriageDraft,
  houseId: string,
): string {
  return houseId === draft.actorHouseId ? draft.targetId : draft.actorId
}

export function getMarriageMoverName(
  draft: MarriageDraft,
  houseId: string,
): string {
  const moverId = getMarriageMoverId(draft, houseId)
  return moverId === draft.actorId ? draft.actorName : draft.targetName
}

export function prepareMarriageDraft(
  ctx: InteractionContext,
  state: GameState,
): MarriageDraft | null {
  if (!canMarry(ctx, state)) return null

  const actor = state.characters[ctx.actorId]
  const target = state.characters[ctx.targetId]
  if (!actor || !target) return null

  return {
    actorId: ctx.actorId,
    targetId: ctx.targetId,
    actorHouseId: actor.houseId,
    targetHouseId: target.houseId,
    actorName: actor.name,
    targetName: target.name,
    actorSurname: getCharacterSurname(actor),
    targetSurname: getCharacterSurname(target),
  }
}

function relocateToHouse(
  char: Character,
  houseId: string,
  surname: string,
): Character {
  const givenName = char.givenName?.trim() || char.name.split('·')[0] || char.name
  return {
    ...char,
    houseId,
    surname,
    name: formatCharacterName(givenName, surname),
  }
}

export function getNativeHouseId(char: Character): string {
  return char.nativeHouseId ?? char.houseId
}

export function getNativeSurname(char: Character): string {
  return char.nativeSurname ?? getCharacterSurname(char)
}

/** 跨族结婚时入籍他族，保留原籍信息 */
function relocateForMarriage(
  char: Character,
  newHouseId: string,
  newSurname: string,
): Character {
  const nativeHouseId = getNativeHouseId(char)
  const nativeSurname = getNativeSurname(char)
  return relocateToHouse(
    { ...char, nativeHouseId, nativeSurname },
    newHouseId,
    newSurname,
  )
}

/** 离婚后回归原籍（若曾跨族入籍） */
export function returnToNativeHouse(char: Character): Character {
  const nativeHouseId = getNativeHouseId(char)
  if (char.houseId === nativeHouseId) return char
  return relocateToHouse(char, nativeHouseId, getNativeSurname(char))
}

/** 离族时撤销继承人身份 */
export function revokeHeirStatus(
  char: Character,
  leftHouseId: string,
  _houses: Record<string, House>,
): Character {
  if (char.heirOfHouseId !== leftHouseId) return char

  const newTitle = char.title.includes('继承人')
    ? char.title.replace('继承人', '族人')
    : '族人'

  return {
    ...char,
    heirOfHouseId: undefined,
    title: newTitle,
  }
}

let marryCounter = 0

function nextMarryId(): string {
  marryCounter += 1
  return `n-marriage-marry-${marryCounter}`
}

function buildMarryNarrative(
  actorName: string,
  targetName: string,
  houseName: string,
  joinText: string,
  childrenText: string,
): string {
  const suffix = `${joinText}${childrenText}`
  const templates = [
    `【婚姻】${actorName}与${targetName}在${houseName}举行婚礼，正式完婚${suffix}。`,
    `【婚姻】${actorName}与${targetName}在${houseName}完成婚礼仪式，亲友见证，正式成为夫妻${suffix}。`,
    `【婚姻】${houseName}为${actorName}与${targetName}举办婚礼，二人交换誓言，正式完婚${suffix}。`,
    `【婚姻】${actorName}与${targetName}在${houseName}的婚礼圆满礼成，媒体争相报道${suffix}。`,
    `【婚姻】${actorName}与${targetName}在${houseName}步入婚礼殿堂，在众人祝福中完婚${suffix}。`,
    `【婚姻】${houseName}张灯结彩，${actorName}与${targetName}在此举行婚礼，正式结为夫妻${suffix}。`,
    `【婚姻】${actorName}与${targetName}在${houseName}交换戒指，婚礼礼成${suffix}。`,
    `【婚姻】${actorName}与${targetName}在${houseName}举办婚礼，仪式庄重而温馨，二人正式完婚${suffix}。`,
  ]
  return templates[Math.floor(Math.random() * templates.length)]
}

export function applyMarriage(
  state: GameState,
  draft: MarriageDraft,
  confirm: MarriageConfirmInput,
): { state: Partial<GameState>; entry: NarrativeEntry; joinedHouseId: string } {
  const actor = state.characters[draft.actorId]
  const target = state.characters[draft.targetId]
  if (!actor || !target) {
    throw new Error('Marriage actors not found')
  }

  const house = state.houses[confirm.houseId]
  if (!house) {
    throw new Error('Invalid house for marriage')
  }
  if (
    confirm.houseId !== draft.actorHouseId &&
    confirm.houseId !== draft.targetHouseId
  ) {
    throw new Error('House must belong to one of the couple')
  }

  const crossHouse = draft.actorHouseId !== draft.targetHouseId
  const moverId = getMarriageMoverId(draft, confirm.houseId)
  const oldHouseId =
    confirm.houseId === draft.actorHouseId
      ? draft.targetHouseId
      : draft.actorHouseId
  const residentSurname =
    confirm.houseId === draft.actorHouseId
      ? draft.actorSurname
      : draft.targetSurname

  const relocatableIds = new Set(
    getMarriageRelocatableChildren(draft, confirm.houseId, state.characters).map(
      (c) => c.id,
    ),
  )
  const bringChildIds = confirm.bringChildIds.filter((id) =>
    relocatableIds.has(id),
  )

  const updatedCharacters: Record<string, Character> = { ...state.characters }

  let updatedActor: Character = {
    ...actor,
    spouseIds: actor.spouseIds.includes(draft.targetId)
      ? actor.spouseIds
      : [...actor.spouseIds, draft.targetId],
    relations: removeRelations(actor.relations, draft.targetId, [
      'engaged',
      'lover',
    ]),
  }
  updatedActor = {
    ...updatedActor,
    relations: addRelation(updatedActor.relations, draft.targetId, 'spouse', '配偶'),
  }

  let updatedTarget: Character = {
    ...target,
    spouseIds: target.spouseIds.includes(draft.actorId)
      ? target.spouseIds
      : [...target.spouseIds, draft.actorId],
    relations: removeRelations(target.relations, draft.actorId, [
      'engaged',
      'lover',
    ]),
  }
  updatedTarget = {
    ...updatedTarget,
    relations: addRelation(updatedTarget.relations, draft.actorId, 'spouse', '配偶'),
  }

  if (crossHouse) {
    if (moverId === draft.actorId) {
      updatedActor = relocateForMarriage(
        updatedActor,
        confirm.houseId,
        residentSurname,
      )
      updatedActor = revokeHeirStatus(updatedActor, oldHouseId, state.houses)
    } else {
      updatedTarget = relocateForMarriage(
        updatedTarget,
        confirm.houseId,
        residentSurname,
      )
      updatedTarget = revokeHeirStatus(updatedTarget, oldHouseId, state.houses)
    }

    for (const childId of bringChildIds) {
      const child = updatedCharacters[childId]
      if (!child) continue
      updatedCharacters[childId] = relocateForMarriage(
        child,
        confirm.houseId,
        residentSurname,
      )
    }
  }

  updatedCharacters[draft.actorId] = updatedActor
  updatedCharacters[draft.targetId] = updatedTarget

  const moverName = getMarriageMoverName(draft, confirm.houseId)
  const joinText = crossHouse ? `，${moverName}加入${house.name}` : ''
  const broughtNames = bringChildIds
    .map((id) => updatedCharacters[id]?.name)
    .filter(Boolean) as string[]
  const childrenText =
    broughtNames.length > 0
      ? `，${broughtNames.join('、')}随${moverName}一同加入`
      : ''

  return {
    state: { characters: updatedCharacters },
    joinedHouseId: confirm.houseId,
    entry: {
      id: nextMarryId(),
      year: state.year,
      month: state.month,
      type: 'player',
      text: buildMarryNarrative(
        draft.actorName,
        draft.targetName,
        house.name,
        joinText,
        childrenText,
      ),
      characterIds: [draft.actorId, draft.targetId, ...bringChildIds],
    },
  }
}

export type DivorceKind = 'amicable' | 'legal'

export interface DivorceSharedChild {
  id: string
  name: string
}

export interface DivorceDraft {
  kind: DivorceKind
  actorId: string
  targetId: string
  actorName: string
  targetName: string
  fatherId: string
  motherId: string
  fatherName: string
  motherName: string
  fatherHouseId: string
  motherHouseId: string
  fatherSurname: string
  motherSurname: string
  sharedChildren: DivorceSharedChild[]
}

export type ChildCustodyParent = 'father' | 'mother'

export interface DivorceConfirmInput {
  /** 共同子女的抚养归属（childId → 父亲或母亲） */
  childCustody: Record<string, ChildCustodyParent>
}

function exSpouseLabel(gender: Gender): string {
  return gender === 'male' ? '前夫' : '前妻'
}

export function canDivorce(
  ctx: InteractionContext,
  state: GameState,
): boolean {
  if (!canMarriageInteract(ctx, state)) return false
  if (!bothAlive(ctx, state)) return false
  return isMarriedTo(ctx.actorId, ctx.targetId, state.characters)
}

export function divorceDisabledReason(
  ctx: InteractionContext,
  state: GameState,
): string {
  const actor = state.characters[ctx.actorId]
  const target = state.characters[ctx.targetId]
  if (!actor || !target) return '角色不存在'
  if (ctx.actorId === ctx.targetId) return '无法对自己发起互动'
  if (!canMarriageInteract(ctx, state)) {
    return marriageInteractDisabledReason(ctx, state)
  }
  if (!actor.isAlive) return '发起者已故'
  if (!target.isAlive) return '目标已故'
  if (!isMarriedTo(ctx.actorId, ctx.targetId, state.characters)) {
    return '双方并非配偶'
  }
  return '暂时无法执行'
}

function classifyDivorceChildren(
  parentAId: string,
  parentBId: string,
  characters: Record<string, Character>,
): {
  preMarital: Array<{ childId: string; custodianId: string }>
  shared: DivorceSharedChild[]
} {
  const preMarital: Array<{ childId: string; custodianId: string }> = []
  const shared: DivorceSharedChild[] = []

  for (const child of Object.values(characters)) {
    if (!child.isAlive) continue
    const hasA = child.parentIds.includes(parentAId)
    const hasB = child.parentIds.includes(parentBId)
    if (hasA && hasB) {
      shared.push({ id: child.id, name: child.name })
    } else if (hasA) {
      preMarital.push({ childId: child.id, custodianId: parentAId })
    } else if (hasB) {
      preMarital.push({ childId: child.id, custodianId: parentBId })
    }
  }

  return { preMarital, shared }
}

export function prepareDivorceDraft(
  ctx: InteractionContext,
  state: GameState,
  kind: DivorceKind,
): DivorceDraft | null {
  if (!canDivorce(ctx, state)) return null

  const actor = state.characters[ctx.actorId]
  const target = state.characters[ctx.targetId]
  if (!actor || !target) return null

  const parents = resolveParents(actor, target)
  if (!parents) return null

  const { father, mother } = parents
  const { shared } = classifyDivorceChildren(ctx.actorId, ctx.targetId, state.characters)

  const fatherAfterReturn = returnToNativeHouse(father)
  const motherAfterReturn = returnToNativeHouse(mother)
  const actorAfterReturn = returnToNativeHouse(actor)
  const targetAfterReturn = returnToNativeHouse(target)

  return {
    kind,
    actorId: ctx.actorId,
    targetId: ctx.targetId,
    actorName: actorAfterReturn.name,
    targetName: targetAfterReturn.name,
    fatherId: father.id,
    motherId: mother.id,
    fatherName: fatherAfterReturn.name,
    motherName: motherAfterReturn.name,
    fatherHouseId: fatherAfterReturn.houseId,
    motherHouseId: motherAfterReturn.houseId,
    fatherSurname: getCharacterSurname(fatherAfterReturn),
    motherSurname: getCharacterSurname(motherAfterReturn),
    sharedChildren: shared,
  }
}

function stripSpouseFromCharacter(
  char: Character,
  exId: string,
  exLabel: string,
  postRelation: { type: 'ally' | 'rival'; label: string },
): Character {
  let relations = removeRelations(char.relations, exId, [
    'spouse',
    'engaged',
    'lover',
    'ally',
    'rival',
  ])
  relations = addRelation(relations, exId, 'ex_spouse', exLabel)
  relations = addRelation(relations, exId, postRelation.type, postRelation.label)

  return {
    ...char,
    spouseIds: char.spouseIds.filter((id) => id !== exId),
    relations,
  }
}

let divorceCounter = 0

function nextDivorceId(): string {
  divorceCounter += 1
  return `n-marriage-divorce-${divorceCounter}`
}

function buildDivorceNarrative(
  kind: DivorceKind,
  actorName: string,
  targetName: string,
  preMaritalText: string,
  sharedText: string,
  returnText: string,
): string {
  const amicableBases = [
    `【婚姻】${actorName}与${targetName}协议离婚，二人自此各奔东西，仍愿保持友好。`,
    `【婚姻】${actorName}与${targetName}经协商一致，和平解除婚姻，彼此祝福。`,
    `【婚姻】${actorName}与${targetName}签署离婚协议，体面分手，仍保留私人情谊。`,
    `【婚姻】${actorName}与${targetName}在律师见证下协议离婚，过程平和，无公开冲突。`,
    `【婚姻】${actorName}与${targetName}决定结束婚姻，双方声明仍将保持友好关系。`,
    `【婚姻】${actorName}与${targetName}平静办理离婚手续，对外表示「仍是朋友」。`,
    `【婚姻】${actorName}与${targetName}协商离婚，手续顺利，未引发舆论风波。`,
    `【婚姻】${actorName}与${targetName}正式解除婚约，二人表示互不埋怨，好聚好散。`,
  ]
  const legalBases = [
    `【婚姻】${actorName}与${targetName}走上法庭，最终以判决离婚收场，彼此形同陌路。`,
    `【婚姻】${actorName}与${targetName}对簿公堂，经法院判决离婚，二人公开交恶。`,
    `【婚姻】${actorName}与${targetName}的法律离婚历时数月，最终以法庭判决告终，关系彻底破裂。`,
    `【婚姻】${actorName}与${targetName}因离婚对簿公堂，媒体全程跟踪，二人此后形同陌路。`,
    `【婚姻】${actorName}与${targetName}经法院判决离婚，双方律师各执一词，场面颇为难看。`,
    `【婚姻】${actorName}与${targetName}的离婚官司尘埃落定，判决结果公开，二人再未同框。`,
    `【婚姻】${actorName}与${targetName}走上法庭争夺权益，最终以判决离婚收场，彼此不再往来。`,
    `【婚姻】${actorName}与${targetName}经法院裁定离婚，声明中措辞冰冷，关系彻底终结。`,
  ]
  const bases = kind === 'amicable' ? amicableBases : legalBases
  const base = bases[Math.floor(Math.random() * bases.length)]
  return `${base}${returnText}${preMaritalText}${sharedText}`
}

export function applyDivorce(
  state: GameState,
  draft: DivorceDraft,
  confirm: DivorceConfirmInput,
): { state: Partial<GameState>; entry: NarrativeEntry } {
  const actor = state.characters[draft.actorId]
  const target = state.characters[draft.targetId]
  if (!actor || !target) {
    throw new Error('Divorce actors not found')
  }

  const postRelation =
    draft.kind === 'amicable'
      ? ({ type: 'ally' as const, label: '朋友' })
      : ({ type: 'rival' as const, label: '对立者' })

  const updatedCharacters: Record<string, Character> = { ...state.characters }

  updatedCharacters[draft.actorId] = stripSpouseFromCharacter(
    actor,
    draft.targetId,
    exSpouseLabel(target.gender),
    postRelation,
  )
  updatedCharacters[draft.targetId] = stripSpouseFromCharacter(
    target,
    draft.actorId,
    exSpouseLabel(actor.gender),
    postRelation,
  )

  const returnNames: string[] = []

  for (const id of [draft.actorId, draft.targetId]) {
    const before = updatedCharacters[id]
    const after = returnToNativeHouse(before)
    if (after.houseId !== before.houseId) {
      returnNames.push(after.name)
    }
    updatedCharacters[id] = after
  }

  const { preMarital } = classifyDivorceChildren(
    draft.actorId,
    draft.targetId,
    state.characters,
  )

  const preMaritalNames: string[] = []

  for (const { childId, custodianId } of preMarital) {
    const child = updatedCharacters[childId]
    const custodian = updatedCharacters[custodianId]
    if (!child || !custodian) continue

    const surname = getCharacterSurname(custodian)
    if (
      child.houseId !== custodian.houseId ||
      getCharacterSurname(child) !== surname
    ) {
      updatedCharacters[childId] = relocateToHouse(child, custodian.houseId, surname)
      preMaritalNames.push(child.name)
    }
  }

  const sharedNames: string[] = []
  const sharedIds = new Set(draft.sharedChildren.map((c) => c.id))

  for (const childId of sharedIds) {
    const custody = confirm.childCustody[childId]
    if (!custody) continue

    const child = updatedCharacters[childId]
    if (!child) continue

    const custodianId = custody === 'father' ? draft.fatherId : draft.motherId
    const custodian = updatedCharacters[custodianId]
    if (!custodian) continue

    const surname = getCharacterSurname(custodian)
    if (
      child.houseId !== custodian.houseId ||
      getCharacterSurname(child) !== surname
    ) {
      updatedCharacters[childId] = relocateToHouse(
        child,
        custodian.houseId,
        surname,
      )
      sharedNames.push(child.name)
    }
  }

  const returnText =
    returnNames.length > 0
      ? `${returnNames.join('、')}回归原家族。`
      : ''
  const preMaritalText =
    preMaritalNames.length > 0
      ? `婚前子女${preMaritalNames.join('、')}各随其亲生父母。`
      : ''
  const sharedText =
    sharedNames.length > 0
      ? `共同子女${sharedNames.join('、')}的抚养归属已裁定。`
      : ''

  return {
    state: { characters: updatedCharacters },
    entry: {
      id: nextDivorceId(),
      year: state.year,
      month: state.month,
      type: 'player',
      text: buildDivorceNarrative(
        draft.kind,
        draft.actorName,
        draft.targetName,
        preMaritalText,
        sharedText,
        returnText,
      ),
      characterIds: [
        draft.actorId,
        draft.targetId,
        ...preMarital.map((p) => p.childId),
        ...Object.keys(confirm.childCustody),
      ],
    },
  }
}
