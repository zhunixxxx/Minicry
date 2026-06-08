import type { InteractionActionHandler } from '../../types/interactions'
import { canDivorce, divorceDisabledReason } from '../../utils/marriage'

export const marriageDivorceAmicableAction: InteractionActionHandler = {
  id: 'marriage.divorceAmicable',

  canExecute(ctx, state) {
    return canDivorce(ctx, state)
  },

  disabledReason(ctx, state) {
    return divorceDisabledReason(ctx, state)
  },

  execute() {
    throw new Error('协议离婚需通过抚养裁定弹窗完成')
  },
}
