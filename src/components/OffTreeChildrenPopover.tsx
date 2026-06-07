import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { Character, House } from '../types/game'
import { CharacterAvatar } from './CharacterAvatar'
import { CharacterLink } from './CharacterLink'
import { HouseLink } from './HouseLink'

interface Props {
  parent: Character
  children: Character[]
  characters: Record<string, Character>
  houses: Record<string, House>
  anchorX: number
  anchorY: number
  onSelectCharacter: (id: string) => void
  onFocusHouse: (houseId: string) => void
  onClose: () => void
}

const GENDER_LABEL = { male: '男', female: '女' } as const

function stopPanelPointer(e: React.SyntheticEvent) {
  e.stopPropagation()
}

function getOtherParent(
  child: Character,
  currentParent: Character,
  characters: Record<string, Character>,
): { id: string; label: string; name: string } | null {
  for (const pid of child.parentIds) {
    if (pid === currentParent.id) continue
    const p = characters[pid]
    if (!p) continue
    return {
      id: p.id,
      label: p.gender === 'male' ? '父亲' : '母亲',
      name: p.name,
    }
  }
  return null
}

export function OffTreeChildrenPopover({
  parent,
  children,
  characters,
  houses,
  anchorX,
  anchorY,
  onSelectCharacter,
  onFocusHouse,
  onClose,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let listen = false
    const timer = window.setTimeout(() => {
      listen = true
    }, 0)

    function handleClickOutside(e: MouseEvent) {
      if (!listen) return
      if (panelRef.current?.contains(e.target as Node)) return
      onClose()
    }

    document.addEventListener('click', handleClickOutside)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('click', handleClickOutside)
    }
  }, [onClose])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  function handleSelect(id: string) {
    onSelectCharacter(id)
    onClose()
  }

  function handleFocusHouse(houseId: string) {
    onFocusHouse(houseId)
    onClose()
  }

  return createPortal(
    <div
      ref={panelRef}
      className="off-tree-children-popover"
      style={{ left: anchorX, top: anchorY }}
      role="dialog"
      aria-labelledby="off-tree-children-title"
      onPointerDown={stopPanelPointer}
      onMouseDown={stopPanelPointer}
      onClick={stopPanelPointer}
    >
      <header className="off-tree-children-header">
        <h3 id="off-tree-children-title" className="off-tree-children-title">
          {parent.name} 的子女
        </h3>
        <button
          type="button"
          className="off-tree-children-close"
          onClick={onClose}
          aria-label="关闭"
        >
          ×
        </button>
      </header>
      <ul className="off-tree-children-list">
        {children.map((child) => {
          const house = houses[child.houseId]
          const otherParent = getOtherParent(child, parent, characters)

          return (
            <li key={child.id} className="off-tree-children-item">
              <div className="off-tree-children-avatar">
                <CharacterAvatar avatar={child.avatar} size={36} />
              </div>
              <div className="off-tree-children-body">
                <div className="off-tree-children-name-row">
                  <CharacterLink
                    name={child.name}
                    onClick={() => handleSelect(child.id)}
                    className="off-tree-children-name"
                  />
                </div>
                <p className="off-tree-children-meta">
                  {child.age}岁 · {GENDER_LABEL[child.gender]} ·{' '}
                  {house ? (
                    <>
                      {house.emblem}{' '}
                      <HouseLink
                        name={house.name}
                        onClick={() => handleFocusHouse(house.id)}
                        className="off-tree-children-house-link"
                      />
                    </>
                  ) : (
                    '未知家族'
                  )}
                </p>
                {otherParent && (
                  <p className="off-tree-children-parent">
                    <span className="off-tree-children-parent-label">
                      {otherParent.label}
                    </span>
                    <CharacterLink
                      name={otherParent.name}
                      onClick={() => handleSelect(otherParent.id)}
                      className="off-tree-children-parent-link"
                    />
                  </p>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>,
    document.body,
  )
}
