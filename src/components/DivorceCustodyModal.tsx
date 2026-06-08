import { useEffect, useState } from 'react'
import type { GameState } from '../types/game'
import type {
  ChildCustodyParent,
  DivorceConfirmInput,
  DivorceDraft,
} from '../utils/marriage'

interface Props {
  open: boolean
  draft: DivorceDraft | null
  state: GameState
  onConfirm: (confirm: DivorceConfirmInput) => void
}

export function DivorceCustodyModal({
  open,
  draft,
  state,
  onConfirm,
}: Props) {
  const [childCustody, setChildCustody] = useState<Record<string, ChildCustodyParent>>(
    {},
  )
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open || !draft) return
    const initial: Record<string, ChildCustodyParent> = {}
    for (const child of draft.sharedChildren) {
      initial[child.id] = 'mother'
    }
    setChildCustody(initial)
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
  const isAmicable = draft.kind === 'amicable'

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!draft) return

    for (const child of draft.sharedChildren) {
      if (!childCustody[child.id]) {
        setError(`请为 ${child.name} 选择抚养归属`)
        return
      }
    }

    onConfirm({ childCustody })
  }

  return (
    <div className="modal-overlay" role="presentation">
      <div
        className="modal create-char-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="divorce-custody-title"
      >
        <header className="modal-header">
          <div>
            <h2 id="divorce-custody-title" className="modal-title">
              {isAmicable ? '协议离婚' : '法律离婚'}
            </h2>
            <p className="modal-subtitle">
              {draft.actorName} 与 {draft.targetName} 即将
              {isAmicable ? '协议离婚' : '判决离婚'}
              {draft.sharedChildren.length > 0
                ? '，请裁定共同子女的抚养归属'
                : ''}
            </p>
          </div>
        </header>

        <form className="modal-body" onSubmit={handleSubmit}>
          {draft.sharedChildren.length > 0 && (
            <section className="form-section">
              <h3>共同子女抚养</h3>
              <p className="form-hint">
                选定归属后，子女将入籍该方家族。
              </p>
              {draft.sharedChildren.map((child) => (
                <div key={child.id} className="form-grid" style={{ marginBottom: 12 }}>
                  <div className="form-field form-field--full">
                    <span>{child.name}</span>
                    <div className="house-choice-list">
                      <label className="house-choice-item">
                        <input
                          type="radio"
                          name={`custody-${child.id}`}
                          checked={childCustody[child.id] === 'father'}
                          onChange={() =>
                            setChildCustody((prev) => ({
                              ...prev,
                              [child.id]: 'father',
                            }))
                          }
                        />
                        <span className="house-choice-text">
                          <span className="house-choice-name">
                            随父亲 {draft.fatherName}
                          </span>
                          <span className="form-hint-inline">
                            {fatherHouse?.emblem} {fatherHouse?.name ?? ''}
                          </span>
                        </span>
                      </label>
                      <label className="house-choice-item">
                        <input
                          type="radio"
                          name={`custody-${child.id}`}
                          checked={childCustody[child.id] === 'mother'}
                          onChange={() =>
                            setChildCustody((prev) => ({
                              ...prev,
                              [child.id]: 'mother',
                            }))
                          }
                        />
                        <span className="house-choice-text">
                          <span className="house-choice-name">
                            随母亲 {draft.motherName}
                          </span>
                          <span className="form-hint-inline">
                            {motherHouse?.emblem} {motherHouse?.name ?? ''}
                          </span>
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </section>
          )}

          {error && <p className="form-error">{error}</p>}

          <footer className="modal-footer">
            <button type="submit" className="btn-primary">
              确认离婚
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}
