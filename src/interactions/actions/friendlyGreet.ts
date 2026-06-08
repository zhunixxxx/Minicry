import type {
  InteractionActionHandler,
  InteractionContext,
  InteractionResult,
} from '../../types/interactions'
import type { GameState } from '../../types/game'
import { canFriendlyInteract, friendlyInteractDisabledReason } from '../utils'

let greetCounter = 0

function nextId(): string {
  greetCounter += 1
  return `n-interact-greet-${greetCounter}`
}

function bothAlive(ctx: InteractionContext, state: GameState): boolean {
  const actor = state.characters[ctx.actorId]
  const target = state.characters[ctx.targetId]
  return Boolean(actor?.isAlive && target?.isAlive)
}

function buildGreetNarrative(actorName: string, targetName: string): string {
  const templates = [
    `【互动】${actorName}向${targetName}打招呼，${targetName}笑着回应，气氛轻松。`,
    `【互动】${actorName}与${targetName}寒暄了几句，旁人看来颇为融洽。`,
    `【互动】${actorName}远远看见${targetName}，上前打了个招呼。${targetName}微笑应答。`,
    `【互动】${actorName}主动找${targetName}攀谈，二人有说有笑，旁人纷纷侧目。`,
    `【互动】${actorName}与${targetName}在走廊相遇，简单问候后各自离开，留下友好印象。`,
    `【互动】${actorName}向${targetName}问好，${targetName}热情回应，气氛颇为自然。`,
    `【互动】${actorName}借故与${targetName}搭话，几句闲聊后，彼此关系似乎更近一步。`,
    `【互动】${actorName}与${targetName}在会客厅碰面，互致问候，场面平和而得体。`,
  ]
  return templates[Math.floor(Math.random() * templates.length)]
}

export const friendlyGreetAction: InteractionActionHandler = {
  id: 'friendly.greet',

  canExecute(ctx, state) {
    if (ctx.actorId === ctx.targetId) return false
    const actor = state.characters[ctx.actorId]
    const target = state.characters[ctx.targetId]
    if (!actor || !target) return false
    if (!canFriendlyInteract(ctx, state)) return false
    return bothAlive(ctx, state)
  },

  disabledReason(ctx, state) {
    if (ctx.actorId === ctx.targetId) return '无法对自己发起互动'
    const actor = state.characters[ctx.actorId]
    const target = state.characters[ctx.targetId]
    if (!canFriendlyInteract(ctx, state)) {
      return friendlyInteractDisabledReason(ctx, state)
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
        text: buildGreetNarrative(actor.name, target.name),
        characterIds: [ctx.actorId, ctx.targetId],
      },
    }
  },
}
