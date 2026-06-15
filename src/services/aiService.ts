import type { Character, GameState, House } from '../types/game'
import type { InteractionActionId } from '../types/interactions'
import {
  AiServiceError,
  type AiSimulationPlan,
  type AiSimulationResult,
} from '../types/aiSimulation'
import { formatDate } from '../utils/familyTree'

const AVAILABLE_ACTIONS: InteractionActionId[] = [
  'friendly.greet',
  'friendly.groupChat',
  'romantic.flirt',
  'marriage.propose',
]

function getApiKey(): string | undefined {
  return import.meta.env.VITE_DEEPSEEK_API_KEY?.trim() || undefined
}

function getApiUrl(): string {
  return import.meta.env.VITE_DEEPSEEK_API_URL?.trim() || '/api/deepseek/chat/completions'
}

function buildCharacterSummary(
  char: Character,
  houses: Record<string, House>,
): Record<string, unknown> {
  const house = houses[char.houseId]
  const bonds: Record<string, { friendship: number; romance: number }> = {}
  for (const [targetId, bond] of Object.entries(char.bonds ?? {})) {
    if (bond.friendship > 0 || bond.romance > 0) {
      bonds[targetId] = { friendship: bond.friendship, romance: bond.romance }
    }
  }
  return {
    id: char.id,
    name: char.name,
    age: char.age,
    gender: char.gender,
    house: house?.name ?? char.houseId,
    title: char.title,
    traits: char.traits,
    isAlive: char.isAlive,
    spouseIds: char.spouseIds,
    bonds,
  }
}

function buildSystemPrompt(state: GameState): string {
  const alive = Object.values(state.characters).filter((c) => c.isAlive)
  const summaries = alive.map((c) => buildCharacterSummary(c, state.houses))

  return `你是 Minicry 叙事沙盒游戏的剧情推演引擎。背景为 1840 年代维多利亚时代英国乡绅家族。

当前日期：${formatDate(state.year, state.month)}
当前玩家操控角色 id：${state.selectedCharacterId}

存活角色列表（JSON）：
${JSON.stringify(summaries, null, 2)}

可自动执行的动作（actionId）：
${AVAILABLE_ACTIONS.map((a) => `- ${a}`).join('\n')}

请根据玩家的剧情描述，生成推演结果。你必须只返回合法 JSON，格式如下：
{
  "narrative": "第三人称叙事，描述发生了什么（100-300字）",
  "characterIds": ["涉及的角色 id"],
  "reactions": { "角色id": "该角色在此情境下说出的一句台词（可含引号，10-40字）" },
  "actions": [
    { "type": "interaction", "actionId": "friendly.greet", "actorId": "...", "targetId": "..." },
    { "type": "bond_delta", "fromId": "...", "toId": "...", "friendship": 5, "romance": 3 },
    { "type": "advance_time", "months": 1 }
  ]
}

规则：
1. actions 中使用角色 id，不要用名字
2. 互动动作须符合游戏逻辑（同族或会晤中才能友善互动；浪漫须异性非近亲）
3. 若玩家描述无法执行具体互动，可只写 narrative 和 reactions，actions 可为空数组
4. 不要生成需要弹窗确认的动作（结婚、离婚、生育）
5. narrative 应体现玩家意图，文风古典雅致
6. reactions 必填：为 characterIds 中每个角色各写一句符合性格与情境的台词，将显示在游戏对话气泡中；台词用第一人称，像角色亲口说出`
}

function extractJson(text: string): string {
  const trimmed = text.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenced) return fenced[1].trim()
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1)
  return trimmed
}

function sanitizeReactions(
  reactions: unknown,
): Record<string, string> | undefined {
  if (!reactions || typeof reactions !== 'object') return undefined

  const sanitized: Record<string, string> = {}
  for (const [id, text] of Object.entries(reactions)) {
    if (typeof text === 'string' && text.trim()) {
      sanitized[id] = text.trim()
    }
  }
  return Object.keys(sanitized).length > 0 ? sanitized : undefined
}

function parsePlan(raw: string): AiSimulationPlan {
  try {
    const json = JSON.parse(extractJson(raw)) as Partial<AiSimulationPlan>
    if (!json.narrative || typeof json.narrative !== 'string') {
      throw new Error('缺少 narrative 字段')
    }

    const reactions = sanitizeReactions(json.reactions)
    const characterIds = Array.isArray(json.characterIds) ? json.characterIds : []
    const mergedCharacterIds = [
      ...new Set([
        ...characterIds,
        ...Object.keys(reactions ?? {}),
      ]),
    ]

    return {
      narrative: json.narrative.trim(),
      characterIds: mergedCharacterIds,
      reactions,
      actions: Array.isArray(json.actions) ? json.actions : [],
    }
  } catch (err) {
    throw new AiServiceError(
      `AI 返回格式无法解析：${err instanceof Error ? err.message : '未知错误'}`,
      'parse',
    )
  }
}

export async function requestAiSimulation(
  state: GameState,
  userPrompt: string,
): Promise<AiSimulationResult> {
  const apiKey = getApiKey()
  if (!apiKey) {
    throw new AiServiceError(
      '未配置 API Key。请在项目根目录创建 .env.local 并设置 VITE_DEEPSEEK_API_KEY',
      'no_api_key',
    )
  }

  const protagonist = state.characters[state.selectedCharacterId]
  const enrichedPrompt = protagonist
    ? `玩家操控 ${protagonist.name}（id: ${protagonist.id}）。\n\n剧情安排：${userPrompt}`
    : userPrompt

  let response: Response
  try {
    response = await fetch(getApiUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: import.meta.env.VITE_DEEPSEEK_MODEL?.trim() || 'deepseek-chat',
        messages: [
          { role: 'system', content: buildSystemPrompt(state) },
          { role: 'user', content: enrichedPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.8,
      }),
    })
  } catch {
    throw new AiServiceError('网络请求失败，请检查网络连接', 'network')
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new AiServiceError(
      `API 请求失败（${response.status}）${detail ? `：${detail.slice(0, 200)}` : ''}`,
      'api',
    )
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  const content = data.choices?.[0]?.message?.content
  if (!content) {
    throw new AiServiceError('API 返回内容为空', 'api')
  }

  return { plan: parsePlan(content), rawResponse: content }
}