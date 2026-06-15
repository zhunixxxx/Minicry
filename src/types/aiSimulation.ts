import type { InteractionActionId } from './interactions'

/** AI 可自动执行的动作类型 */
export type AiActionType =
  | 'interaction'
  | 'bond_delta'
  | 'advance_time'

export interface AiInteractionAction {
  type: 'interaction'
  actionId: InteractionActionId
  actorId: string
  targetId: string
  /** 会晤中跨家族互动 */
  inMeeting?: boolean
}

export interface AiBondDeltaAction {
  type: 'bond_delta'
  fromId: string
  toId: string
  friendship?: number
  romance?: number
}

export interface AiAdvanceTimeAction {
  type: 'advance_time'
  /** 推进月数，默认 1 */
  months?: number
}

export type AiPlanAction =
  | AiInteractionAction
  | AiBondDeltaAction
  | AiAdvanceTimeAction

/** Deepseek 返回的推演计划 */
export interface AiSimulationPlan {
  /** 主叙事文本，显示在故事线 */
  narrative: string
  /** 涉及的角色 id 列表 */
  characterIds?: string[]
  /** 角色台词，显示在家谱舞台对话气泡上（角色 id → 台词） */
  reactions?: Record<string, string>
  /** 按顺序执行的游戏动作 */
  actions?: AiPlanAction[]
}

export interface AiSimulationResult {
  plan: AiSimulationPlan
  /** 原始 AI 回复，便于调试 */
  rawResponse: string
}

export class AiServiceError extends Error {
  constructor(
    message: string,
    public readonly code: 'no_api_key' | 'network' | 'parse' | 'api',
  ) {
    super(message)
    this.name = 'AiServiceError'
  }
}
