import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { CharacterPanel } from './components/CharacterPanel'
import { BornChildModal } from './components/BornChildModal'
import { DivorceCustodyModal } from './components/DivorceCustodyModal'
import { MarriageHouseModal } from './components/MarriageHouseModal'
import { CreateCharacterModal } from './components/CreateCharacterModal'
import { SettingsModal } from './components/SettingsModal'
import { FamilyTreeStage } from './components/FamilyTreeStage'
import { InterventionPanel } from './components/InterventionPanel'
import { NarrativePanel } from './components/NarrativePanel'
import type {
  CharacterReactions,
  CreateCharacterInput,
  GameState,
  InterventionAction,
  MeetingSession,
  NarrativeEntry,
} from './types/game'
import { applyNewCharacter } from './utils/createCharacter'
import {
  getEmptyGameState,
  getInitialGameState,
  getPresetGameState,
  saveGameState,
} from './utils/gameStorage'
import {
  applyDivorce,
  applyMarriage,
  prepareDivorceDraft,
  prepareMarriageDraft,
  type DivorceConfirmInput,
  type DivorceDraft,
  type MarriageConfirmInput,
  type MarriageDraft,
} from './utils/marriage'
import {
  applyReproduction,
  prepareReproductionDraft,
  type ReproductionConfirmInput,
  type ReproductionDraft,
} from './utils/reproduction'
import {
  buildMeetingEndEntry,
  buildMeetingStartEntry,
} from './utils/meetingNarrative'
import { snapshotParticipantBonds } from './utils/relationshipBonds'
import { snapshotParticipantRelations } from './utils/meetingRelations'
import { executeInteraction } from './interactions/executeInteraction'
import {
  buildInteractionDialogues,
  dialoguesToReactions,
} from './interactions/dialogues'
import type { InteractionActionId, InteractionContext } from './types/interactions'
import { requestAiSimulation } from './services/aiService'
import { AiServiceError } from './types/aiSimulation'
import { executeAiSimulationPlan } from './utils/aiSimulationEngine'
import {
  interveneAdvanceTime,
  interveneArrangeMarriage,
  interveneBoostDiplomacy,
  interveneSparkRivalry,
} from './utils/storyEngine'

const REACTION_DURATION_MS = 10000

function findLatestReactiveEntry(
  entries: NarrativeEntry[],
): NarrativeEntry | undefined {
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    const entry = entries[i]
    if (
      (entry.type === 'event' || entry.type === 'player') &&
      entry.reactions &&
      Object.keys(entry.reactions).length > 0
    ) {
      return entry
    }
  }
  return undefined
}

