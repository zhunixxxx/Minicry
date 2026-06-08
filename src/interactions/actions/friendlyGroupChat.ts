import type {
  InteractionActionHandler,
  InteractionResult,
} from '../../types/interactions'
import type { GameState } from '../../types/game'
import {
  canFriendlyInteract,
  friendlyInteractDisabledReason,
  getInteractionTargets,
} from '../utils'

let groupChatCounter = 0

function nextId(): string {
  groupChatCounter += 1
  return `n-interact-group-chat-${groupChatCounter}`
}

function allAlive(actorId: string, targetIds: string[], state: GameState): boolean {
  const actor = state.characters[actorId]
  if (!actor?.isAlive) return false
  return targetIds.every((id) => state.characters[id]?.isAlive)
}

function buildGroupChatNarrative(actorName: string, targetNames: string[]): string {
  const others = targetNames.join('、')
  const templates = [
    `【互动】${actorName}与${others}围坐客厅，笑声不断。`,
    `【互动】${actorName}发起话题，${others}纷纷接话，茶叙气氛热络。`,
    `【互动】${actorName}同${others}闲聊片刻，各抒己见，相谈甚欢。`,
    `【互动】${actorName}抛出一个话题，${others}各抒己见，争论与笑声交替不断。`,
    `【互动】${actorName}与${others}聊起了近况，从庄园公务到伦敦社交，话题越聊越开。`,
    `【互动】${actorName}同${others}在下午茶时闲聊，气氛轻松，旁人也被吸引过来。`,
    `【互动】${actorName}与${others}围成一圈，有说有笑，难得的融洽时光。`,
    `【互动】${actorName}向${others}分享伦敦见闻，众人时而惊叹时而哄笑，相谈甚欢。`,
  ]
  return templates[Math.floor(Math.random() * templates.length)]
}

export const friendlyGroupChatAction: InteractionActionHandler = {
  id: 'friendly.groupChat',

  canExecute(ctx, state) {
    const targets = getInteractionTargets(ctx)
    if (targets.length < 2) return false
    if (targets.includes(ctx.actorId)) return false
    if (!canFriendlyInteract(ctx, state)) return false
    return allAlive(ctx.actorId, targets, state)
  },

  disabledReason(ctx, state) {
    const targets = getInteractionTargets(ctx)
    if (targets.length < 2) return '请至少选择两名互动对象'
    if (!canFriendlyInteract(ctx, state)) {
      return friendlyInteractDisabledReason(ctx, state)
    }
    const actor = state.characters[ctx.actorId]
    if (!actor?.isAlive) return '发起者已故'
    if (targets.some((id) => !state.characters[id]?.isAlive)) {
      return '部分对象已故'
    }
    return '暂时无法执行'
  },

  execute(ctx, state): InteractionResult {
    const actor = state.characters[ctx.actorId]
    const targetIds = getInteractionTargets(ctx)
    if (!actor || targetIds.length < 2) {
      throw new Error('Group chat targets invalid')
    }

    const targetNames = targetIds
      .map((id) => state.characters[id]?.name)
      .filter(Boolean) as string[]

    return {
      entry: {
        id: nextId(),
        year: state.year,
        month: state.month,
        type: 'player',
        text: buildGroupChatNarrative(actor.name, targetNames),
        characterIds: [ctx.actorId, ...targetIds],
      },
    }
  },
}
