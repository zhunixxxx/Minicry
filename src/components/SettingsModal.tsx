import { useEffect, useState } from 'react'
import {
  clearAiApiKey,
  loadAiApiKey,
  maskApiKey,
  saveAiApiKey,
} from '../utils/aiKeyStorage'

interface Props {
  open: boolean
  onClose: () => void
  onResetSave: () => void
  onClearSave: () => void
}

type PendingAction = 'reset' | 'clear' | null

const DATA_ACTIONS = [
  {
    id: 'reset' as const,
    label: '重置存档',
    description: '清空当前数据，恢复为预设的金雀花与兰开斯特家族档案。',
    confirmTitle: '确认重置存档？',
    confirmText: '所有修改将丢失，世界将恢复为初始预设状态。此操作不可撤销。',
    confirmLabel: '确认重置',
  },
  {
    id: 'clear' as const,
    label: '清空存档',
    description: '彻底删除所有家族与人物，保留空白世界。',
    confirmTitle: '确认清空存档？',
    confirmText: '所有家族与人物将被永久删除，纪事也将一并清空。此操作不可撤销。',
    confirmLabel: '确认清空',
  },
]

export function SettingsModal({ open, onClose, onResetSave, onClearSave }: Props) {
  const [pending, setPending] = useState<PendingAction>(null)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [savedKey, setSavedKey] = useState<string | undefined>(undefined)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setPending(null)
      setSaveMessage(null)
      return
    }

    const key = loadAiApiKey()
    setSavedKey(key)
    setApiKeyInput(key ?? '')
  }, [open])

  useEffect(() => {
    if (!open) return

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (pending) setPending(null)
        else onClose()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, onClose, pending])

  if (!open) return null

  const pendingAction = DATA_ACTIONS.find((a) => a.id === pending)

  function handleConfirm() {
    if (pending === 'reset') onResetSave()
    else if (pending === 'clear') onClearSave()
    setPending(null)
    onClose()
  }

  function handleSaveApiKey() {
    const trimmed = apiKeyInput.trim()
    saveAiApiKey(trimmed)
    const nextKey = loadAiApiKey()
    setSavedKey(nextKey)
    setApiKeyInput(nextKey ?? '')
    setSaveMessage(trimmed ? 'API Key 已保存' : 'API Key 已清除')
  }

  function handleClearApiKey() {
    clearAiApiKey()
    setApiKeyInput('')
    setSavedKey(undefined)
    setSaveMessage('API Key 已清除')
  }

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal settings-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        <header className="modal-header">
          <div>
            <h2 id="settings-title" className="modal-title">
              设置
            </h2>
            <p className="modal-subtitle">管理世界档案、数据与 AI 配置</p>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="关闭"
          >
            ×
          </button>
        </header>

        <div className="modal-body">
          {pendingAction ? (
            <section className="settings-confirm">
              <h3 className="settings-confirm-title">{pendingAction.confirmTitle}</h3>
              <p className="settings-confirm-text">{pendingAction.confirmText}</p>
              <div className="settings-confirm-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setPending(null)}
                >
                  取消
                </button>
                <button
                  type="button"
                  className="btn-danger"
                  onClick={handleConfirm}
                >
                  {pendingAction.confirmLabel}
                </button>
              </div>
            </section>
          ) : (
            <>
              <section className="settings-section">
                <h3 className="settings-section-title">AI</h3>
                <div className="settings-ai-form">
                  <label className="form-field settings-ai-field">
                    <span>DeepSeek API Key</span>
                    <input
                      type="password"
                      value={apiKeyInput}
                      onChange={(e) => {
                        setApiKeyInput(e.target.value)
                        setSaveMessage(null)
                      }}
                      placeholder="sk-..."
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </label>
                  <p className="settings-ai-hint">
                    用于剧情推演功能，仅保存在本机浏览器中。
                  </p>
                  <div className="settings-ai-actions">
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={handleSaveApiKey}
                    >
                      保存 Key
                    </button>
                    {savedKey ? (
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={handleClearApiKey}
                      >
                        清除
                      </button>
                    ) : null}
                  </div>
                  {saveMessage ? (
                    <p className="settings-ai-feedback" role="status">
                      {saveMessage}
                    </p>
                  ) : null}
                </div>
              </section>

              <section className="settings-section">
                <h3 className="settings-section-title">数据</h3>
              <ul className="settings-action-list">
                {DATA_ACTIONS.map((action) => (
                  <li key={action.id} className="settings-action-item">
                    <div className="settings-action-info">
                      <span className="settings-action-label">{action.label}</span>
                      <p className="settings-action-desc">{action.description}</p>
                    </div>
                    <button
                      type="button"
                      className="btn-secondary settings-action-btn"
                      onClick={() => setPending(action.id)}
                    >
                      {action.label}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
