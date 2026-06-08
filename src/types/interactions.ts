import type { GameState, NarrativeEntry } from './game'

/** 交互动作唯一标识，采用「分类.动作」命名便于扩展 */
export type InteractionActionId =
  | 'friendly.greet'
  | 'friendly.groupChat'
  | 'romantic.flirt'
  | 'romantic.reproduce'
  | 'marriage.propose'
  | 'marriage.marry'
  | 'marriage.divorceAmicable'
  | 'marriage.divorceLegal'
  | (string & {})

export type InteractionScope = 'single' | 'multi'

export interface InteractionContext {
  /** 当前选中的角色（行动发起者） */
  actorId: string
  /** 右键锚点角色（单人互动主目标） */
  targetId: string
  /** 多人互动目标（不含发起者，≥2 时启用多人菜单） */
  targetIds?: string[]
  /** 会晤中：视同同一物理空间，可跨家族互动 */
  inMeeting?: boolean
}

export interface InteractionMenuAnchor {
  targetId: string
  targetIds?: string[]
  x: number
  y: number
}

export type InteractionMenuItemKind = 'category' | 'action'

export interface InteractionMenuItem {
  id: string
  label: string
  kind: InteractionMenuItemKind
  /** 分类下的子项（仅 kind === 'category'） */
  children?: InteractionMenuItem[]
  /** 可执行动作 id（仅 kind === 'action'） */
  actionId?: InteractionActionId
  /** 单人 / 多人互动范围（默认 single） */
  scope?: InteractionScope
  /** 仅在与目标存在婚姻关系时显示 */
  marriedOnly?: boolean
  disabled?: boolean
  disabledReason?: string
}

export interface InteractionDialogue {
  characterId: string
  text: string
}

export interface InteractionResult {
  entry: NarrativeEntry
  /** 互动专属台词，显示在家谱舞台角色气泡上 */
  dialogues?: InteractionDialogue[]
  /** 互动导致的状态变更（如订婚关系） */
  state?: Partial<GameState>
}

export interface InteractionActionHandler {
  id: InteractionActionId
  canExecute: (ctx: InteractionContext, state: GameState) => boolean
  disabledReason?: (ctx: InteractionContext, state: GameState) => string
  execute: (ctx: InteractionContext, state: GameState) => InteractionResult
}
