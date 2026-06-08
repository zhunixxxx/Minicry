import { useState } from 'react'
import type { InterventionAction } from '../types/game'

interface Props {
  characterName: string
  onAction: (action: InterventionAction, customText?: string) => void
  isProcessing: boolean
  disabled?: boolean
}

const QUICK_ACTIONS: { action: InterventionAction; label: string; icon: string }[] = [
  { action: 'advance_time', label: '推进时间', icon: '⏳' },
  { action: 'boost_diplomacy', label: '公关斡旋', icon: '🤝' },
  { action: 'arrange_marriage', label: '撮合婚约', icon: '💍' },
  { action: 'spark_rivalry', label: '挑起争端', icon: '⚔️' },
]

export function InterventionPanel({
  characterName,
  onAction,
  isProcessing,
  disabled = false,
}: Props) {
  const [customText, setCustomText] = useState('')

  function handleSubmit() {
    const trimmed = customText.trim()
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
            <textarea
              className="custom-input"
              placeholder="写下你想发生的事……例如：「让艾琳娜秘密会见罗万，商议停战协议」"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit()
                }
              }}
              rows={2}
              disabled={isProcessing || disabled}
            />
            <button
              type="button"
              className="submit-btn"
              disabled={!customText.trim() || isProcessing || disabled}
              onClick={handleSubmit}
            >
              {isProcessing ? '推演中…' : 'AI 推演'}
            </button>
          </div>
        </div>
      </div>
    </footer>
  )
}
