import type {
  InteractionActionHandler,
  InteractionResult,
} from '../../types/interactions'
import {
  canReproduce,
  reproduceDisabledReason,
} from '../../utils/reproduction'

export const romanticReproduceAction: InteractionActionHandler = {
  id: 'romantic.reproduce',

  canExecute(ctx, state) {
    return canReproduce(ctx, state)
  },

  disabledReason(ctx, state) {
    return reproduceDisabledReason(ctx, state)
  },

  execute(): InteractionResult {
    throw new Error('传宗接代需通过命名弹窗完成')
  },
}
