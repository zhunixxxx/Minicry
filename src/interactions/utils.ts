import type { InteractionContext } from '../types/interactions'
import type { GameState } from '../types/game'

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
