import type {
  InteractionActionHandler,
  InteractionResult,
} from '../../types/interactions'
import {
  applyProposal,
  canPropose,
  proposeDisabledReason,
} from '../../utils/marriage'

export const marriageProposeAction: InteractionActionHandler = {
  id: 'marriage.propose',

  canExecute(ctx, state) {
    return canPropose(ctx, state)
  },

  disabledReason(ctx, state) {
    return proposeDisabledReason(ctx, state)
  },

  execute(ctx, state): InteractionResult {
    const result = applyProposal(ctx, state)
    return { entry: result.entry, state: result.state }
  },
}
