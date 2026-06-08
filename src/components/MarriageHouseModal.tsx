import { useEffect, useMemo, useState } from 'react'
import type { GameState } from '../types/game'
import {
  getMarriageMoverName,
  getMarriageRelocatableChildren,
  type MarriageConfirmInput,
  type MarriageDraft,
} from '../utils/marriage'

interface Props {
  open: boolean
  draft: MarriageDraft | null
  state: GameState
  onConfirm: (confirm: MarriageConfirmInput) => void
}

export function MarriageHouseModal({
  open,
  draft,
  state,
  onConfirm,
}: Props) {
  const [houseId, setHouseId] = useState('')
  const [bringChildIds, setBringChildIds] = useState<string[]>([])
  const [error, setError] = useState('')

  const relocatableChildren = useMemo(() => {
    if (!draft || !houseId) return []
    return getMarriageRelocatableChildren(draft, houseId, state.characters)
  }, [draft, houseId, state.characters])

  useEffect(() => {
    if (!open || !draft) return
    setHouseId(draft.actorHouseId)
    setError('')
  }, [open, draft])

  useEffect(() => {
    setBringChildIds(relocatableChildren.map((c) => c.id))
  }, [relocatableChildren])

  useEffect(() => {
    if (!open) return

    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open || !draft) return null

  const actorHouse = state.houses[draft.actorHouseId]
  const targetHouse = state.houses[draft.targetHouseId]
  const sameHouse = draft.actorHouseId === draft.targetHouseId
  const moverName = houseId ? getMarriageMoverName(draft, houseId) : ''

  function toggleChild(childId: string) {
    setBringChildIds((prev) =>
      prev.includes(childId)
        ? prev.filter((id) => id !== childId)
        : [...prev, childId],
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!houseId) {
      setError('请选择入籍家族')
      return
    }

    onConfirm({ houseId, bringChildIds })
  }

  return (
    <div className="modal-overlay" role="presentation">
      <div
        className="modal create-char-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="marriage-house-title"
      >
        <header className="modal-header">
          <div>
            <h2 id="marriage-house-title" className="modal-title">
              婚礼入籍
            </h2>
            <p className="modal-subtitle">
              {draft.actorName} 与 {draft.targetName} 喜结连理，请选择二人入籍的家族
            </p>
          </div>
        </header>

        <form className="modal-body" onSubmit={handleSubmit}>
          <section className="form-section">
            <h3>入籍家族</h3>
            {sameHouse ? (
              <p className="form-hint">
                双方本属同一家族（{actorHouse?.name ?? '未知家族'}），婚礼后将共同记入该族谱。
              </p>
            ) : (
              <div className="form-grid">
                <div className="form-field form-field--full">
                  <div className="house-choice-list">
                    <label className="house-choice-item">
                      <input
                        type="radio"
                        name="houseId"
                        value={draft.actorHouseId}
                        checked={houseId === draft.actorHouseId}
                        onChange={() => setHouseId(draft.actorHouseId)}
                      />
                      <span className="house-choice-text">
                        <span className="house-choice-name">
                          {actorHouse?.emblem} {actorHouse?.name ?? '发起方家族'}
                        </span>
                        <span className="form-hint-inline">
                          {draft.actorName} 所在家族
                        </span>
                      </span>
                    </label>
                    <label className="house-choice-item">
                      <input
                        type="radio"
                        name="houseId"
                        value={draft.targetHouseId}
                        checked={houseId === draft.targetHouseId}
                        onChange={() => setHouseId(draft.targetHouseId)}
                      />
                      <span className="house-choice-text">
                        <span className="house-choice-name">
                          {targetHouse?.emblem} {targetHouse?.name ?? '对方家族'}
                        </span>
                        <span className="form-hint-inline">
                          {draft.targetName} 所在家族
                        </span>
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </section>

          {!sameHouse && relocatableChildren.length > 0 && (
            <section className="form-section">
              <h3>子女随迁</h3>
              <p className="form-hint">
                {moverName} 将离开原家族，以下子女是否随其一同入籍？
              </p>
              <div className="house-choice-list">
                {relocatableChildren.map((child) => (
                  <label key={child.id} className="house-choice-item">
                    <input
                      type="checkbox"
                      checked={bringChildIds.includes(child.id)}
                      onChange={() => toggleChild(child.id)}
                    />
                    <span className="house-choice-text">
                      <span className="house-choice-name">{child.name}</span>
                      <span className="form-hint-inline">
                        随 {moverName} 迁入
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </section>
          )}

          {error && <p className="form-error">{error}</p>}

          <footer className="modal-footer">
            <button type="submit" className="btn-primary">
              完成婚礼
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}
