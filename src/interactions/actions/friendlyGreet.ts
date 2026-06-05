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
    `【互动】${actorName}向${targetName}致意问好，${targetName}颔首回应，气氛融洽。`,
    `【互动】${actorName}在家谱厅前与${targetName}寒暄数句，旁人看来颇为亲善。`,
    `【互动】${actorName}远远望见${targetName}，上前打了个招呼。${targetName}微笑应答。`,
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
    if (!actor?.isAlive) return '发起者已不在世'
    if (!target?.isAlive) return '目标已不在世'
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
