import type { InteractionContext } from '../types/interactions'
import type { GameState } from '../types/game'
import { isOppositeGender } from '../utils/gender'
import { areCloseBloodRelatives } from '../utils/kinship'

/** 互动目标 id 列表（不含发起者） */
export function getInteractionTargets(ctx: InteractionContext): string[] {
  if (ctx.targetIds?.length) {
    return ctx.targetIds.filter((id) => id !== ctx.actorId)
  }
  if (ctx.targetId && ctx.targetId !== ctx.actorId) {
    return [ctx.targetId]
  }
  return []
}

export function isMultiTargetContext(ctx: InteractionContext): boolean {
  return getInteractionTargets(ctx).length >= 2
}

export function computeInteractionTargets(
  anchorId: string,
  actorId: string,
  selection: Set<string>,
): { targetId: string; targetIds?: string[] } {
  const targets = new Set(selection)
  if (anchorId !== actorId) targets.add(anchorId)
  targets.delete(actorId)
  const list = [...targets]
  if (list.length >= 2) {
    return { targetId: anchorId, targetIds: list }
  }
  return { targetId: anchorId }
}

/** 同族谱（同一家族）或同一物理空间（会晤）时可发起友善互动 */
export function canFriendlyInteract(
  ctx: InteractionContext,
  state: GameState,
): boolean {
  if (ctx.inMeeting) return true
  const actor = state.characters[ctx.actorId]
  if (!actor) return false
  const targets = getInteractionTargets(ctx)
  if (targets.length === 0) return false
  return targets.every(
    (id) => state.characters[id]?.houseId === actor.houseId,
  )
}

export function friendlyInteractDisabledReason(
  ctx: InteractionContext,
  state: GameState,
): string {
  if (canFriendlyInteract(ctx, state)) return '暂时无法执行'
  return '暂不支持跨家族友善互动'
}

/** 同族谱/会晤中，且非近亲、非多人目标时可发起浪漫互动 */
export function canRomanticInteract(
  ctx: InteractionContext,
  state: GameState,
): boolean {
  if (isMultiTargetContext(ctx)) return false
  if (!canFriendlyInteract(ctx, state)) return false
  const actor = state.characters[ctx.actorId]
  const target = state.characters[ctx.targetId]
  if (!actor || !target) return false
  if (ctx.actorId === ctx.targetId) return false
  if (!isOppositeGender(actor, target)) return false
  return !areCloseBloodRelatives(ctx.actorId, ctx.targetId, state.characters)
}

export function romanticInteractDisabledReason(
  ctx: InteractionContext,
  state: GameState,
): string {
  if (isMultiTargetContext(ctx)) return '浪漫互动仅支持单人目标'
  if (!canFriendlyInteract(ctx, state)) return '暂不支持跨家族浪漫互动'
  const actor = state.characters[ctx.actorId]
  const target = state.characters[ctx.targetId]
  if (actor && target && !isOppositeGender(actor, target)) {
    return '浪漫互动仅限异性之间'
  }
  if (
    areCloseBloodRelatives(
      ctx.actorId,
      ctx.targetId,
      state.characters,
    )
  ) {
    return '近亲之间不可发起浪漫互动'
  }
  return '暂时无法执行'
}
