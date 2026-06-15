import { useMemo, useState } from 'react'
import type { InterventionAction } from '../types/game'
import { mentionValueToPlainText } from '../utils/mentionTokens'
import { MentionTextarea } from './MentionTextarea'

interface CharacterRef {
  id: string
  name: string
}

interface Props {
  characterName: string
  characters: CharacterRef[]
  onAction: (action: InterventionAction, customText?: string) => void
  onSelectCharacter: (id: string) => void
  isProcessing: boolean
  disabled?: boolean
  errorMessage?: string | null
}

const QUICK_ACTIONS: { action: InterventionAction; label: string; icon: string }[] = [
  { action: 'advance_time', label: '推进时间', icon: '⏳' },
]

export function InterventionPanel({
  characterName,
  characters,
  onAction,
  onSelectCharacter,
  isProcessing,
  disabled = false,
  errorMessage = null,
}: Props) {
  const [customText, setCustomText] = useState('')

  const aliveCharacters = useMemo(
    () => characters.filter((c) => c.name),
    [characters],
  )

  function handleSubmit() {
    const trimmed = mentionValueToPlainText(customText).trim()
    if (!trimmed || isProcessing || disabled) return
    onAction('custom', trimmed)
    setCustomText('')
  }

  return (
    <footer className="panel intervention-panel">
      <div className="intervention-inner">
        <div className="intervention-header">
          <span className="panel-label">玩家干预</span>
          <span className="intervention-target">
            当前操控：<strong>{characterName}</strong>
          </span>
        </div>

        <div className="intervention-body">
          <div className="quick-actions">
            {QUICK_ACTIONS.map(({ action, label, icon }) => (
              <button
                key={action}
                type="button"
                className="action-btn"
                disabled={isProcessing || disabled}
                onClick={() => onAction(action)}
              >
                <span className="action-icon">{icon}</span>
                <span className="action-label">{label}</span>
              </button>
            ))}
          </div>

          <div className="custom-intervention">
            <MentionTextarea
              value={customText}
              onChange={setCustomText}
              characters={aliveCharacters}
              onMentionClick={onSelectCharacter}
              placeholder="写下你想发生的事……输入 @ 可补全角色名，例如：「让@艾琳娜 借拜访之名，于花园与@罗万 密会」"
              rows={2}
              disabled={isProcessing || disabled}
              onSubmit={handleSubmit}
            />
            <button
              type="button"
              className="submit-btn"
              disabled={!mentionValueToPlainText(customText).trim() || isProcessing || disabled}
              onClick={handleSubmit}
            >
              {isProcessing ? '推演中…' : 'AI 推演'}
            </button>
          </div>
        </div>

        {errorMessage && (
          <p className="intervention-error" role="alert">
            {errorMessage}
          </p>
        )}
      </div>
    </footer>
  )
}
