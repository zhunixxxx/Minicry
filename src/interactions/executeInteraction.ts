import type { InteractionActionId, InteractionContext, InteractionResult } from '../types/interactions'
import type { GameState } from '../types/game'
import { buildInteractionDialogues } from './dialogues'
import { getInteractionAction } from './registry'

export function executeInteraction(
  actionId: InteractionActionId,
  ctx: InteractionContext,
  state: GameState,
): InteractionResult {
  const handler = getInteractionAction(actionId)
  if (!handler) {
    throw new Error(`Unknown interaction action: ${actionId}`)
  }
  if (!handler.canExecute(ctx, state)) {
    const reason = handler.disabledReason?.(ctx, state) ?? '无法执行此互动'
    throw new Error(reason)
  }
  const result = handler.execute(ctx, state)
  const dialogues = buildInteractionDialogues(actionId, ctx, state)
  return dialogues.length > 0 ? { ...result, dialogues } : result
}
