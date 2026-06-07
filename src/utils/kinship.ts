import type { Character } from '../types/game'

/** 沿 parentIds 向上收集全部祖先 */
function collectAncestors(
  charId: string,
  characters: Record<string, Character>,
): Set<string> {
  const ancestors = new Set<string>()
  const queue = [...(characters[charId]?.parentIds ?? [])]

  while (queue.length > 0) {
    const id = queue.shift()!
    if (ancestors.has(id)) continue
    ancestors.add(id)
    const parent = characters[id]
    if (parent) queue.push(...parent.parentIds)
  }

  return ancestors
}

/** 向上收集祖先及世代距离（1 = 父母，2 = 祖父母……） */
function collectAncestorsWithDepth(
  charId: string,
  characters: Record<string, Character>,
  maxDepth: number,
): Map<string, number> {
  const ancestors = new Map<string, number>()
  const queue: Array<{ id: string; depth: number }> = (
    characters[charId]?.parentIds ?? []
  ).map((id) => ({ id, depth: 1 }))

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!
    if (depth > maxDepth) continue

    const prev = ancestors.get(id)
    if (prev !== undefined && prev <= depth) continue
    ancestors.set(id, depth)

    const parent = characters[id]
    if (parent) {
      for (const pid of parent.parentIds) {
        queue.push({ id: pid, depth: depth + 1 })
      }
    }
  }

  return ancestors
}

function areSpouses(
  aId: string,
  bId: string,
  characters: Record<string, Character>,
): boolean {
  const a = characters[aId]
  const b = characters[bId]
  if (!a || !b) return false
  return a.spouseIds.includes(bId) || b.spouseIds.includes(aId)
}

/** 是否为直系血亲（任意辈分的祖先或后代） */
function isDirectBloodRelative(
  aId: string,
  bId: string,
  characters: Record<string, Character>,
): boolean {
  if (aId === bId) return true
  const aAncestors = collectAncestors(aId, characters)
  if (aAncestors.has(bId)) return true
  const bAncestors = collectAncestors(bId, characters)
  return bAncestors.has(aId)
}

/**
 * 是否存在足够近的旁系血亲共同祖先。
 * 旁系亲等 ≈ 双方到共同祖先的世代距离之和（兄弟姐妹 = 2，堂表亲 = 4）。
 */
function shareCloseCollateralAncestor(
  aId: string,
  bId: string,
  characters: Record<string, Character>,
): boolean {
  const maxDepth = 3
  const aAncestors = collectAncestorsWithDepth(aId, characters, maxDepth)
  const bAncestors = collectAncestorsWithDepth(bId, characters, maxDepth)

  for (const [ancestorId, depthA] of aAncestors) {
    const depthB = bAncestors.get(ancestorId)
    if (depthB === undefined) continue
    if (depthA + depthB <= 4) return true
  }

  return false
}

/**
 * 是否为近亲血缘关系（直系血亲，或三代以内旁系血亲）。
 * 配偶、姻亲、无血缘者返回 false。
 */
export function areCloseBloodRelatives(
  aId: string,
  bId: string,
  characters: Record<string, Character>,
): boolean {
  if (aId === bId) return true
  if (areSpouses(aId, bId, characters)) return false
  if (isDirectBloodRelative(aId, bId, characters)) return true
  return shareCloseCollateralAncestor(aId, bId, characters)
}
