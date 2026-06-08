import type { InteractionActionHandler } from '../../types/interactions'
import { canDivorce, divorceDisabledReason } from '../../utils/marriage'

export const marriageDivorceLegalAction: InteractionActionHandler = {
  id: 'marriage.divorceLegal',

  canExecute(ctx, state) {
    return canDivorce(ctx, state)
  },

  disabledReason(ctx, state) {
    return divorceDisabledReason(ctx, state)
  },

  execute() {
    throw new Error('法律离婚需通过抚养裁定弹窗完成')
  },
}
