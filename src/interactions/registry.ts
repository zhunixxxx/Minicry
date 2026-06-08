import type {
  InteractionActionHandler,
  InteractionActionId,
  InteractionContext,
  InteractionMenuItem,
} from '../types/interactions'
import type { GameState } from '../types/game'
import { friendlyGreetAction } from './actions/friendlyGreet'
import { friendlyGroupChatAction } from './actions/friendlyGroupChat'
import { marriageDivorceAmicableAction } from './actions/marriageDivorceAmicable'
import { marriageDivorceLegalAction } from './actions/marriageDivorceLegal'
import { marriageMarryAction } from './actions/marriageMarry'
import { marriageProposeAction } from './actions/marriagePropose'
import { isMarriedTo } from '../utils/marriage'
import { romanticFlirtAction } from './actions/romanticFlirt'
import { romanticReproduceAction } from './actions/romanticReproduce'
import {
  canFriendlyInteract,
  canMarriageInteract,
  canRomanticInteract,
  isMultiTargetContext,
} from './utils'

/** 所有已注册的可执行动作 */
export const INTERACTION_ACTIONS: InteractionActionHandler[] = [
  friendlyGreetAction,
  friendlyGroupChatAction,
  romanticFlirtAction,
  romanticReproduceAction,
  marriageProposeAction,
  marriageMarryAction,
  marriageDivorceAmicableAction,
  marriageDivorceLegalAction,
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
    label: '友善',
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
  {
    id: 'romantic',
    label: '浪漫',
    kind: 'category',
    children: [
      {
        id: 'romantic-flirt',
        label: '调情',
        kind: 'action',
        actionId: 'romantic.flirt',
        scope: 'single',
      },
      {
        id: 'romantic-reproduce',
        label: '传宗接代',
        kind: 'action',
        actionId: 'romantic.reproduce',
        scope: 'single',
      },
    ],
  },
  {
    id: 'marriage',
    label: '婚姻',
    kind: 'category',
    children: [
      {
        id: 'marriage-propose',
        label: '求婚',
        kind: 'action',
        actionId: 'marriage.propose',
        scope: 'single',
      },
      {
        id: 'marriage-marry',
        label: '结婚',
        kind: 'action',
        actionId: 'marriage.marry',
        scope: 'single',
      },
      {
        id: 'marriage-divorce-amicable',
        label: '协议离婚',
        kind: 'action',
        actionId: 'marriage.divorceAmicable',
        scope: 'single',
        marriedOnly: true,
      },
      {
        id: 'marriage-divorce-legal',
        label: '法律离婚',
        kind: 'action',
        actionId: 'marriage.divorceLegal',
        scope: 'single',
        marriedOnly: true,
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

    return { ...item, children }
  }

  if (item.kind === 'action') {
    if (!matchesScope(item, ctx)) return null

    if (
      item.marriedOnly &&
      !isMarriedTo(ctx.actorId, ctx.targetId, state.characters)
    ) {
      return null
    }

    if (item.actionId) {
      const handler = getInteractionAction(item.actionId)
      if (!handler) return null
      if (!handler.canExecute(ctx, state)) return null
      return item
    }
  }

  return item
}

/** 根据当前上下文生成可用菜单（不可执行项不展示） */
export function buildInteractionMenu(
  ctx: InteractionContext,
  state: GameState,
): InteractionMenuItem[] {
  const allowFriendly = canFriendlyInteract(ctx, state)
  const allowRomantic = canRomanticInteract(ctx, state)
  const allowMarriage = canMarriageInteract(ctx, state)

  return INTERACTION_MENU_ROOT.filter((item) => {
    if (item.id === 'friendly') return allowFriendly
    if (item.id === 'romantic') return allowRomantic
    if (item.id === 'marriage') return allowMarriage
    return true
  })
    .map((item) => resolveMenuItem(item, ctx, state))
    .filter((item): item is InteractionMenuItem => item !== null)
}
