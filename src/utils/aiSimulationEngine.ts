import { executeInteraction } from '../interactions/executeInteraction'
import { dialoguesToReactions } from '../interactions/dialogues'
import type {
  AiPlanAction,
  AiSimulationPlan,
} from '../types/aiSimulation'
import type { Character, GameState, NarrativeEntry } from '../types/game'
import type { InteractionActionId, InteractionContext } from '../types/interactions'
import { generateReactions } from './eventReactions'
import { formatDate } from './familyTree'
import { applyBondDeltaToCharacters } from './relationshipBonds'
import { interveneAdvanceTime } from './storyEngine'

let entryCounter = 500

function nextId(): string {
  return `n-ai-${++entryCounter}`
}

export interface AiExecutionResult {
  state: Partial<GameState>
  entries: NarrativeEntry[]
  /** 推演结束后显示在对话气泡上的角色台词 */
  reactions?: Record<string, string>
}

function resolveInvolvedCharacterIds(
  plan: AiSimulationPlan,
  state: GameState,
): string[] {
  const ids = new Set<string>()

  for (const id of plan.characterIds ?? []) {
    if (state.characters[id]?.isAlive) ids.add(id)
  }

  for (const id of Object.keys(plan.reactions ?? {})) {
    if (state.characters[id]?.isAlive) ids.add(id)
  }

  if (ids.size === 0 && state.characters[state.selectedCharacterId]?.isAlive) {
    ids.add(state.selectedCharacterId)
  }

  return [...ids]
}

function buildSimulationReactions(
  plan: AiSimulationPlan,
  entry: NarrativeEntry,
  characters: Record<string, Character>,
): Record<string, string> {
  const involvedIds = entry.characterIds ?? []
  const fallbackEntry: NarrativeEntry = {
    ...entry,
    characterIds: involvedIds,
    reactions: undefined,
  }
  const fallback = generateReactions(fallbackEntry, characters)

  if (!plan.reactions || Object.keys(plan.reactions).length === 0) {
    return fallback
  }

  const merged = { ...fallback }
  for (const [id, line] of Object.entries(plan.reactions)) {
    if (characters[id]?.isAlive && line.trim()) {
      merged[id] = line.trim()
    }
  }
  return merged
}

function buildMainEntry(plan: AiSimulationPlan, state: GameState): NarrativeEntry {
  const characterIds = resolveInvolvedCharacterIds(plan, state)
  const entry: NarrativeEntry = {
    id: nextId(),
    year: state.year,
    month: state.month,
    type: 'player',
    text: `【AI 推演 · ${formatDate(state.year, state.month)}】${plan.narrative}`,
    characterIds: characterIds.length > 0 ? characterIds : undefined,
    eventKind: 'intervention_custom',
    reactionContext: characterIds[0]
      ? { actorId: characterIds[0] }
      : { actorId: state.selectedCharacterId },
  }

  entry.reactions = buildSimulationReactions(plan, entry, state.characters)
  return entry
}

function tryExecuteInteraction(
  actionId: InteractionActionId,
  ctx: InteractionContext,
  state: GameState,
): { state: Partial<GameState>; entry: NarrativeEntry; reactions?: Record<string, string> } | null {
  try {
    const result = executeInteraction(actionId, ctx, state)
    const reactions = result.dialogues?.length
      ? dialoguesToReactions(result.dialogues)
      : result.entry.reactions
    return { state: result.state ?? {}, entry: result.entry, reactions }
  } catch (err) {
    console.warn('[AI] 跳过无法执行的互动:', actionId, err)
    return null
  }
}

function applyAction(
  action: AiPlanAction,
  state: GameState,
): {
  state: Partial<GameState>
  entries: NarrativeEntry[]
  reactions?: Record<string, string>
} {
  switch (action.type) {
    case 'interaction': {
      const ctx: InteractionContext = {
        actorId: action.actorId,
        targetId: action.targetId,
        inMeeting: action.inMeeting,
      }
      const result = tryExecuteInteraction(action.actionId, ctx, state)
      if (!result) return { state: {}, entries: [] }
      return {
        state: result.state,
        entries: [result.entry],
        reactions: result.reactions,
      }
    }

    case 'bond_delta': {
      const characters = applyBondDeltaToCharacters(
        state.characters,
        action.fromId,
        action.toId,
        {
          friendship: action.friendship ?? 0,
          romance: action.romance ?? 0,
        },
      )
      return { state: { characters }, entries: [] }
    }

    case 'advance_time': {
      const months = Math.max(1, Math.min(action.months ?? 1, 12))
      let current = state
      const entries: NarrativeEntry[] = []
      let mergedState: Partial<GameState> = {}

      for (let i = 0; i < months; i++) {
        const result = interveneAdvanceTime(current)
        mergedState = {
          ...mergedState,
          ...result.state,
          characters: { ...current.characters, ...result.state.characters },
        }
        current = { ...current, ...mergedState } as GameState
        entries.push(result.entry)
        if (result.extraEntries) entries.push(...result.extraEntries)
      }

      return { state: mergedState, entries }
    }

    default:
      return { state: {}, entries: [] }
  }
}

/** 将 AI 推演计划应用到游戏状态 */
export function executeAiSimulationPlan(
  state: GameState,
  plan: AiSimulationPlan,
): AiExecutionResult {
  let workingState = { ...state }
  const entries: NarrativeEntry[] = []

  const mainEntry = buildMainEntry(plan, workingState)
  entries.push(mainEntry)
  const simulationReactions = mainEntry.reactions

  for (const action of plan.actions ?? []) {
    const result = applyAction(action, workingState)
    if (result.state.characters) {
      workingState = {
        ...workingState,
        characters: { ...workingState.characters, ...result.state.characters },
      }
    }
    if (result.state.year !== undefined) {
      workingState = { ...workingState, year: result.state.year, month: result.state.month! }
    }
    entries.push(...result.entries)
  }

  const { characters, year, month } = workingState
  return {
    state: { characters, year, month },
    entries,
    reactions: simulationReactions,
  }
}
