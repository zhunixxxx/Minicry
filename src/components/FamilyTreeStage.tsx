import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { CharacterReactions, GameState, House, MeetingSession } from '../types/game'
import type { InteractionActionId, InteractionContext, InteractionMenuAnchor } from '../types/interactions'
import { getContentBounds, layoutFamilyTree, layoutMeetingTree } from '../utils/familyTree'
import { computeInteractionTargets } from '../interactions/utils'
import { avatarIdToDataUrl, isGeneratedAvatar } from '../utils/avatars'
import { SpeechBubble } from './SpeechBubble'
import { SocialInteractionMenu } from './SocialInteractionMenu'

interface Props {
  focusCharacterId: string
  selectedCharacterId: string
  state: GameState
  houses: Record<string, House>
  characterReactions: CharacterReactions
  meetingSession: MeetingSession | null
  onSelect: (id: string) => void
  onSelectProtagonist: (id: string) => void
  onExecuteInteraction: (
    actionId: InteractionActionId,
    ctx: InteractionContext,
  ) => void
  onStartMeeting: (participantIds: string[]) => void
  onEndMeeting: () => void
}

const NODE_W = 88
const NODE_H = 100
const MIN_ZOOM = 0.35
const MAX_ZOOM = 3
const DRAG_THRESHOLD = 5
const VIEW_PADDING = 56

function isMultiSelectModifier(e: { metaKey: boolean; ctrlKey: boolean }): boolean {
  const isMac =
    typeof navigator !== 'undefined' &&
    /Mac|iPhone|iPad|iPod/.test(navigator.platform)
  return isMac ? e.metaKey : e.ctrlKey
}

interface Pan {
  x: number
  y: number
}

