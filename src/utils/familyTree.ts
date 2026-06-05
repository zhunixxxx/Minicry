import type { Character } from '../types/game'

export interface TreeNode {
  id: string
  character: Character
  x: number
  y: number
  generation: number
}

export interface TreeEdge {
  from: string
  to: string
  type: 'parent' | 'spouse'
}

export interface TreeLayout {
  nodes: TreeNode[]
  edges: TreeEdge[]
  width: number
  height: number
}

export interface ContentBounds {
  x: number
  y: number
  width: number
  height: number
}

export function getContentBounds(
  layout: TreeLayout,
  nodeWidth: number,
  nodeHeight: number,
): ContentBounds {
  if (layout.nodes.length === 0) {
    return { x: 0, y: 0, width: layout.width, height: layout.height }
  }

  const minX = Math.min(...layout.nodes.map((n) => n.x))
  const maxX = Math.max(...layout.nodes.map((n) => n.x + nodeWidth))
  const minY = Math.min(...layout.nodes.map((n) => n.y))
  const maxY = Math.max(...layout.nodes.map((n) => n.y + nodeHeight))

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

const NODE_WIDTH = 88
const NODE_HEIGHT = 100
const H_GAP = 32
const V_GAP = 80
const SPOUSE_GAP = 16

function getGeneration(
  charId: string,
  characters: Record<string, Character>,
  cache: Map<string, number>,
): number {
  const cached = cache.get(charId)
  if (cached !== undefined) return cached

  const char = characters[charId]
  if (!char || char.parentIds.length === 0) {
    cache.set(charId, 0)
    return 0
  }

  const gen =
    Math.max(...char.parentIds.map((pid) => getGeneration(pid, characters, cache))) + 1
  cache.set(charId, gen)
  return gen
}

function collectFamilyMembers(
  rootId: string,
  characters: Record<string, Character>,
): Set<string> {
  const members = new Set<string>()
  const queue = [rootId]

  while (queue.length > 0) {
    const id = queue.shift()!
    if (members.has(id)) continue
    members.add(id)

    const char = characters[id]
    if (!char) continue

    char.parentIds.forEach((pid) => queue.push(pid))
    char.spouseIds.forEach((sid) => queue.push(sid))

    Object.values(characters).forEach((c) => {
      if (c.parentIds.includes(id)) queue.push(c.id)
      if (c.spouseIds.includes(id)) queue.push(c.id)
    })
  }

  return members
}

function buildFamilyUnits(
  memberIds: Set<string>,
  characters: Record<string, Character>,
): string[][] {
  const visited = new Set<string>()
  const units: string[][] = []

  for (const id of memberIds) {
    if (visited.has(id)) continue
    const char = characters[id]
    if (!char) continue

    const unit: string[] = [id]
    visited.add(id)

    for (const spouseId of char.spouseIds) {
      if (memberIds.has(spouseId) && !visited.has(spouseId)) {
        unit.push(spouseId)
        visited.add(spouseId)
      }
    }

    units.push(unit)
  }

  return units
}

export function layoutFamilyTree(
  focusCharacterId: string,
  characters: Record<string, Character>,
): TreeLayout {
  const members = collectFamilyMembers(focusCharacterId, characters)
  const genCache = new Map<string, number>()

  const byGeneration = new Map<number, string[][]>()

  const units = buildFamilyUnits(members, characters)
  for (const unit of units) {
    const gen = Math.max(...unit.map((id) => getGeneration(id, characters, genCache)))
    if (!byGeneration.has(gen)) byGeneration.set(gen, [])
    byGeneration.get(gen)!.push(unit)
  }

  const generations = [...byGeneration.keys()].sort((a, b) => a - b)
  const nodes: TreeNode[] = []
  const edges: TreeEdge[] = []

  let maxWidth = 0

  generations.forEach((gen, genIndex) => {
    const unitsAtGen = byGeneration.get(gen)!
    let xCursor = 40

    unitsAtGen.forEach((unit) => {
      const unitWidth =
        unit.length * NODE_WIDTH + (unit.length - 1) * SPOUSE_GAP

      unit.forEach((charId, i) => {
        const char = characters[charId]
        if (!char) return

        nodes.push({
          id: charId,
          character: char,
          x: xCursor + i * (NODE_WIDTH + SPOUSE_GAP),
          y: 40 + genIndex * (NODE_HEIGHT + V_GAP),
          generation: gen,
        })

        if (i > 0) {
          edges.push({
            from: unit[i - 1],
            to: charId,
            type: 'spouse',
          })
        }
      })

      xCursor += unitWidth + H_GAP
    })

    maxWidth = Math.max(maxWidth, xCursor)
  })

  for (const char of Object.values(characters)) {
    if (!members.has(char.id)) continue
    for (const parentId of char.parentIds) {
      if (members.has(parentId)) {
        edges.push({ from: parentId, to: char.id, type: 'parent' })
      }
    }
  }

  const height =
    generations.length * (NODE_HEIGHT + V_GAP) + 40

  return { nodes, edges, width: Math.max(maxWidth, 600), height }
}

function collectMeetingEdges(
  participants: Set<string>,
  characters: Record<string, Character>,
): TreeEdge[] {
  const edges: TreeEdge[] = []
  const seen = new Set<string>()

  for (const id of participants) {
    const char = characters[id]
    if (!char) continue

    for (const parentId of char.parentIds) {
      if (!participants.has(parentId)) continue
      const key = `p:${parentId}->${id}`
      if (seen.has(key)) continue
      seen.add(key)
      edges.push({ from: parentId, to: id, type: 'parent' })
    }

    for (const spouseId of char.spouseIds) {
      if (!participants.has(spouseId)) continue
      const key = `s:${[id, spouseId].sort().join('-')}`
      if (seen.has(key)) continue
      seen.add(key)
      edges.push({ from: id, to: spouseId, type: 'spouse' })
    }
  }

  return edges
}

function findMeetingComponents(
  participants: Set<string>,
  edges: TreeEdge[],
): string[][] {
  const parent = new Map<string, string>()

  function find(id: string): string {
    const p = parent.get(id)
    if (!p) {
      parent.set(id, id)
      return id
    }
    if (p === id) return id
    const root = find(p)
    parent.set(id, root)
    return root
  }

  function unite(a: string, b: string) {
    parent.set(find(a), find(b))
  }

  for (const id of participants) {
    if (!parent.has(id)) parent.set(id, id)
  }

  for (const edge of edges) {
    if (participants.has(edge.from) && participants.has(edge.to)) {
      unite(edge.from, edge.to)
    }
  }

  const groups = new Map<string, string[]>()
  for (const id of participants) {
    const root = find(id)
    if (!groups.has(root)) groups.set(root, [])
    groups.get(root)!.push(id)
  }

  return [...groups.values()]
}

function layoutParticipantGroup(
  memberIds: Set<string>,
  characters: Record<string, Character>,
  offsetX: number,
  offsetY: number,
): { nodes: TreeNode[]; edges: TreeEdge[]; width: number; height: number } {
  const genCache = new Map<string, number>()
  const byGeneration = new Map<number, string[][]>()
  const units = buildFamilyUnits(memberIds, characters)

  for (const unit of units) {
    const gen = Math.max(...unit.map((id) => getGeneration(id, characters, genCache)))
    if (!byGeneration.has(gen)) byGeneration.set(gen, [])
    byGeneration.get(gen)!.push(unit)
  }

  const generations = [...byGeneration.keys()].sort((a, b) => a - b)
  const nodes: TreeNode[] = []
  const edges: TreeEdge[] = []
  let maxWidth = 0

  generations.forEach((gen, genIndex) => {
    const unitsAtGen = byGeneration.get(gen)!
    let xCursor = offsetX

    unitsAtGen.forEach((unit) => {
      const unitWidth =
        unit.length * NODE_WIDTH + (unit.length - 1) * SPOUSE_GAP

      unit.forEach((charId, i) => {
        const char = characters[charId]
        if (!char) return

        nodes.push({
          id: charId,
          character: char,
          x: xCursor + i * (NODE_WIDTH + SPOUSE_GAP),
          y: offsetY + genIndex * (NODE_HEIGHT + V_GAP),
          generation: gen,
        })

        if (i > 0) {
          edges.push({
            from: unit[i - 1],
            to: charId,
            type: 'spouse',
          })
        }
      })

      xCursor += unitWidth + H_GAP
    })

    maxWidth = Math.max(maxWidth, xCursor - offsetX)
  })

  for (const id of memberIds) {
    const char = characters[id]
    if (!char) continue
    for (const parentId of char.parentIds) {
      if (memberIds.has(parentId)) {
        edges.push({ from: parentId, to: id, type: 'parent' })
      }
    }
  }

  const height =
    generations.length > 0
      ? generations.length * (NODE_HEIGHT + V_GAP)
      : NODE_HEIGHT

  return { nodes, edges, width: maxWidth, height }
}

/** 会晤布局：仅展示参与者，仅有血缘/家族关系的才连线 */
export function layoutMeetingTree(
  participantIds: string[],
  characters: Record<string, Character>,
): TreeLayout {
  const participants = new Set(
    participantIds.filter((id) => characters[id]?.isAlive !== false),
  )

  if (participants.size === 0) {
    return { nodes: [], edges: [], width: 600, height: 400 }
  }

  const relationEdges = collectMeetingEdges(participants, characters)
  const components = findMeetingComponents(participants, relationEdges)

  const allNodes: TreeNode[] = []
  const allEdges: TreeEdge[] = []
  let xOffset = 40
  let maxHeight = NODE_HEIGHT + 40

  components.forEach((component) => {
    const memberIds = new Set(component)
    const {
      nodes,
      edges,
      width,
      height,
    } = layoutParticipantGroup(memberIds, characters, xOffset, 40)

    allNodes.push(...nodes)
    allEdges.push(...edges)
    xOffset += Math.max(width, NODE_WIDTH) + H_GAP * 2
    maxHeight = Math.max(maxHeight, height + 80)
  })

  return {
    nodes: allNodes,
    edges: allEdges,
    width: Math.max(xOffset, 600),
    height: maxHeight,
  }
}

export function getRelationLabel(type: string): string {
  const labels: Record<string, string> = {
    parent: '父母',
    child: '子女',
    spouse: '配偶',
    sibling: '兄弟姐妹',
    lover: '恋人',
    rival: '对手',
    ally: '盟友',
  }
  return labels[type] ?? type
}

export function formatDate(year: number, month: number): string {
  const months = [
    '一月', '二月', '三月', '四月', '五月', '六月',
    '七月', '八月', '九月', '十月', '十一月', '十二月',
  ]
  return `${year}年${months[month - 1] ?? '一月'}`
}
