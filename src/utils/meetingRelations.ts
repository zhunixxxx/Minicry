import type { Character, MeetingRelationOutcome, RelationshipBond } from '../types/game'
import {
  EMPTY_BOND,
  pairBondScore,
  scoreBond,
} from './relationshipBonds'

export interface MeetingRelationDelta {
  outcome: MeetingRelationOutcome
  scoreDelta: number
}

function scoreRelationLegacy(
  relations: { targetId: string; type: string }[],
  targetId: string,
): number {
  const rel = relations.find((r) => r.targetId === targetId)
  if (!rel) return 0
  switch (rel.type) {
    case 'spouse':
      return 4
    case 'engaged':
      return 3
    case 'ex_spouse':
      return -1
    default:
      return 0
  }
}

function pairScoreFromSnapshot(
  aId: string,
  bId: string,
  initialRelations: Record<string, { targetId: string; type: string }[]>,
  initialBonds: Record<string, Record<string, RelationshipBond>>,
): number {
  const bondScore = pairBondScore(
    initialBonds[aId],
    initialBonds[bId],
    aId,
    bId,
  )
  const kinScore =
    scoreRelationLegacy(initialRelations[aId] ?? [], bId) +
    scoreRelationLegacy(initialRelations[bId] ?? [], aId)
  return bondScore + kinScore
}

function pairScoreCurrent(
  aId: string,
  bId: string,
  charA: Character,
  charB: Character,
): number {
  const bondScore = pairBondScore(charA.bonds, charB.bonds, aId, bId)
  const kinScore =
    scoreRelationLegacy(charA.relations, bId) +
    scoreRelationLegacy(charB.relations, aId)
  return bondScore + kinScore
}

function outcomeFromDelta(delta: number): MeetingRelationOutcome {
  if (delta > 0) return 'improved'
  if (delta < 0) return 'worsened'
  return 'unchanged'
}

/** 比较会面参与者之间的整体关系变化 */
export function compareMeetingRelations(
  participantIds: string[],
  initialRelations: Record<string, { targetId: string; type: string }[]>,
  initialBonds: Record<string, Record<string, RelationshipBond>>,
  characters: Record<string, Character>,
): MeetingRelationDelta {
  let totalDelta = 0

  for (let i = 0; i < participantIds.length; i += 1) {
    for (let j = i + 1; j < participantIds.length; j += 1) {
      const aId = participantIds[i]
      const bId = participantIds[j]
      const before = pairScoreFromSnapshot(
        aId,
        bId,
        initialRelations,
        initialBonds,
      )
      const charA = characters[aId]
      const charB = characters[bId]
      const after =
        charA && charB
          ? pairScoreCurrent(aId, bId, charA, charB)
          : before
      totalDelta += after - before
    }
  }

  return { outcome: outcomeFromDelta(totalDelta), scoreDelta: totalDelta }
}

/** 某参与者与其他与会者之间的个人关系变化 */
export function comparePersonalMeetingRelations(
  charId: string,
  participantIds: string[],
  initialRelations: Record<string, { targetId: string; type: string }[]>,
  initialBonds: Record<string, Record<string, RelationshipBond>>,
  characters: Record<string, Character>,
): MeetingRelationOutcome {
  let delta = 0

  for (const otherId of participantIds) {
    if (otherId === charId) continue
    const before = pairScoreFromSnapshot(
      charId,
      otherId,
      initialRelations,
      initialBonds,
    )
    const char = characters[charId]
    const other = characters[otherId]
    const after =
      char && other
        ? pairScoreCurrent(charId, otherId, char, other)
        : before
    delta += after - before
  }

  return outcomeFromDelta(delta)
}

export function snapshotParticipantRelations(
  participantIds: string[],
  characters: Record<string, Character>,
): Record<string, Character['relations']> {
  const snapshot: Record<string, Character['relations']> = {}
  for (const id of participantIds) {
    const char = characters[id]
    if (!char) continue
    snapshot[id] = char.relations.map((r) => ({ ...r }))
  }
  return snapshot
}

/** 仅比较情感条变化（用于气泡文案） */
export function comparePersonalBondDelta(
  charId: string,
  otherId: string,
  initialBonds: Record<string, Record<string, RelationshipBond>>,
  characters: Record<string, Character>,
): number {
  const before = pairBondScore(
    initialBonds[charId],
    initialBonds[otherId],
    charId,
    otherId,
  )
  const char = characters[charId]
  const other = characters[otherId]
  const after =
    char && other
      ? pairBondScore(char.bonds, other.bonds, charId, otherId)
      : before
  return after - before
}

export { scoreBond, EMPTY_BOND }
