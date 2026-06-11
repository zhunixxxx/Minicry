import type { Character, Relation, RelationshipBond } from '../types/game'

export const BOND_MIN = 0
export const BOND_MAX = 100

export const EMPTY_BOND: RelationshipBond = { friendship: 0, romance: 0 }

/** 互认恋人/可生育的浪漫阈值 */
export const MUTUAL_ROMANCE_THRESHOLD = 55

const KINSHIP_SET = new Set<string>([
  'parent',
  'child',
  'spouse',
  'ex_spouse',
  'engaged',
  'sibling',
])

export function clampBondValue(value: number): number {
  return Math.max(BOND_MIN, Math.min(BOND_MAX, Math.round(value)))
}

export function clampBond(bond: RelationshipBond): RelationshipBond {
  return {
    friendship: clampBondValue(bond.friendship),
    romance: clampBondValue(bond.romance),
  }
}

export function getBond(
  char: Character | undefined,
  targetId: string,
): RelationshipBond {
  if (!char?.bonds) return { ...EMPTY_BOND }
  const bond = char.bonds[targetId]
  return bond ? { ...bond } : { ...EMPTY_BOND }
}

export function hasMeaningfulBond(bond: RelationshipBond): boolean {
  return bond.friendship > 0 || bond.romance > 0
}

export function isKinshipRelation(rel: Relation): boolean {
  return KINSHIP_SET.has(rel.type)
}

export function getKinshipRelations(char: Character): Relation[] {
  return char.relations.filter(isKinshipRelation)
}

/** 收集与当前角色有情感条往来的所有对象 id */
export function getBondPartnerIds(
  charId: string,
  characters: Record<string, Character>,
): string[] {
  const ids = new Set<string>()
  const self = characters[charId]
  if (!self) return []

  for (const [targetId, bond] of Object.entries(self.bonds ?? {})) {
    if (targetId !== charId && hasMeaningfulBond(bond)) {
      ids.add(targetId)
    }
  }

  for (const other of Object.values(characters)) {
    if (other.id === charId) continue
    const towardSelf = other.bonds?.[charId]
    if (towardSelf && hasMeaningfulBond(towardSelf)) {
      ids.add(other.id)
    }
  }

  return [...ids].sort((a, b) => {
    const nameA = characters[a]?.name ?? ''
    const nameB = characters[b]?.name ?? ''
    return nameA.localeCompare(nameB, 'zh')
  })
}

export function getFriendshipLabel(value: number): string {
  if (value <= 15) return '疏远'
  if (value <= 35) return '相识'
  if (value <= 50) return '普通朋友'
  if (value <= 65) return '朋友'
  if (value <= 80) return '好友'
  return '挚友'
}

export function getRomanceLabel(value: number): string {
  if (value <= 15) return '无感'
  if (value <= 30) return '好感'
  if (value <= 45) return '暧昧'
  if (value <= 60) return '倾心'
  if (value <= 75) return '爱慕'
  return '热恋'
}

export function setBondOnCharacter(
  char: Character,
  targetId: string,
  bond: RelationshipBond,
): Character {
  const next = clampBond(bond)
  const bonds = { ...(char.bonds ?? {}) }

  if (!hasMeaningfulBond(next)) {
    delete bonds[targetId]
  } else {
    bonds[targetId] = next
  }

  return { ...char, bonds }
}

export function applyBondDelta(
  char: Character,
  targetId: string,
  delta: Partial<RelationshipBond>,
): Character {
  const current = getBond(char, targetId)
  return setBondOnCharacter(char, targetId, {
    friendship: current.friendship + (delta.friendship ?? 0),
    romance: current.romance + (delta.romance ?? 0),
  })
}

export function applyBondDeltaToCharacters(
  characters: Record<string, Character>,
  fromId: string,
  toId: string,
  delta: Partial<RelationshipBond>,
): Record<string, Character> {
  const from = characters[fromId]
  if (!from) return characters
  return {
    ...characters,
    [fromId]: applyBondDelta(from, toId, delta),
  }
}

