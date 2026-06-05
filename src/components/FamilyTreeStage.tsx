import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Character, CharacterReactions, House } from '../types/game'
import { getContentBounds, layoutFamilyTree } from '../utils/familyTree'
import { SpeechBubble } from './SpeechBubble'

interface Props {
  focusCharacterId: string
  selectedCharacterId: string
  characters: Record<string, Character>
  houses: Record<string, House>
  characterReactions: CharacterReactions
  onSelect: (id: string) => void
}

const NODE_W = 88
const NODE_H = 100
const MIN_ZOOM = 0.35
const MAX_ZOOM = 3
const DRAG_THRESHOLD = 5
const VIEW_PADDING = 56

interface Pan {
  x: number
  y: number
}

export function FamilyTreeStage({
  focusCharacterId,
  selectedCharacterId,
  characters,
  houses,
  characterReactions,
  onSelect,
}: Props) {
  const layout = useMemo(
    () => layoutFamilyTree(focusCharacterId, characters),
    [focusCharacterId, characters],
  )

  const nodeMap = useMemo(
    () => new Map(layout.nodes.map((n) => [n.id, n])),
    [layout.nodes],
  )

  const [pan, setPan] = useState<Pan>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [isDragging, setIsDragging] = useState(false)

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
  }, [focusCharacterId, layout.width, layout.height, centerView])

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

  const handleNodeSelect = useCallback(
    (id: string) => {
      onSelect(id)
    },
    [onSelect],
  )

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
    <main className="panel tree-stage">
      <header className="panel-header tree-header">
        <span className="panel-label">家谱舞台</span>
        <div className="tree-header-actions">
          <span className="tree-hint">点击节点查看人物 · 拖拽平移 · 滚轮缩放</span>
          <div className="tree-controls">
            <button
              type="button"
              className="tree-control-btn"
              title="缩小"
              onClick={() => applyZoom(zoom / 1.2)}
            >
              −
            </button>
            <span className="tree-zoom-label">{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              className="tree-control-btn"
              title="放大"
              onClick={() => applyZoom(zoom * 1.2)}
            >
              +
            </button>
            <button
              type="button"
              className="tree-control-btn tree-control-reset"
              title="居中并重置"
              onClick={centerView}
            >
              居中
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
            const isSelected = node.id === selectedCharacterId
            const isFocus = node.id === focusCharacterId

            return (
              <g
                key={node.id}
                className="tree-node-group"
                transform={`translate(${node.x}, ${node.y})`}
                onPointerDown={handleNodePointerDown}
                onClick={(e) => {
                  e.stopPropagation()
                  handleNodeSelect(node.id)
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') handleNodeSelect(node.id)
                }}
              >
                <rect
                  className={`tree-node-bg ${isSelected ? 'selected' : ''} ${isFocus ? 'focused' : ''}`}
                  width={NODE_W}
                  height={NODE_H}
                  rx={8}
                  style={{
                    stroke: isSelected ? '#e8c87a' : house?.color ?? '#666',
                  }}
                />
                <text
                  className="tree-node-avatar"
                  x={NODE_W / 2}
                  y={36}
                  textAnchor="middle"
                >
                  {node.character.avatar}
                </text>
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
      </div>
    </main>
  )
}
