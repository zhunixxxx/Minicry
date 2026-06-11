import type { GameState } from '../../types/game'
import type {
  InteractionActionId,
  InteractionContext,
  InteractionDialogue,
} from '../../types/interactions'
import {
  buildGreetActorLine,
  buildGreetTargetLine,
} from './greetDialogues'
import {
  buildGroupChatActorLine,
  buildGroupChatParticipantLine,
} from './groupChatDialogues'
import {
  buildFlirtActorLine,
  buildFlirtTargetLine,
} from './flirtDialogues'
import {
  buildProposeActorLine,
  buildProposeTargetLine,
} from './proposeDialogues'
import {
  buildMarryActorLine,
  buildMarryTargetLine,
} from './marryDialogues'
import { getInteractionTargets } from '../utils'

export type InteractionDialogueBuilder = (
  ctx: InteractionContext,
  state: GameState,
) => InteractionDialogue[]

const dialogueBuilders: Partial<
  Record<InteractionActionId, InteractionDialogueBuilder>
> = {
  'friendly.greet': buildGreetDialogues,
  'friendly.groupChat': buildGroupChatDialogues,
  'romantic.flirt': buildFlirtDialogues,
  'marriage.propose': buildProposeDialogues,
  'marriage.marry': buildMarryDialogues,
}

function buildGreetDialogues(
  ctx: InteractionContext,
  state: GameState,
): InteractionDialogue[] {
  const actor = state.characters[ctx.actorId]
  const target = state.characters[ctx.targetId]
  if (!actor || !target) return []

  return [
    {
      characterId: ctx.actorId,
      text: buildGreetActorLine(actor, target),
    },
    {
      characterId: ctx.targetId,
      text: buildGreetTargetLine(actor, target),
    },
  ]
}

function buildGroupChatDialogues(
  ctx: InteractionContext,
  state: GameState,
): InteractionDialogue[] {
  const actor = state.characters[ctx.actorId]
  const targetIds = getInteractionTargets(ctx)
  if (!actor || targetIds.length < 2) return []

  const dialogues: InteractionDialogue[] = [
    { characterId: ctx.actorId, text: buildGroupChatActorLine(actor) },
  ]

  for (const id of targetIds) {
    const char = state.characters[id]
    if (!char) continue
    dialogues.push({
      characterId: id,
      text: buildGroupChatParticipantLine(char),
    })
  }

  return dialogues
}

function buildMarryDialogues(
  ctx: InteractionContext,
  state: GameState,
): InteractionDialogue[] {
  const actor = state.characters[ctx.actorId]
  const target = state.characters[ctx.targetId]
  if (!actor || !target) return []

  return [
    {
      characterId: ctx.actorId,
      text: buildMarryActorLine(actor, target),
    },
    {
      characterId: ctx.targetId,
      text: buildMarryTargetLine(actor, target),
    },
  ]
}

function buildProposeDialogues(
  ctx: InteractionContext,
  state: GameState,
): InteractionDialogue[] {
  const actor = state.characters[ctx.actorId]
  const target = state.characters[ctx.targetId]
  if (!actor || !target) return []

  return [
    {
      characterId: ctx.actorId,
      text: buildProposeActorLine(actor, target),
    },
    {
      characterId: ctx.targetId,
      text: buildProposeTargetLine(actor, target),
    },
  ]
}

function buildFlirtDialogues(
  ctx: InteractionContext,
  state: GameState,
): InteractionDialogue[] {
  const actor = state.characters[ctx.actorId]
  const target = state.characters[ctx.targetId]
  if (!actor || !target) return []

  return [
    {
      characterId: ctx.actorId,
      text: buildFlirtActorLine(actor, target),
    },
    {
      characterId: ctx.targetId,
      text: buildFlirtTargetLine(actor, target),
    },
  ]
}

export function buildInteractionDialogues(
  actionId: InteractionActionId,
  ctx: InteractionContext,
  state: GameState,
): InteractionDialogue[] {
  const builder = dialogueBuilders[actionId]
  return builder ? builder(ctx, state) : []
}

export function registerInteractionDialogues(
  actionId: InteractionActionId,
  builder: InteractionDialogueBuilder,
): void {
  dialogueBuilders[actionId] = builder
}

export function dialoguesToReactions(
  dialogues: InteractionDialogue[],
): Record<string, string> {
  const reactions: Record<string, string> = {}
  for (const line of dialogues) {
    reactions[line.characterId] = line.text
  }
  return reactions
}
