import { useEffect, useState } from 'react'
import type { Character, CreateCharacterInput, GameState } from '../types/game'
import { PREFERENCE_PRESETS, TRAIT_PRESETS } from '../data/characterPresets'
import {
  DEFAULT_ATTRIBUTES,
  getParentOptions,
  getSpouseOptions,
  togglePresetValue,
} from '../utils/createCharacter'
import {
  AGE_GROUP_LABELS,
  getAgeGroup,
  getAvatarOptions,
} from '../utils/avatars'
import { CharacterAvatar } from './CharacterAvatar'

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

function defaultAvatar(gender: CreateCharacterInput['gender'], age: number): string {
  return getAvatarOptions(gender, age)[0]
}

function emptyForm(houseId: string): CreateCharacterInput {
  const gender: CreateCharacterInput['gender'] = 'male'
  const age = 20
  return {
    surname: '',
    givenName: '',
    nickname: '',
    age,
    gender,
    title: '',
    houseId,
    avatar: defaultAvatar(gender, age),
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
  const [ageInput, setAgeInput] = useState('20')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    const next = emptyForm(state.focusedHouseId)
    setForm(next)
    setAgeInput(String(next.age))
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

  const avatarOptions = getAvatarOptions(form.gender, form.age)
  const ageGroup = getAgeGroup(form.age)

  useEffect(() => {
    if (!open) return
    setForm((prev) => {
      const options = getAvatarOptions(prev.gender, prev.age)
      const avatar = options.includes(prev.avatar) ? prev.avatar : options[0]
      if (avatar === prev.avatar) return prev
      return { ...prev, avatar }
    })
  }, [open, form.gender, form.age])

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

  function toggleTrait(trait: string) {
    setForm((prev) => ({
      ...prev,
      traits: togglePresetValue(prev.traits, trait),
    }))
  }

  function togglePreference(pref: string) {
    setForm((prev) => ({
      ...prev,
      preferences: togglePresetValue(prev.preferences, pref),
    }))
  }

  function normalizeAge(raw: string): number | null {
    if (raw.trim() === '') return null
    const n = Number(raw)
    if (!Number.isFinite(n) || !Number.isInteger(n)) return null
    return n
  }

  function commitAge(raw: string): number {
    const n = normalizeAge(raw)
    const clamped = Math.min(120, Math.max(0, n ?? 0))
    setAgeInput(String(clamped))
    update('age', clamped)
    return clamped
  }

  function handleAgeChange(raw: string) {
    setAgeInput(raw)
    const n = normalizeAge(raw)
    if (n !== null) {
      update('age', Math.min(120, Math.max(0, n)))
    }
  }

  function handleAgeBlur() {
    commitAge(ageInput)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const age = commitAge(ageInput)
    if (!form.surname.trim()) {
      setError('请填写姓氏')
      return
    }
    if (!form.givenName.trim()) {
      setError('请填写名字')
      return
    }
    if (age < 0 || age > 120) {
      setError('年龄须在 0–120 之间')
      return
    }

    onCreate({ ...form, age })
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
            <div className="form-grid form-grid--3">
              <label className="form-field">
                <span>姓氏 *</span>
                <input
                  type="text"
                  value={form.surname}
                  onChange={(e) => update('surname', e.target.value)}
                  autoFocus
                />
              </label>
              <label className="form-field">
                <span>名称 *</span>
                <input
                  type="text"
                  value={form.givenName}
                  onChange={(e) => update('givenName', e.target.value)}
                />
              </label>
              <label className="form-field">
                <span>昵称</span>
                <input
                  type="text"
                  value={form.nickname}
                  onChange={(e) => update('nickname', e.target.value)}
                  placeholder="例如：灰狼"
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
                </select>
              </label>
              <label className="form-field">
                <span>年龄</span>
                <input
                  type="number"
                  min={0}
                  max={120}
                  value={ageInput}
                  onChange={(e) => handleAgeChange(e.target.value)}
                  onBlur={handleAgeBlur}
                />
              </label>
              <label className="form-field">
                <span>职业 / 头衔</span>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => update('title', e.target.value)}
                />
              </label>
            </div>
            <div className="form-grid">
              <label className="form-field form-field--wide">
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
              <span>
                头像
                <span className="form-hint-inline">
                  （{form.gender === 'male' ? '男' : '女'} · {AGE_GROUP_LABELS[ageGroup]}）
                </span>
              </span>
              <div className="avatar-picker avatar-picker--generated">
                {avatarOptions.map((avatarId) => (
                  <button
                    key={avatarId}
                    type="button"
                    className={`avatar-option avatar-option--svg ${form.avatar === avatarId ? 'selected' : ''}`}
                    onClick={() => update('avatar', avatarId)}
                    title="选择头像"
                  >
                    <CharacterAvatar avatar={avatarId} size={44} />
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="form-section">
            <h3>性格与传记</h3>
            <div className="form-grid">
              <div className="form-field form-field--full">
                <span>性格特质</span>
                <div className="chip-picker">
                  {TRAIT_PRESETS.map((trait) => (
                    <button
                      key={trait}
                      type="button"
                      className={`chip-option chip-trait ${form.traits.includes(trait) ? 'selected' : ''}`}
                      onClick={() => toggleTrait(trait)}
                    >
                      {trait}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-field form-field--full">
                <span>喜好</span>
                <div className="chip-picker">
                  {PREFERENCE_PRESETS.map((pref) => (
                    <button
                      key={pref}
                      type="button"
                      className={`chip-option chip-pref ${form.preferences.includes(pref) ? 'selected' : ''}`}
                      onClick={() => togglePreference(pref)}
                    >
                      {pref}
                    </button>
                  ))}
                </div>
              </div>
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
                        <CharacterAvatar
                          avatar={c.avatar}
                          size={22}
                          className="checkbox-item-avatar"
                        />
                        <span className="checkbox-item-text">
                          {c.name}
                          {c.nickname ? `「${c.nickname}」` : ''}
                          <span className="checkbox-item-meta">（{c.age}岁）</span>
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
                        {c.name}
                        {c.nickname ? `「${c.nickname}」` : ''} · {h?.name ?? '外族'}
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