export default function App() {
  const [state, setState] = useState<GameState>(getInitialGameState)
  const [isProcessing, setIsProcessing] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [activeReactions, setActiveReactions] = useState<CharacterReactions>({})
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [settingsModalOpen, setSettingsModalOpen] = useState(false)
  const [reproductionDraft, setReproductionDraft] =
    useState<ReproductionDraft | null>(null)
  const [marriageDraft, setMarriageDraft] = useState<MarriageDraft | null>(null)
  const [divorceDraft, setDivorceDraft] = useState<DivorceDraft | null>(null)
  const [meetingSession, setMeetingSession] = useState<MeetingSession | null>(null)
  const reactionTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const selected = state.characters[state.selectedCharacterId]
  const house = selected ? state.houses[selected.houseId] : undefined
  const hasCharacters = Object.keys(state.characters).length > 0

  const showReactions = useCallback((reactions: CharacterReactions) => {
    if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current)
    if (Object.keys(reactions).length === 0) {
      setActiveReactions({})
      return
    }
    setActiveReactions(reactions)
    reactionTimerRef.current = setTimeout(() => {
      setActiveReactions({})
    }, REACTION_DURATION_MS)
  }, [])

  useEffect(() => {
    saveGameState(state)
  }, [state])

  useEffect(() => {
    const latest = findLatestReactiveEntry(state.narrative)
    if (latest?.reactions) showReactions(latest.reactions)
    return () => {
      if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current)
    }
  }, [showReactions])

  const handleCreateCharacter = useCallback((input: CreateCharacterInput) => {
    const result = applyNewCharacter(state, input)
    setState((prev) => ({
      ...prev,
      ...result.state,
      characters: { ...prev.characters, ...result.state.characters },
      narrative: [...prev.narrative, result.entry],
    }))
  }, [state])

  const handleSelectCharacter = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      selectedCharacterId: id,
      treeFocusCharacterId: id,
      focusedHouseId: prev.characters[id]?.houseId ?? prev.focusedHouseId,
    }))
  }, [])

  /** 会晤中切换主控：仅更新左侧档案，不改变家谱视图 */
  const handleSelectProtagonist = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      selectedCharacterId: id,
      focusedHouseId: prev.characters[id]?.houseId ?? prev.focusedHouseId,
    }))
  }, [])

  const handleFocusHouse = useCallback((houseId: string) => {
    if (meetingSession) return
    setState((prev) => {
      const member = Object.values(prev.characters).find(
        (c) => c.isAlive && c.houseId === houseId,
      )
      if (!member) return { ...prev, focusedHouseId: houseId }
      return {
        ...prev,
        focusedHouseId: houseId,
        treeFocusCharacterId: member.id,
      }
    })
  }, [meetingSession])

  const handleStartMeeting = useCallback((participantIds: string[]) => {
    const unique = [...new Set(participantIds)].filter(
      (id) => state.characters[id]?.isAlive,
    )
    if (unique.length < 2) return

    const session: MeetingSession = {
      hostId: state.selectedCharacterId,
      participantIds: unique,
      bornChildIds: [],
      initialRelations: snapshotParticipantRelations(unique, state.characters),
      initialBonds: snapshotParticipantBonds(unique, state.characters),
    }
    const entry = buildMeetingStartEntry(state, session)

    setMeetingSession(session)
    setState((prev) => ({
      ...prev,
      narrative: [...prev.narrative, entry],
    }))
    if (entry.reactions) showReactions(entry.reactions)
  }, [state, showReactions])

  const handleEndMeeting = useCallback(() => {
    if (!meetingSession) return

    const entry = buildMeetingEndEntry(state, meetingSession)

    setMeetingSession(null)
    setState((prev) => ({
      ...prev,
      narrative: [...prev.narrative, entry],
    }))
    if (entry.reactions) showReactions(entry.reactions)
  }, [meetingSession, state, showReactions])

  const handleExecuteInteraction = useCallback(
    (actionId: InteractionActionId, ctx: InteractionContext) => {
      if (actionId === 'romantic.reproduce') {
        const draft = prepareReproductionDraft(ctx, state)
        if (draft) setReproductionDraft(draft)
        return
      }

      if (actionId === 'marriage.marry') {
        const draft = prepareMarriageDraft(ctx, state)
        if (draft) setMarriageDraft(draft)
        return
      }

      if (
        actionId === 'marriage.divorceAmicable' ||
        actionId === 'marriage.divorceLegal'
      ) {
        const kind =
          actionId === 'marriage.divorceAmicable' ? 'amicable' : 'legal'
        const draft = prepareDivorceDraft(ctx, state, kind)
        if (!draft) return
        if (draft.sharedChildren.length === 0) {
          const result = applyDivorce(state, draft, { childCustody: {} })
          setState((prev) => ({
            ...prev,
            ...result.state,
            characters: { ...prev.characters, ...result.state.characters },
            narrative: [...prev.narrative, result.entry],
          }))
          if (result.entry.reactions) {
            showReactions(result.entry.reactions)
          }
        } else {
          setDivorceDraft(draft)
        }
        return
      }

      try {
        const result = executeInteraction(actionId, ctx, state)
        setState((prev) => ({
          ...prev,
          ...result.state,
          characters: result.state?.characters
            ? { ...prev.characters, ...result.state.characters }
            : prev.characters,
          narrative: [...prev.narrative, result.entry],
        }))
        if (result.dialogues?.length) {
          showReactions(dialoguesToReactions(result.dialogues))
        } else if (result.entry.reactions) {
          showReactions(result.entry.reactions)
        }
      } catch (err) {
        console.error(err)
      }
    },
    [state, showReactions],
  )

  const handleConfirmMarriage = useCallback(
    (confirm: MarriageConfirmInput) => {
      if (!marriageDraft) return
      const ctx = {
        actorId: marriageDraft.actorId,
        targetId: marriageDraft.targetId,
      }
      const dialogues = buildInteractionDialogues('marriage.marry', ctx, state)
      const result = applyMarriage(state, marriageDraft, confirm)
      setState((prev) => ({
        ...prev,
        ...result.state,
        characters: { ...prev.characters, ...result.state.characters },
        narrative: [...prev.narrative, result.entry],
        focusedHouseId: result.joinedHouseId,
        treeFocusCharacterId: marriageDraft.actorId,
      }))
      if (dialogues.length > 0) {
        showReactions(dialoguesToReactions(dialogues))
      }
      setMarriageDraft(null)
    },
    [marriageDraft, state, showReactions],
  )

  const handleConfirmDivorce = useCallback(
    (confirm: DivorceConfirmInput) => {
      if (!divorceDraft) return
      const result = applyDivorce(state, divorceDraft, confirm)
      setState((prev) => ({
        ...prev,
        ...result.state,
        characters: { ...prev.characters, ...result.state.characters },
        narrative: [...prev.narrative, result.entry],
      }))
      if (result.entry.reactions) {
        showReactions(result.entry.reactions)
      }
      setDivorceDraft(null)
    },
    [divorceDraft, state, showReactions],
  )

  const handleConfirmReproduction = useCallback(
    (confirm: ReproductionConfirmInput) => {
      if (!reproductionDraft) return
      const result = applyReproduction(state, reproductionDraft, confirm)
      const newCharId = Object.keys(result.state.characters ?? {}).find(
        (id) => !state.characters[id],
      )

      setState((prev) => ({
        ...prev,
        ...result.state,
        characters: { ...prev.characters, ...result.state.characters },
        narrative: [...prev.narrative, result.entry],
      }))
      if (result.entry.reactions) {
        showReactions(result.entry.reactions)
      }

      if (meetingSession && newCharId) {
        const { fatherId, motherId } = reproductionDraft
        const parentsInMeeting =
          meetingSession.participantIds.includes(fatherId) &&
          meetingSession.participantIds.includes(motherId)
        if (parentsInMeeting) {
          setMeetingSession((prev) =>
            prev
              ? {
                  ...prev,
                  bornChildIds: [...prev.bornChildIds, newCharId],
                }
              : null,
          )
        }
      }

      setReproductionDraft(null)
    },
    [reproductionDraft, state, showReactions, meetingSession],
  )

  const clearSessionState = useCallback(() => {
    setActiveReactions({})
    setCreateModalOpen(false)
    setSettingsModalOpen(false)
    setReproductionDraft(null)
    setMarriageDraft(null)
    setDivorceDraft(null)
    setMeetingSession(null)
    if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current)
  }, [])

  const handleResetSave = useCallback(() => {
    clearSessionState()
    setState(getPresetGameState())
  }, [clearSessionState])

  const handleClearSave = useCallback(() => {
    clearSessionState()
    setState(getEmptyGameState())
  }, [clearSessionState])

  const applyIntervention = useCallback(
    async (action: InterventionAction, customText?: string) => {
      setIsProcessing(true)
      setAiError(null)

      if (action === 'custom') {
        try {
          const { plan } = await requestAiSimulation(state, customText ?? '')
          const result = executeAiSimulationPlan(state, plan)

          setState((prev) => ({
            ...prev,
            ...result.state,
            characters: result.state.characters
              ? { ...prev.characters, ...result.state.characters }
              : prev.characters,
            narrative: [...prev.narrative, ...result.entries],
          }))

          if (result.reactions) {
            showReactions(result.reactions)
          }
        } catch (err) {
          if (err instanceof AiServiceError) {
            setAiError(err.message)
          } else {
            setAiError('AI 推演失败，请稍后重试')
            console.error(err)
          }
        } finally {
          setIsProcessing(false)
        }
        return
      }

      await new Promise((r) => setTimeout(r, 600))

      let result: {
        state: Partial<GameState>
        entry: import('./types/game').NarrativeEntry
        extraEntries?: import('./types/game').NarrativeEntry[]
      }

      switch (action) {
        case 'advance_time':
          result = interveneAdvanceTime(state)
          break
        case 'boost_diplomacy':
          result = interveneBoostDiplomacy(state)
          break
        case 'arrange_marriage':
          result = interveneArrangeMarriage(state)
          break
        case 'spark_rivalry':
          result = interveneSparkRivalry(state)
          break
        default:
          setIsProcessing(false)
          return
      }

      setState((prev) => ({
        ...prev,
        ...result.state,
        characters: { ...prev.characters, ...result.state.characters },
        narrative: [
          ...prev.narrative,
          ...(result.extraEntries ?? []),
          result.entry,
        ],
      }))

      if (result.entry.reactions) {
        showReactions(result.entry.reactions)
      }

      setIsProcessing(false)
    },
    [state, showReactions],
  )

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <h1 className="brand-title">Minicry</h1>
          <p className="brand-subtitle">叙事沙盒</p>
        </div>
        <div className="header-center">
          <nav className="house-tabs">
            {Object.values(state.houses).map((h) => (
              <button
                key={h.id}
                type="button"
                className={`house-tab ${state.focusedHouseId === h.id ? 'active' : ''}`}
                style={{ '--house-color': h.color } as CSSProperties}
                onClick={() => handleFocusHouse(h.id)}
              >
                <span className="house-tab-emblem">{h.emblem}</span>
                {h.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="create-char-btn"
            onClick={() => setCreateModalOpen(true)}
          >
            <span className="create-char-icon">＋</span>
            创建人物
          </button>
          <button
            type="button"
            className="settings-btn"
            onClick={() => setSettingsModalOpen(true)}
            aria-label="设置"
            title="设置"
          >
            <span className="settings-btn-icon" aria-hidden="true">⚙</span>
          </button>
        </div>
      </header>

      <CreateCharacterModal
        open={createModalOpen}
        state={state}
        onClose={() => setCreateModalOpen(false)}
        onCreate={handleCreateCharacter}
      />

      <SettingsModal
        open={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        onResetSave={handleResetSave}
        onClearSave={handleClearSave}
      />

      <BornChildModal
        open={reproductionDraft !== null}
        draft={reproductionDraft}
        state={state}
        onConfirm={handleConfirmReproduction}
      />

      <MarriageHouseModal
        open={marriageDraft !== null}
        draft={marriageDraft}
        state={state}
        onConfirm={handleConfirmMarriage}
      />

      <DivorceCustodyModal
        open={divorceDraft !== null}
        draft={divorceDraft}
        state={state}
        onConfirm={handleConfirmDivorce}
      />

      <div className="game-layout">
        <CharacterPanel
          character={selected}
          house={house}
          characters={state.characters}
          onSelectCharacter={handleSelectCharacter}
        />

        <FamilyTreeStage
          focusCharacterId={state.treeFocusCharacterId}
          focusedHouseId={state.focusedHouseId}
          selectedCharacterId={state.selectedCharacterId}
          state={state}
          houses={state.houses}
          characterReactions={activeReactions}
          meetingSession={meetingSession}
          onSelect={handleSelectCharacter}
          onSelectProtagonist={handleSelectProtagonist}
          onFocusHouse={handleFocusHouse}
          onExecuteInteraction={handleExecuteInteraction}
          onStartMeeting={handleStartMeeting}
          onEndMeeting={handleEndMeeting}
        />

        <NarrativePanel
          entries={state.narrative}
          year={state.year}
          month={state.month}
          characters={state.characters}
          onSelectCharacter={handleSelectCharacter}
        />
      </div>

      <InterventionPanel
        characterName={selected?.name ?? '—'}
        characters={Object.values(state.characters)
          .filter((c) => c.isAlive)
          .map((c) => ({ id: c.id, name: c.name }))}
        onAction={applyIntervention}
        onSelectCharacter={handleSelectCharacter}
        isProcessing={isProcessing}
        disabled={!hasCharacters}
        errorMessage={aiError}
      />
    </div>
  )
}