export function ensureMinBond(
  char: Character,
  targetId: string,
  minimum: Partial<RelationshipBond>,
): Character {
  const current = getBond(char, targetId)
  return setBondOnCharacter(char, targetId, {
    friendship: Math.max(current.friendship, minimum.friendship ?? 0),
    romance: Math.max(current.romance, minimum.romance ?? 0),
  })
}

/** 会面等场景：将单向 bonds 折算为关系分值 */
export function scoreBond(bond: RelationshipBond): number {
  let score = 0
  if (bond.friendship <= 15) score -= 2
  else if (bond.friendship >= 80) score += 2
  else if (bond.friendship >= 50) score += 1

  if (bond.romance >= 75) score += 3
  else if (bond.romance >= 45) score += 1

  return score
}

export function pairBondScore(
  bondsA: Record<string, RelationshipBond> | undefined,
  bondsB: Record<string, RelationshipBond> | undefined,
  aId: string,
  bId: string,
): number {
  const towardB = bondsA?.[bId] ?? EMPTY_BOND
  const towardA = bondsB?.[aId] ?? EMPTY_BOND
  return scoreBond(towardB) + scoreBond(towardA)
}

export function snapshotParticipantBonds(
  participantIds: string[],
  characters: Record<string, Character>,
): Record<string, Record<string, RelationshipBond>> {
  const snapshot: Record<string, Record<string, RelationshipBond>> = {}
  for (const id of participantIds) {
    const char = characters[id]
    if (!char?.bonds) continue
    snapshot[id] = Object.fromEntries(
      Object.entries(char.bonds).map(([targetId, bond]) => [
        targetId,
        { ...bond },
      ]),
    )
  }
  return snapshot
}

const LEGACY_BOND_MAP: Record<string, RelationshipBond> = {
  lover: { friendship: 48, romance: 82 },
  ally: { friendship: 78, romance: 8 },
  rival: { friendship: 10, romance: 0 },
}

function mergeBond(
  existing: RelationshipBond,
  incoming: RelationshipBond,
): RelationshipBond {
  return clampBond({
    friendship: Math.max(existing.friendship, incoming.friendship),
    romance: Math.max(existing.romance, incoming.romance),
  })
}

/** 从旧版 relations 中的 lover/ally/rival 迁移到 bonds */
export function migrateCharacterBonds(char: Character): Character {
  let bonds: Record<string, RelationshipBond> = { ...(char.bonds ?? {}) }
  const keptRelations: Relation[] = []

  for (const rel of char.relations) {
    const legacy = LEGACY_BOND_MAP[rel.type]
    if (legacy) {
      const prev = bonds[rel.targetId] ?? { ...EMPTY_BOND }
      bonds[rel.targetId] = mergeBond(prev, legacy)
      continue
    }
    keptRelations.push(rel)
  }

  if (!char.bonds && keptRelations.length === char.relations.length) {
    return { ...char, bonds: {} }
  }

  return {
    ...char,
    relations: keptRelations,
    bonds,
  }
}

export function migrateAllCharacterBonds(
  characters: Record<string, Character>,
): Record<string, Character> {
  const migrated: Record<string, Character> = {}
  for (const [id, char] of Object.entries(characters)) {
    migrated[id] = migrateCharacterBonds(char)
  }
  return migrated
}

export function getRomanceLevel(
  from: Character | undefined,
  toId: string,
): number {
  return getBond(from, toId).romance
}

export function isMutualRomance(
  aId: string,
  bId: string,
  characters: Record<string, Character>,
): boolean {
  const a = characters[aId]
  const b = characters[bId]
  if (!a || !b) return false
  return (
    getRomanceLevel(a, bId) >= MUTUAL_ROMANCE_THRESHOLD &&
    getRomanceLevel(b, aId) >= MUTUAL_ROMANCE_THRESHOLD
  )
}
