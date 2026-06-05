import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { CharacterPanel } from './components/CharacterPanel'
import { CreateCharacterModal } from './components/CreateCharacterModal'
import { FamilyTreeStage } from './components/FamilyTreeStage'
import { InterventionPanel } from './components/InterventionPanel'
import { NarrativePanel } from './components/NarrativePanel'
import { initialGameState } from './data/initialState'
import type {
  CharacterReactions,
  CreateCharacterInput,
  GameState,
  InterventionAction,
  NarrativeEntry,
} from './types/game'
import { applyNewCharacter } from './utils/createCharacter'
import {
  interveneAdvanceTime,
  interveneArrangeMarriage,
  interveneBoostDiplomacy,
  interveneCustomStory,
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
  const [state, setState] = useState<GameState>(initialGameState)
  const [isProcessing, setIsProcessing] = useState(false)
  const [activeReactions, setActiveReactions] = useState<CharacterReactions>({})
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const reactionTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const selected = state.characters[state.selectedCharacterId]
  const house = state.houses[selected.houseId]

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
    const latest = findLatestReactiveEntry(initialGameState.narrative)
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
      focusedHouseId: prev.characters[id]?.houseId ?? prev.focusedHouseId,
    }))
  }, [])

  const applyIntervention = useCallback(
    async (action: InterventionAction, customText?: string) => {
      setIsProcessing(true)

      await new Promise((r) => setTimeout(r, 600))

      let result: { state: Partial<GameState>; entry: import('./types/game').NarrativeEntry }

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
        case 'custom':
          result = interveneCustomStory(state, customText ?? '')
          break
        default:
          setIsProcessing(false)
          return
      }

      setState((prev) => ({
        ...prev,
        ...result.state,
        characters: { ...prev.characters, ...result.state.characters },
        narrative: [...prev.narrative, result.entry],
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
          <p className="brand-subtitle">叙事沙盒 · 家谱纪元</p>
        </div>
        <div className="header-center">
          <nav className="house-tabs">
            {Object.values(state.houses).map((h) => (
              <button
                key={h.id}
                type="button"
                className={`house-tab ${state.focusedHouseId === h.id ? 'active' : ''}`}
                style={{ '--house-color': h.color } as CSSProperties}
                onClick={() => {
                  const member = Object.values(state.characters).find(
                    (c) => c.houseId === h.id,
                  )
                  if (member) {
                    setState((prev) => ({
                      ...prev,
                      focusedHouseId: h.id,
                      selectedCharacterId: member.id,
                    }))
                  }
                }}
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
        </div>
      </header>

      <CreateCharacterModal
        open={createModalOpen}
        state={state}
        onClose={() => setCreateModalOpen(false)}
        onCreate={handleCreateCharacter}
      />

      <div className="game-layout">
        <CharacterPanel
          character={selected}
          house={house}
          characters={state.characters}
          onSelectCharacter={handleSelectCharacter}
        />

        <FamilyTreeStage
          focusCharacterId={state.selectedCharacterId}
          selectedCharacterId={state.selectedCharacterId}
          characters={state.characters}
          houses={state.houses}
          characterReactions={activeReactions}
          onSelect={handleSelectCharacter}
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
        characterName={selected.name}
        onAction={applyIntervention}
        isProcessing={isProcessing}
      />
    </div>
  )
}