export function FamilyTreeStage({
  focusCharacterId,
  selectedCharacterId,
  state,
  houses,
  characterReactions,
  meetingSession,
  onSelect,
  onSelectProtagonist,
  onExecuteInteraction,
  onStartMeeting,
  onEndMeeting,
}: Props) {
  const characters = state.characters
  const isMeeting = meetingSession !== null

  const layout = useMemo(() => {
    if (meetingSession) {
      return layoutMeetingTree(meetingSession.participantIds, characters)
    }
    return layoutFamilyTree(focusCharacterId, characters)
  }, [meetingSession, focusCharacterId, characters])

  const nodeMap = useMemo(
    () => new Map(layout.nodes.map((n) => [n.id, n])),
    [layout.nodes],
  )

  const [pan, setPan] = useState<Pan>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [isDragging, setIsDragging] = useState(false)
  const [interactionMenu, setInteractionMenu] = useState<InteractionMenuAnchor | null>(
    null,
  )
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null)
  const [meetingSelection, setMeetingSelection] = useState<Set<string>>(new Set())

  const viewportRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const dragRef = useRef({
    active: false,
    didDrag: false,
    pointerId: -1,
    startClientX: 0,
    startClientY: 0,
    startPanX: 0,
    startPanY: 0,
  })

  useEffect(() => {
    if (!isMeeting) setMeetingSelection(new Set())
  }, [isMeeting])

  useEffect(() => {
    setMeetingSelection(new Set())
  }, [selectedCharacterId])

  const clampPan = useCallback(
    (x: number, y: number, scale: number): Pan => {
      const viewW = layout.width / scale
      const viewH = layout.height / scale
      const margin = 120
      return {
        x: Math.max(-margin, Math.min(layout.width - viewW + margin, x)),
        y: Math.max(-margin, Math.min(layout.height - viewH + margin, y)),
      }
    },
    [layout.width, layout.height],
  )

  const centerView = useCallback(() => {
    const viewport = viewportRef.current
    if (!viewport || layout.nodes.length === 0) return

    const bounds = getContentBounds(layout, NODE_W, NODE_H)

    const zoomX = layout.width / (bounds.width + VIEW_PADDING * 2)
    const zoomY = layout.height / (bounds.height + VIEW_PADDING * 2)
    const fitZoom = Math.min(zoomX, zoomY, 1.2)
    const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, fitZoom))

    const viewW = layout.width / clampedZoom
    const viewH = layout.height / clampedZoom
    const cx = bounds.x + bounds.width / 2
    const cy = bounds.y + bounds.height / 2

    setZoom(clampedZoom)
    setPan(
      clampPan(cx - viewW / 2, cy - viewH / 2, clampedZoom),
    )
  }, [layout, clampPan])

  useEffect(() => {
    const frame = requestAnimationFrame(() => centerView())
    return () => cancelAnimationFrame(frame)
  }, [focusCharacterId, meetingSession, layout.width, layout.height, centerView])

  const viewBox = useMemo(() => {
    const viewW = layout.width / zoom
    const viewH = layout.height / zoom
    return `${pan.x} ${pan.y} ${viewW} ${viewH}`
  }, [pan, zoom, layout.width, layout.height])

  function edgePath(fromId: string, toId: string, type: 'parent' | 'spouse'): string {
    const from = nodeMap.get(fromId)
    const to = nodeMap.get(toId)
    if (!from || !to) return ''

    const fx = from.x + NODE_W / 2
    const fy = from.y + NODE_H
    const tx = to.x + NODE_W / 2
    const ty = to.y

    if (type === 'spouse') {
      const midY = from.y + NODE_H / 2
      return `M ${from.x + NODE_W} ${midY} L ${to.x} ${midY}`
    }

    const midY = (fy + ty) / 2
    return `M ${fx} ${from.y + NODE_H / 2} L ${fx} ${midY} L ${tx} ${midY} L ${tx} ${ty}`
  }

  const applyZoom = useCallback(
    (nextZoom: number, anchorX?: number, anchorY?: number) => {
      const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom))
      const svg = svgRef.current
      if (!svg || anchorX === undefined || anchorY === undefined) {
        setZoom(clamped)
        return
      }

      const rect = svg.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) {
        setZoom(clamped)
        return
      }

      const ratioX = (anchorX - rect.left) / rect.width
      const ratioY = (anchorY - rect.top) / rect.height

      const viewW = layout.width / zoom
      const viewH = layout.height / zoom
      const layoutX = pan.x + ratioX * viewW
      const layoutY = pan.y + ratioY * viewH

      const newViewW = layout.width / clamped
      const newViewH = layout.height / clamped
      const newPan = clampPan(
        layoutX - ratioX * newViewW,
        layoutY - ratioY * newViewH,
        clamped,
      )

      setZoom(clamped)
      setPan(newPan)
    },
    [clampPan, layout.width, layout.height, pan, zoom],
  )

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault()
      const factor = e.deltaY > 0 ? 0.9 : 1.1
      applyZoom(zoom * factor, e.clientX, e.clientY)
    },
    [applyZoom, zoom],
  )

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    viewport.addEventListener('wheel', handleWheel, { passive: false })
    return () => viewport.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  const isNodeTarget = (target: EventTarget | null): boolean => {
    return target instanceof Element && Boolean(target.closest('.tree-node-group'))
  }

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    if (isNodeTarget(e.target)) return

    dragRef.current = {
      active: true,
      didDrag: false,
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startPanX: pan.x,
      startPanY: pan.y,
    }
    setIsDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [pan])

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current
      if (!drag.active || e.pointerId !== drag.pointerId) return

      const dx = e.clientX - drag.startClientX
      const dy = e.clientY - drag.startClientY

      if (!drag.didDrag && Math.hypot(dx, dy) < DRAG_THRESHOLD) return

      drag.didDrag = true

      const svg = svgRef.current
      if (!svg) return
      const rect = svg.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return

      const scaleX = layout.width / zoom / rect.width
      const scaleY = layout.height / zoom / rect.height

      setPan(
        clampPan(
          drag.startPanX - dx * scaleX,
          drag.startPanY - dy * scaleY,
          zoom,
        ),
      )
    },
    [clampPan, layout.width, layout.height, zoom],
  )

  const endDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag.active || e.pointerId !== drag.pointerId) return

    drag.active = false
    drag.didDrag = false
    setIsDragging(false)

    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }, [])

  const handleNodePointerDown = useCallback(
    (e: React.PointerEvent<SVGGElement>) => {
      e.stopPropagation()
      dragRef.current.didDrag = false
    },
    [],
  )

  const handleSwitchProtagonist = useCallback(
    (id: string) => {
      setInteractionMenu(null)
      setExpandedCategoryId(null)
      setMeetingSelection(new Set())
      if (isMeeting) {
        if (!meetingSession?.participantIds.includes(id)) return
        onSelectProtagonist(id)
        return
      }
      onSelect(id)
    },
    [isMeeting, meetingSession, onSelect, onSelectProtagonist],
  )

  const handleNodeContextMenu = useCallback(
    (e: React.MouseEvent<SVGGElement>, nodeId: string) => {
      e.preventDefault()
      e.stopPropagation()
      if (dragRef.current.didDrag) return
      if (nodeId === selectedCharacterId) return
      if (isMeeting && !meetingSession?.participantIds.includes(nodeId)) return

      const { targetId, targetIds } = computeInteractionTargets(
        nodeId,
        selectedCharacterId,
        meetingSelection,
      )

      const rect = e.currentTarget.getBoundingClientRect()
      setExpandedCategoryId(null)
      setInteractionMenu({
        targetId,
        targetIds,
        x: rect.right + 6,
        y: rect.top + 8,
      })
    },
    [isMeeting, meetingSession, selectedCharacterId, meetingSelection],
  )

  const handleNodeClick = useCallback(
    (e: React.MouseEvent<SVGGElement>, nodeId: string) => {
      e.stopPropagation()
      if (dragRef.current.didDrag) return

      if (isMultiSelectModifier(e)) {
        if (nodeId === selectedCharacterId) return
        if (isMeeting && !meetingSession?.participantIds.includes(nodeId)) return
        setMeetingSelection((prev) => {
          const next = new Set(prev)
          if (next.has(nodeId)) next.delete(nodeId)
          else next.add(nodeId)
          return next
        })
        return
      }

      handleSwitchProtagonist(nodeId)
    },
    [isMeeting, meetingSession, selectedCharacterId, handleSwitchProtagonist],
  )

  const closeInteractionMenu = useCallback(() => {
    setInteractionMenu(null)
    setExpandedCategoryId(null)
  }, [])

  const handleInviteMeeting = useCallback(() => {
    if (!interactionMenu) return
    const participantIds = [
      selectedCharacterId,
      ...meetingSelection,
      interactionMenu.targetId,
    ]
    onStartMeeting([...new Set(participantIds)])
    setMeetingSelection(new Set())
    closeInteractionMenu()
  }, [selectedCharacterId, meetingSelection, interactionMenu, onStartMeeting, closeInteractionMenu])

  const handleInteractionExecute = useCallback(
    (actionId: InteractionActionId, ctx: InteractionContext) => {
      onExecuteInteraction(actionId, { ...ctx, inMeeting: isMeeting })
      setMeetingSelection(new Set())
      closeInteractionMenu()
    },
    [onExecuteInteraction, closeInteractionMenu, isMeeting],
  )

  const interactionActor = state.characters[selectedCharacterId]
  const interactionTarget = interactionMenu
    ? state.characters[interactionMenu.targetId]
    : undefined
  const meetingParticipantCount = useMemo(() => {
    const ids = new Set([selectedCharacterId, ...meetingSelection])
    if (interactionMenu?.targetId) ids.add(interactionMenu.targetId)
    return ids.size
  }, [selectedCharacterId, meetingSelection, interactionMenu?.targetId])

  const reactionBubbles = useMemo(() => {
    return layout.nodes
      .filter((node) => characterReactions[node.id])
      .map((node) => ({
        nodeId: node.id,
        text: characterReactions[node.id],
        x: node.x,
        y: node.y,
      }))
  }, [layout.nodes, characterReactions])

  return (
    <main className={`panel tree-stage ${isMeeting ? 'tree-stage--meeting' : ''}`}>
      <header className="panel-header tree-header">
        <span className="panel-label">{isMeeting ? '会晤' : '家谱舞台'}</span>
        <div className="tree-header-actions">
          <div className="tree-controls">
            {isMeeting && (
              <button
                type="button"
                className="tree-control-btn tree-end-meeting-btn"
                onClick={onEndMeeting}
              >
                结束见面
              </button>
            )}
            <button
              type="button"
              className="tree-control-btn tree-control-reset"
              title="重置视角"
              onClick={centerView}
            >
              重置视角
            </button>
          </div>
        </div>
      </header>

      <div
        ref={viewportRef}
        className={`tree-viewport ${isDragging ? 'is-dragging' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onContextMenu={(e) => {
          if (!isNodeTarget(e.target)) {
            e.preventDefault()
            closeInteractionMenu()
          }
        }}
      >
        <svg
          ref={svgRef}
          className="tree-svg"
          viewBox={viewBox}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <rect
            className="tree-canvas-bg"
            x={0}
            y={0}
            width={layout.width}
            height={layout.height}
            fill="transparent"
          />

          {layout.edges.map((edge, i) => (
            <path
              key={`edge-${i}`}
              d={edgePath(edge.from, edge.to, edge.type)}
              className={`tree-edge tree-edge--${edge.type}`}
              fill="none"
            />
          ))}

          {layout.nodes.map((node) => {
            const house = houses[node.character.houseId]
            const isProtagonist = node.id === selectedCharacterId
            const isMeetingPick = meetingSelection.has(node.id)

            return (
              <g
                key={node.id}
                className="tree-node-group"
                transform={`translate(${node.x}, ${node.y})`}
                onPointerDown={handleNodePointerDown}
                onClick={(e) => handleNodeClick(e, node.id)}
                onContextMenu={(e) => handleNodeContextMenu(e, node.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleSwitchProtagonist(node.id)
                  }
                }}
              >
                <rect
                  className={`tree-node-bg ${isProtagonist ? 'selected' : ''} ${isMeetingPick ? 'meeting-pick' : ''}`}
                  width={NODE_W}
                  height={NODE_H}
                  rx={8}
                  style={
                    {
                      '--node-stroke': house?.color ?? '#A0B4C4',
                    } as CSSProperties
                  }
                />
                {isGeneratedAvatar(node.character.avatar) ? (
                  <image
                    href={avatarIdToDataUrl(node.character.avatar) ?? undefined}
                    x={NODE_W / 2 - 14}
                    y={22}
                    width={28}
                    height={28}
                  />
                ) : (
                  <text
                    className="tree-node-avatar"
                    x={NODE_W / 2}
                    y={36}
                    textAnchor="middle"
                  >
                    {node.character.avatar}
                  </text>
                )}
                <text
                  className="tree-node-name"
                  x={NODE_W / 2}
                  y={58}
                  textAnchor="middle"
                >
                  {node.character.name.length > 5
                    ? node.character.name.slice(0, 5) + '…'
                    : node.character.name}
                </text>
                <text
                  className="tree-node-meta"
                  x={NODE_W / 2}
                  y={76}
                  textAnchor="middle"
                >
                  {node.character.age}岁 · {house?.emblem}
                </text>
                {!node.character.isAlive && (
                  <text
                    className="tree-node-dead"
                    x={NODE_W / 2}
                    y={92}
                    textAnchor="middle"
                  >
                    †
                  </text>
                )}
              </g>
            )
          })}

          {reactionBubbles.map((bubble) => (
            <SpeechBubble
              key={`bubble-${bubble.nodeId}`}
              text={bubble.text}
              anchorX={bubble.x}
              anchorY={bubble.y}
              nodeWidth={NODE_W}
            />
          ))}
        </svg>

        {interactionMenu &&
          interactionActor &&
          interactionTarget &&
          interactionMenu.targetId !== selectedCharacterId && (
            <SocialInteractionMenu
              anchor={interactionMenu}
              state={state}
              actor={interactionActor}
              target={interactionTarget}
              inMeeting={isMeeting}
              meetingParticipantCount={meetingParticipantCount}
              expandedCategoryId={expandedCategoryId}
              onExpandCategory={setExpandedCategoryId}
              onExecute={handleInteractionExecute}
              onInviteMeeting={handleInviteMeeting}
              onClose={closeInteractionMenu}
            />
          )}
      </div>
    </main>
  )
}
