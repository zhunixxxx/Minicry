import { useEffect, useState } from 'react'
import type { Character, CreateCharacterInput, GameState } from '../types/game'
import {
  AVATAR_PRESETS,
  DEFAULT_ATTRIBUTES,
  getParentOptions,
  getSpouseOptions,
  parsePreferencesInput,
  parseTraitsInput,
} from '../utils/createCharacter'

interface Props {
  open: boolean
  state: GameState
  onClose: () => void
  onCreate: (input: CreateCharacterInput) => void
}

const ATTR_LABELS: Record<keyof CreateCharacterInput['attributes'], string> = {
  diplomacy: '外交',
  martial: '军事',
  stewardship: '管理',
  intrigue: '谋略',
  learning: '学识',
}

function emptyForm(houseId: string): CreateCharacterInput {
  return {
    name: '',
    age: 20,
    gender: 'male',
    title: '',
    houseId,
    avatar: '👤',
    traits: [],
    preferences: [],
    bio: '',
    parentIds: [],
    spouseId: '',
    attributes: { ...DEFAULT_ATTRIBUTES },
  }
}

export function CreateCharacterModal({ open, state, onClose, onCreate }: Props) {
  const [form, setForm] = useState<CreateCharacterInput>(() =>
    emptyForm(state.focusedHouseId),
  )
  const [traitsText, setTraitsText] = useState('')
  const [prefsText, setPrefsText] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setForm(emptyForm(state.focusedHouseId))
    setTraitsText('')
    setPrefsText('')
    setError('')
  }, [open, state.focusedHouseId])

  useEffect(() => {
    if (!open) return

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const parentOptions = getParentOptions(state.characters, form.houseId)
  const spouseOptions = getSpouseOptions(state.characters, form.houseId, [
    ...form.parentIds,
  ])

  function update<K extends keyof CreateCharacterInput>(
    key: K,
    value: CreateCharacterInput[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function toggleParent(parentId: string) {
    setForm((prev) => {
      const exists = prev.parentIds.includes(parentId)
      const parentIds = exists
        ? prev.parentIds.filter((id) => id !== parentId)
        : [...prev.parentIds, parentId]
      const spouseId =
        prev.spouseId && parentIds.includes(prev.spouseId) ? '' : prev.spouseId
      return { ...prev, parentIds, spouseId }
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('请填写人物姓名')
      return
    }
    if (form.age < 0 || form.age > 120) {
      setError('年龄须在 0–120 之间')
      return
    }

    onCreate({
      ...form,
      traits: parseTraitsInput(traitsText),
      preferences: parsePreferencesInput(prefsText),
    })
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal create-char-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-char-title"
      >
        <header className="modal-header">
          <div>
            <h2 id="create-char-title" className="modal-title">
              创建新人物
            </h2>
            <p className="modal-subtitle">将新成员编入当前世界谱系</p>
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

        <form className="modal-body" onSubmit={handleSubmit}>
          <section className="form-section">
            <h3>基本信息</h3>
            <div className="form-grid">
              <label className="form-field form-field--wide">
                <span>姓名 *</span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  placeholder="例如：艾伦·黑木"
                  autoFocus
                />
              </label>
              <label className="form-field">
                <span>年龄</span>
                <input
                  type="number"
                  min={0}
                  max={120}
                  value={form.age}
                  onChange={(e) => update('age', Number(e.target.value))}
                />
              </label>
              <label className="form-field">
                <span>性别</span>
                <select
                  value={form.gender}
                  onChange={(e) =>
                    update('gender', e.target.value as CreateCharacterInput['gender'])
                  }
                >
                  <option value="male">男</option>
                  <option value="female">女</option>
                  <option value="other">其他</option>
                </select>
              </label>
              <label className="form-field">
                <span>职业 / 头衔</span>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => update('title', e.target.value)}
                  placeholder="例如：黑木骑士"
                />
              </label>
              <label className="form-field">
                <span>所属家族</span>
                <select
                  value={form.houseId}
                  onChange={(e) => {
                    update('houseId', e.target.value)
                    update('parentIds', [])
                    update('spouseId', '')
                  }}
                >
                  {Object.values(state.houses).map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.emblem} {h.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="form-field">
              <span>头像</span>
              <div className="avatar-picker">
                {AVATAR_PRESETS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className={`avatar-option ${form.avatar === emoji ? 'selected' : ''}`}
                    onClick={() => update('avatar', emoji)}
                  >
                    {emoji}
                  </button>
                ))}
                <input
                  className="avatar-custom"
                  type="text"
                  maxLength={2}
                  value={form.avatar}
                  onChange={(e) => update('avatar', e.target.value)}
                  placeholder="自定义"
                />
              </div>
            </div>
          </section>

          <section className="form-section">
            <h3>性格与传记</h3>
            <div className="form-grid">
              <label className="form-field form-field--wide">
                <span>性格特质</span>
                <input
                  type="text"
                  value={traitsText}
                  onChange={(e) => setTraitsText(e.target.value)}
                  placeholder="用逗号分隔，如：勇敢、谨慎"
                />
              </label>
              <label className="form-field form-field--wide">
                <span>喜好</span>
                <input
                  type="text"
                  value={prefsText}
                  onChange={(e) => setPrefsText(e.target.value)}
                  placeholder="用逗号分隔，如：狩猎、诗歌"
                />
              </label>
              <label className="form-field form-field--full">
                <span>人物传记</span>
                <textarea
                  rows={3}
                  value={form.bio}
                  onChange={(e) => update('bio', e.target.value)}
                  placeholder="简述此人的出身与志向……"
                />
              </label>
            </div>
          </section>

          <section className="form-section">
            <h3>家族关系</h3>
            <div className="form-grid">
              <div className="form-field form-field--wide">
                <span>父母（可选，同家族）</span>
                {parentOptions.length === 0 ? (
                  <p className="form-hint">当前家族暂无在世族人可选</p>
                ) : (
                  <div className="checkbox-list">
                    {parentOptions.map((c: Character) => (
                      <label key={c.id} className="checkbox-item">
                        <input
                          type="checkbox"
                          checked={form.parentIds.includes(c.id)}
                          onChange={() => toggleParent(c.id)}
                        />
                        <span>
                          {c.avatar} {c.name}（{c.age}岁）
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <label className="form-field form-field--wide">
                <span>配偶（可选）</span>
                <select
                  value={form.spouseId}
                  onChange={(e) => update('spouseId', e.target.value)}
                >
                  <option value="">— 无 —</option>
                  {spouseOptions.map((c) => {
                    const h = state.houses[c.houseId]
                    return (
                      <option key={c.id} value={c.id}>
                        {c.avatar} {c.name} · {h?.name ?? '外族'}
                      </option>
                    )
                  })}
                </select>
              </label>
            </div>
          </section>

          <section className="form-section">
            <h3>人物属性</h3>
            <div className="attr-input-grid">
              {(Object.keys(ATTR_LABELS) as Array<keyof typeof ATTR_LABELS>).map(
                (key) => (
                  <label key={key} className="attr-input-row">
                    <span>{ATTR_LABELS[key]}</span>
                    <input
                      type="range"
                      min={1}
                      max={20}
                      value={form.attributes[key]}
                      onChange={(e) =>
                        update('attributes', {
                          ...form.attributes,
                          [key]: Number(e.target.value),
                        })
                      }
                    />
                    <span className="attr-input-value">{form.attributes[key]}</span>
                  </label>
                ),
              )}
            </div>
          </section>

          {error && <p className="form-error">{error}</p>}

          <footer className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn-primary">
              编入谱系
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}
