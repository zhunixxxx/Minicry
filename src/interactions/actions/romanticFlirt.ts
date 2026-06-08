import type {
  InteractionActionHandler,
  InteractionContext,
  InteractionResult,
} from '../../types/interactions'
import type { GameState } from '../../types/game'
import {
  canRomanticInteract,
  romanticInteractDisabledReason,
} from '../utils'

let flirtCounter = 0

function nextId(): string {
  flirtCounter += 1
  return `n-interact-flirt-${flirtCounter}`
}

function bothAlive(ctx: InteractionContext, state: GameState): boolean {
  const actor = state.characters[ctx.actorId]
  const target = state.characters[ctx.targetId]
  return Boolean(actor?.isAlive && target?.isAlive)
}

function buildFlirtNarrative(actorName: string, targetName: string): string {
  const templates = [
    `【浪漫】${actorName}对${targetName}说了几句逾矩的话，${targetName}神色微变，客厅里的空气悄然升温。`,
    `【浪漫】${actorName}借故靠近${targetName}，言语间带着试探，二人对视了一瞬。`,
    `【浪漫】${actorName}对${targetName}出言调情，二人目光交汇，心照不宣。`,
    `【浪漫】${actorName}低声对${targetName}说了些什么，${targetName}别过脸去，耳根却红了。`,
    `【浪漫】${actorName}与${targetName}在花园独处片刻，言语间尽是暗示，所幸未遭仆役撞见。`,
    `【浪漫】${actorName}逗弄${targetName}几句，${targetName}嘴上推拒，眼里却有笑意。`,
    `【浪漫】${actorName}在${targetName}耳边轻声说了句话，${targetName}愣了一秒，随即别过视线。`,
    `【浪漫】${actorName}与${targetName}在舞会后目光纠缠片刻，谁都没有先开口，空气却热了起来。`,
  ]
  return templates[Math.floor(Math.random() * templates.length)]
}

export const romanticFlirtAction: InteractionActionHandler = {
  id: 'romantic.flirt',

  canExecute(ctx, state) {
    if (ctx.actorId === ctx.targetId) return false
    const actor = state.characters[ctx.actorId]
    const target = state.characters[ctx.targetId]
    if (!actor || !target) return false
    if (!canRomanticInteract(ctx, state)) return false
    return bothAlive(ctx, state)
  },

  disabledReason(ctx, state) {
    if (ctx.actorId === ctx.targetId) return '无法对自己发起互动'
    const actor = state.characters[ctx.actorId]
    const target = state.characters[ctx.targetId]
    if (!canRomanticInteract(ctx, state)) {
      return romanticInteractDisabledReason(ctx, state)
    }
    if (!actor?.isAlive) return '发起者已故'
    if (!target?.isAlive) return '目标已故'
    return '暂时无法执行'
  },

  execute(ctx, state): InteractionResult {
    const actor = state.characters[ctx.actorId]
    const target = state.characters[ctx.targetId]
    if (!actor || !target) {
      throw new Error('Interaction actors not found')
    }

    return {
      entry: {
        id: nextId(),
        year: state.year,
        month: state.month,
        type: 'player',
        text: buildFlirtNarrative(actor.name, target.name),
        characterIds: [ctx.actorId, ctx.targetId],
      },
    }
  },
}
