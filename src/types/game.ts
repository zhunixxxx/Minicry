export type Gender = 'male' | 'female'

export type RelationType =
  | 'parent'
  | 'child'
  | 'spouse'
  | 'ex_spouse'
  | 'engaged'
  | 'sibling'
  /** @deprecated 已迁移至 bonds，仅用于旧存档兼容 */
  | 'lover'
  /** @deprecated 已迁移至 bonds，仅用于旧存档兼容 */
  | 'rival'
  /** @deprecated 已迁移至 bonds，仅用于旧存档兼容 */
  | 'ally'

/** 单向情感：我对某人的友情与爱情（0–100，互不影响） */
export interface RelationshipBond {
  friendship: number
  romance: number
}

export interface Relation {
  targetId: string
  type: RelationType
  label?: string
}

/** 亲缘/身份类关系，不含情感条 */
export const KINSHIP_RELATION_TYPES: RelationType[] = [
  'parent',
  'child',
  'spouse',
  'ex_spouse',
  'engaged',
  'sibling',
]

export interface CharacterAttributes {
  diplomacy: number
  martial: number
  stewardship: number
  intrigue: number
  learning: number
}

export interface Character {
  id: string
  name: string
  surname?: string
  givenName?: string
  nickname?: string
  age: number
  gender: Gender
  title: string
  /** 被指定为继承人的家族；离族后应清除 */
  heirOfHouseId?: string
  houseId: string
  /** 原籍家族；跨族入赘/出嫁后保留，离婚时归返 */
  nativeHouseId?: string
  /** 原籍姓氏，与 nativeHouseId 对应 */
  nativeSurname?: string
  avatar: string
  traits: string[]
  preferences: string[]
  relations: Relation[]
  /** 我对他人的情感倾向（单向）；友情与爱情分轨 */
  bonds: Record<string, RelationshipBond>
  parentIds: string[]
  spouseIds: string[]
  isAlive: boolean
  attributes: CharacterAttributes
  bio: string
}

export interface House {
  id: string
  name: string
  motto: string
  color: string
  emblem: string
}

/** 纪事事件分类，用于生成情境化气泡反应 */
export type NarrativeEventKind =
  | 'story_preset'
  | 'ambient'
  | 'meeting_start'
  | 'meeting_end'
  | 'marriage_propose'
  | 'marriage_wedding'
  | 'divorce_amicable'
  | 'divorce_legal'
  | 'reproduction'
  | 'intervention_diplomacy'
  | 'intervention_marriage'
  | 'intervention_rivalry'
  | 'intervention_custom'

/** 会面结束时与会者关系相较开始时的变化 */
export type MeetingRelationOutcome = 'improved' | 'worsened' | 'unchanged'

/** 生成气泡反应时的上下文（如发起者、目标） */
export interface NarrativeReactionContext {
  actorId?: string
  targetId?: string
  crossHouse?: boolean
  /** 会面整体关系变化（用于结束叙事） */
  meetingOutcome?: MeetingRelationOutcome
  /** 会面开始时各参与者 relations 快照（用于结束气泡） */
  meetingInitialRelations?: Record<string, Relation[]>
  /** 会面开始时各参与者 bonds 快照 */
  meetingInitialBonds?: Record<string, Record<string, RelationshipBond>>
}

export interface NarrativeEntry {
  id: string
  year: number
  month: number
  text: string
  characterIds?: string[]
  reactions?: Record<string, string>
  type: 'event' | 'player' | 'system'
  eventKind?: NarrativeEventKind
  reactionContext?: NarrativeReactionContext
}

export type CharacterReactions = Record<string, string>

export interface GameState {
  year: number
  month: number
  characters: Record<string, Character>
  houses: Record<string, House>
  narrative: NarrativeEntry[]
  /** 左侧档案与互动发起者 */
  selectedCharacterId: string
  /** 家谱舞台布局焦点（切换家族时更新，不影响左侧档案） */
  treeFocusCharacterId: string
  focusedHouseId: string
}

/** 临时会晤会话（仅影响家谱舞台展示） */
export interface MeetingSession {
  hostId: string
  participantIds: string[]
  /** 会面期间降生的子女（仅展示于会晤图谱） */
  bornChildIds: string[]
  /** 会面开始时各参与者 relations 快照，用于结束时对比 */
  initialRelations: Record<string, Relation[]>
  /** 会面开始时各参与者 bonds 快照 */
  initialBonds: Record<string, Record<string, RelationshipBond>>
}

export type InterventionAction =
  | 'advance_time'
  | 'boost_diplomacy'
  | 'arrange_marriage'
  | 'spark_rivalry'
  | 'custom'

export interface CreateCharacterInput {
  surname: string
  givenName: string
  nickname: string
  age: number
  gender: Gender
  title: string
  houseId: string
  avatar: string
  traits: string[]
  preferences: string[]
  bio: string
  parentIds: string[]
  spouseId: string
  attributes: CharacterAttributes
}
