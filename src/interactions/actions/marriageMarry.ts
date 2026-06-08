import type { InteractionActionHandler } from '../../types/interactions'
import { canMarry, marryDisabledReason } from '../../utils/marriage'

export const marriageMarryAction: InteractionActionHandler = {
  id: 'marriage.marry',

  canExecute(ctx, state) {
    return canMarry(ctx, state)
  },

  disabledReason(ctx, state) {
    return marryDisabledReason(ctx, state)
  },

  execute() {
    throw new Error('结婚需通过婚礼登记弹窗完成')
  },
}
