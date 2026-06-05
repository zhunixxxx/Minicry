import type {
  InteractionActionHandler,
  InteractionContext,
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
    `【互动】${actorName}与${others}围坐畅谈，笑语不绝。`,
    `【互动】${actorName}发起话题，${others}纷纷应和，气氛颇为热络。`,
    `【互动】${actorName}同${others}闲聊片刻，各抒己见，相谈甚欢。`,
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
    if (!actor?.isAlive) return '发起者已不在世'
    if (targets.some((id) => !state.characters[id]?.isAlive)) {
      return '部分对象已不在世'
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
