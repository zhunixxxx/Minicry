import type {
  InteractionActionHandler,
  InteractionActionId,
  InteractionContext,
  InteractionMenuItem,
} from '../types/interactions'
import type { GameState } from '../types/game'
import { friendlyGreetAction } from './actions/friendlyGreet'
import { friendlyGroupChatAction } from './actions/friendlyGroupChat'
import { canFriendlyInteract, isMultiTargetContext } from './utils'

/** 所有已注册的可执行动作 */
export const INTERACTION_ACTIONS: InteractionActionHandler[] = [
  friendlyGreetAction,
  friendlyGroupChatAction,
]

const actionById = new Map<InteractionActionId, InteractionActionHandler>(
  INTERACTION_ACTIONS.map((a) => [a.id, a]),
)

/**
 * 交互菜单结构（静态定义）。
 * 后续新增分类/动作：在此追加条目，并实现对应 handler 即可。
 */
export const INTERACTION_MENU_ROOT: InteractionMenuItem[] = [
  {
    id: 'friendly',
    label: '友善……',
    kind: 'category',
    children: [
      {
        id: 'friendly-greet',
        label: '打招呼',
        kind: 'action',
        actionId: 'friendly.greet',
        scope: 'single',
      },
      {
        id: 'friendly-group-chat',
        label: '多人聊天',
        kind: 'action',
        actionId: 'friendly.groupChat',
        scope: 'multi',
      },
    ],
  },
]

export function getInteractionAction(
  actionId: InteractionActionId,
): InteractionActionHandler | undefined {
  return actionById.get(actionId)
}

function matchesScope(item: InteractionMenuItem, ctx: InteractionContext): boolean {
  if (item.kind !== 'action') return true
  const scope = item.scope ?? 'single'
  const isMulti = isMultiTargetContext(ctx)
  if (scope === 'multi') return isMulti
  return !isMulti
}

function resolveMenuItem(
  item: InteractionMenuItem,
  ctx: InteractionContext,
  state: GameState,
): InteractionMenuItem | null {
  if (item.kind === 'category' && item.children) {
    const children = item.children
      .filter((child) => matchesScope(child, ctx))
      .map((child) => resolveMenuItem(child, ctx, state))
      .filter((child): child is InteractionMenuItem => child !== null)

    if (children.length === 0) return null

    const allDisabled = children.every((c) => c.disabled)
    return {
      ...item,
      children,
      disabled: allDisabled,
      disabledReason: allDisabled ? '该分类下暂无可用行动' : undefined,
    }
  }

  if (item.kind === 'action') {
    if (!matchesScope(item, ctx)) return null

    if (item.actionId) {
      const handler = getInteractionAction(item.actionId)
      if (!handler) {
        return { ...item, disabled: true, disabledReason: '动作未注册' }
      }
      const can = handler.canExecute(ctx, state)
      return {
        ...item,
        disabled: !can,
        disabledReason: can ? undefined : handler.disabledReason?.(ctx, state),
      }
    }
  }

  return item
}

/** 根据当前上下文生成可用菜单（含 disabled 状态） */
export function buildInteractionMenu(
  ctx: InteractionContext,
  state: GameState,
): InteractionMenuItem[] {
  const allowFriendly = canFriendlyInteract(ctx, state)

  return INTERACTION_MENU_ROOT.filter(
    (item) => allowFriendly || item.id !== 'friendly',
  )
    .map((item) => resolveMenuItem(item, ctx, state))
    .filter((item): item is InteractionMenuItem => item !== null)
}
