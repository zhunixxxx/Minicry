import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Character, GameState } from '../types/game'
import type {
  InteractionActionId,
  InteractionContext,
  InteractionMenuAnchor,
  InteractionMenuItem,
} from '../types/interactions'
import { buildInteractionMenu } from '../interactions/registry'
import { isMultiTargetContext } from '../interactions/utils'

interface Props {
  anchor: InteractionMenuAnchor
  state: GameState
  actor: Character
  target: Character
  inMeeting?: boolean
  meetingParticipantCount: number
  expandedCategoryId: string | null
  onExpandCategory: (categoryId: string | null) => void
  onExecute: (actionId: InteractionActionId, ctx: InteractionContext) => void
  onInviteMeeting: () => void
  onClose: () => void
}

function stopMenuPointer(e: React.SyntheticEvent) {
  e.stopPropagation()
}

export function SocialInteractionMenu({
  anchor,
  state,
  actor,
  target,
  inMeeting = false,
  meetingParticipantCount,
  expandedCategoryId,
  onExpandCategory,
  onExecute,
  onInviteMeeting,
  onClose,
}: Props) {
  const menuRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const categoryRefs = useRef<Map<string, HTMLButtonElement>>(new Map())
  const flyoutRef = useRef<HTMLDivElement>(null)
  const [flyoutTop, setFlyoutTop] = useState(0)
  const [flyoutFlip, setFlyoutFlip] = useState(false)
  const [hoveredCategoryId, setHoveredCategoryId] = useState<string | null>(null)

  const ctx: InteractionContext = {
    actorId: actor.id,
    targetId: target.id,
    targetIds: anchor.targetIds,
    inMeeting,
  }
  const isMulti = isMultiTargetContext(ctx)
  const items = buildInteractionMenu(ctx, state)
  const visibleCategoryId = expandedCategoryId ?? hoveredCategoryId
  const visibleCategory = items.find(
    (item) => item.kind === 'category' && item.id === visibleCategoryId,
  )

  const targetLabel = isMulti
    ? `${anchor.targetIds?.length ?? 0} 人`
    : target.name

  useEffect(() => {
    if (!visibleCategoryId) return
    const btn = categoryRefs.current.get(visibleCategoryId)
    const body = bodyRef.current
    if (btn && body) {
      setFlyoutTop(btn.offsetTop)
    }
  }, [visibleCategoryId, items.length])

  useEffect(() => {
    setHoveredCategoryId(null)
  }, [anchor.targetId, anchor.targetIds?.join(',')])

  useEffect(() => {
    let listen = false
    const timer = window.setTimeout(() => {
      listen = true
    }, 0)

    function onClickOutside(e: MouseEvent) {
      if (!listen) return
      if (menuRef.current?.contains(e.target as Node)) return
      onClose()
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('click', onClickOutside)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('click', onClickOutside)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  useEffect(() => {
    const menu = menuRef.current
    if (!menu) return

    const pad = 8
    const menuRect = menu.getBoundingClientRect()
    const flyoutRect = flyoutRef.current?.getBoundingClientRect()
    const totalWidth =
      menuRect.width + (flyoutRect ? flyoutRect.width + 4 : 0)

    let left = anchor.x
    let top = anchor.y

    if (left + totalWidth > window.innerWidth - pad) {
      left = Math.max(pad, anchor.x - menuRect.width - 12)
    }
    if (top + menuRect.height > window.innerHeight - pad) {
      top = window.innerHeight - menuRect.height - pad
    }
    left = Math.max(pad, left)
    top = Math.max(pad, top)

    menu.style.left = `${left}px`
    menu.style.top = `${top}px`

    if (flyoutRect) {
      const menuLeft = left
      const flip = menuLeft + menuRect.width + flyoutRect.width + 4 > window.innerWidth - pad
      setFlyoutFlip(flip)
    } else {
      setFlyoutFlip(false)
    }
  }, [anchor.x, anchor.y, visibleCategoryId, items.length, flyoutTop])

  function handleCategoryMouseEnter(item: InteractionMenuItem) {
    if (item.disabled || item.kind !== 'category') return
    if (expandedCategoryId) return
    setHoveredCategoryId(item.id)
  }

  function handleCategoryMouseLeave(
    item: InteractionMenuItem,
    e: React.MouseEvent<HTMLButtonElement>,
  ) {
    const related = e.relatedTarget
    if (
      related instanceof Node &&
      flyoutRef.current?.contains(related) &&
      visibleCategoryId === item.id
    ) {
      return
    }
    if (hoveredCategoryId === item.id) {
      setHoveredCategoryId(null)
    }
  }

  function handleFlyoutMouseLeave(e: React.MouseEvent<HTMLDivElement>) {
    const related = e.relatedTarget
    if (related instanceof Node) {
      const btn = categoryRefs.current.get(visibleCategoryId ?? '')
      if (btn?.contains(related)) return
    }
    setHoveredCategoryId(null)
  }

  function handleCategoryClick(item: InteractionMenuItem) {
    if (item.disabled) return
    if (expandedCategoryId === item.id) {
      onExpandCategory(null)
      setHoveredCategoryId(item.id)
      return
    }
    setHoveredCategoryId(null)
    onExpandCategory(item.id)
  }

  function handleActionClick(item: InteractionMenuItem) {
    if (item.disabled || !item.actionId) return
    onExecute(item.actionId, ctx)
  }

  return createPortal(
    <div
      ref={menuRef}
      className="social-interaction-menu"
      style={{ left: anchor.x, top: anchor.y }}
      role="menu"
      aria-label={isMulti ? `对 ${targetLabel} 的多人互动` : `对 ${target.name} 的社交互动`}
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={stopMenuPointer}
      onMouseDown={stopMenuPointer}
      onClick={stopMenuPointer}
      onMouseLeave={() => setHoveredCategoryId(null)}
    >
      <header className="social-menu-header">
        <span className="social-menu-header-label">
          {isMulti ? '多人互动' : '社交'}
        </span>
        <span className="social-menu-header-target">{targetLabel}</span>
      </header>
      <p className="social-menu-actor">
        由 <strong>{actor.name}</strong> 发起
      </p>
      <div className="social-menu-body" ref={bodyRef}>
        <div className="social-menu-items">
          {!inMeeting && meetingParticipantCount >= 2 && (
            <button
              type="button"
              className="social-menu-item social-menu-meeting"
              onClick={onInviteMeeting}
            >
              邀请会面（{meetingParticipantCount} 人）
            </button>
          )}
          {!inMeeting && items.length > 0 && meetingParticipantCount >= 2 && (
            <div className="social-menu-divider" role="separator" />
          )}
          {items.map((item) => (
            <button
              key={item.id}
              ref={(el) => {
                if (el) categoryRefs.current.set(item.id, el)
                else categoryRefs.current.delete(item.id)
              }}
              type="button"
              className={`social-menu-item ${item.disabled ? 'disabled' : ''} ${visibleCategoryId === item.id ? 'expanded' : ''} ${expandedCategoryId === item.id ? 'locked' : ''}`}
              onClick={() => handleCategoryClick(item)}
              onMouseEnter={() => handleCategoryMouseEnter(item)}
              onMouseLeave={(e) => handleCategoryMouseLeave(item, e)}
              disabled={item.disabled}
              title={item.disabled ? item.disabledReason : undefined}
            >
              <span className="social-menu-item-label">{item.label}</span>
              {item.kind === 'category' && (
                <span className="social-menu-item-arrow" aria-hidden>
                  ›
                </span>
              )}
            </button>
          ))}
        </div>
        {visibleCategory?.children && visibleCategory.children.length > 0 && (
          <div
            ref={flyoutRef}
            className={`social-menu-flyout ${flyoutFlip ? 'social-menu-flyout--left' : ''}`}
            style={{ top: flyoutTop }}
            role="menu"
            onMouseEnter={() => {
              if (expandedCategoryId || !visibleCategoryId) return
              setHoveredCategoryId(visibleCategoryId)
            }}
            onMouseLeave={handleFlyoutMouseLeave}
          >
            {visibleCategory.children.map((child) => (
              <button
                key={child.id}
                type="button"
                className={`social-menu-item social-menu-flyout-item ${child.disabled ? 'disabled' : ''}`}
                onClick={() => handleActionClick(child)}
                disabled={child.disabled}
                title={child.disabled ? child.disabledReason : undefined}
              >
                {child.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
