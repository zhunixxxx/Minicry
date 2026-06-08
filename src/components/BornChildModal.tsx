import { useEffect, useState } from 'react'
import type { GameState } from '../types/game'
import {
  surnameForHouse,
  type ReproductionConfirmInput,
  type ReproductionDraft,
} from '../utils/reproduction'

interface Props {
  open: boolean
  draft: ReproductionDraft | null
  state: GameState
  onConfirm: (confirm: ReproductionConfirmInput) => void
}

const GENDER_LABEL = { male: '男', female: '女' } as const

export function BornChildModal({
  open,
  draft,
  state,
  onConfirm,
}: Props) {
  const [givenName, setGivenName] = useState('')
  const [surname, setSurname] = useState('')
  const [houseId, setHouseId] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open || !draft) return
    const defaultHouseId = draft.motherHouseId
    setGivenName('')
    setHouseId(defaultHouseId)
    setSurname(surnameForHouse(draft, defaultHouseId))
    setError('')
  }, [open, draft])

  useEffect(() => {
    if (!open) return

    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open || !draft) return null

  const fatherHouse = state.houses[draft.fatherHouseId]
  const motherHouse = state.houses[draft.motherHouseId]
  const sameHouse = draft.fatherHouseId === draft.motherHouseId

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!givenName.trim()) {
      setError('请为孩子取名')
      return
    }
    if (!surname.trim()) {
      setError('请填写姓氏')
      return
    }
    if (!houseId) {
      setError('请选择入籍家族')
      return
    }

    onConfirm({
      givenName: givenName.trim(),
      surname: surname.trim(),
      houseId,
    })
  }

  return (
    <div className="modal-overlay" role="presentation">
      <div
        className="modal create-char-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="born-child-title"
      >
        <header className="modal-header">
          <div>
            <h2 id="born-child-title" className="modal-title">
              新生儿降生
            </h2>
            <p className="modal-subtitle">
              {draft.fatherName} 与 {draft.motherName} 喜得
              {GENDER_LABEL[draft.childGender]}婴，请为孩子命名并入籍
            </p>
          </div>
        </header>

        <form className="modal-body" onSubmit={handleSubmit}>
          <section className="form-section">
            <h3>命名入籍</h3>
            <div className="form-grid form-grid--3">
              <label className="form-field">
                <span>姓氏 *</span>
                <input
                  type="text"
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  autoFocus
                />
              </label>
              <label className="form-field">
                <span>名字 *</span>
                <input
                  type="text"
                  value={givenName}
                  onChange={(e) => setGivenName(e.target.value)}
                  placeholder="为孩子取名"
                />
              </label>
              <label className="form-field">
                <span>性别</span>
                <select value={draft.childGender} disabled>
                  <option value="male">男</option>
                  <option value="female">女</option>
                </select>
              </label>
            </div>

            <div className="form-grid">
              <div className="form-field form-field--full">
                <span>入籍家族 *</span>
                <div className="house-choice-list">
                  {sameHouse ? (
                    <label className="house-choice-item">
                      <input
                        type="radio"
                        name="houseId"
                        value={draft.fatherHouseId}
                        checked={houseId === draft.fatherHouseId}
                        onChange={() => {
                          setHouseId(draft.fatherHouseId)
                          setSurname(surnameForHouse(draft, draft.fatherHouseId))
                        }}
                      />
                      <span className="house-choice-text">
                        <span className="house-choice-name">
                          {fatherHouse?.emblem} {fatherHouse?.name ?? '本族'}
                        </span>
                        <span className="form-hint-inline">
                          父：{draft.fatherName} · 母：{draft.motherName}
                        </span>
                      </span>
                    </label>
                  ) : (
                    <>
                      <label className="house-choice-item">
                        <input
                          type="radio"
                          name="houseId"
                          value={draft.fatherHouseId}
                          checked={houseId === draft.fatherHouseId}
                          onChange={() => {
                            setHouseId(draft.fatherHouseId)
                            setSurname(surnameForHouse(draft, draft.fatherHouseId))
                          }}
                        />
                        <span className="house-choice-text">
                          <span className="house-choice-name">
                            {fatherHouse?.emblem}{' '}
                            {fatherHouse?.name ?? '父方家族'}
                          </span>
                          <span className="form-hint-inline">
                            父：{draft.fatherName}
                          </span>
                        </span>
                      </label>
                      <label className="house-choice-item">
                        <input
                          type="radio"
                          name="houseId"
                          value={draft.motherHouseId}
                          checked={houseId === draft.motherHouseId}
                          onChange={() => {
                            setHouseId(draft.motherHouseId)
                            setSurname(surnameForHouse(draft, draft.motherHouseId))
                          }}
                        />
                        <span className="house-choice-text">
                          <span className="house-choice-name">
                            {motherHouse?.emblem}{' '}
                            {motherHouse?.name ?? '母方家族'}
                          </span>
                          <span className="form-hint-inline">
                            母：{draft.motherName}
                          </span>
                        </span>
                      </label>
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="form-section">
            <h3>继承特质</h3>
            <div className="form-grid">
              <div className="form-field form-field--full">
                <span>自父母各继承一项性格</span>
                {draft.inheritedTraits.length > 0 ? (
                  <div className="chip-picker chip-picker--readonly">
                    {draft.inheritedTraits.map((trait) => (
                      <span
                        key={trait}
                        className="chip-option chip-trait selected"
                      >
                        {trait}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="form-hint">未继承父母特质</p>
                )}
              </div>
            </div>
          </section>

          {error && <p className="form-error">{error}</p>}

          <footer className="modal-footer">
            <button type="submit" className="btn-primary">
              记入谱系
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}
