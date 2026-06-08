export type Gender = 'male' | 'female'

export type RelationType =
  | 'parent'
  | 'child'
  | 'spouse'
  | 'ex_spouse'
  | 'engaged'
  | 'sibling'
  | 'lover'
  | 'rival'
  | 'ally'

export interface Relation {
  targetId: string
  type: RelationType
  label?: string
}

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

export interface NarrativeEntry {
  id: string
  year: number
  month: number
  text: string
  characterIds?: string[]
  reactions?: Record<string, string>
  type: 'event' | 'player' | 'system'
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
