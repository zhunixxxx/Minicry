import type { Character } from '../../types/game'

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function shortName(char: Character): string {
  return char.nickname || char.name.split('·')[0] || char.name
}

function lineByTraits(
  char: Character,
  traitLines: Record<string, string[]>,
  fallback: string[],
): string {
  for (const trait of char.traits) {
    const lines = traitLines[trait]
    if (lines?.length) return pick(lines)
  }
  return pick(fallback)
}

function isLoverOf(actor: Character, target: Character): boolean {
  return actor.relations.some(
    (r) => r.targetId === target.id && r.type === 'lover',
  )
}

const ACTOR_TRAIT_LINES: Record<string, string[]> = {
  魅力非凡: ['今日的你，格外动人。', '这双眼，叫人移不开目光。'],
  傲慢: ['能与你说话，已是你的荣幸。', '别误会，我只是顺便夸你一句。'],
  活泼: ['嘿，笑一个嘛！', '你今天的样子真好看！'],
  多情: ['遇见你，总让人心跳加快。', '愿把此刻的月色，都赠与你。'],
  狡黠: ['哦？你脸红了。', '别躲，让我好好看看你。'],
  冷酷: ['……你今日不错。', '别多想，随口一说。'],
  谨慎: ['若冒昧了，请见谅……', '请允许我说一句心里话。'],
}

const TARGET_TRAIT_LINES: Record<string, string[]> = {
  傲慢: ['哼，油嘴滑舌。', '少来这套。'],
  怯懦: ['你、你说什么……', '别、别这样……'],
  活泼: ['哈哈，你真会说话！', '讨厌啦！'],
  多情: ['你也是……', '我的心跳得很快。'],
  狡黠: ['哦？你胆子不小。', '有趣，继续。'],
  冷酷: ['……无聊。', '说完了？'],
  谨慎: ['这、这合适吗……', '别让人看见。'],
  多疑: ['你到底想做什么？', '少在我面前耍花样。'],
  急躁: ['有话快说！', '别磨磨蹭蹭的！'],
}

const ACTOR_DEFAULT = ['你今日格外好看。', '能与你独处，实乃幸事。']
const TARGET_DEFAULT = ['……', '你这话从何说起？', '别闹。']

const LOVER_ACTOR = [
  '只有在你面前，我才敢这样说话。',
  '每一眼望去，仍像初见那般心动。',
]
const LOVER_TARGET = [
  '我也是……',
  '你总知道怎么说进我心里。',
]

/** 调情：发起者台词 */
export function buildFlirtActorLine(
  actor: Character,
  target: Character,
): string {
  if (isLoverOf(actor, target)) {
    return pick(LOVER_ACTOR)
  }
  const named = pick([
    `${shortName(target)}，你今日真好看。`,
    `嘿，${shortName(target)}——`,
    ...ACTOR_DEFAULT,
  ])
  if (named.length <= 18) return named
  return lineByTraits(actor, ACTOR_TRAIT_LINES, ACTOR_DEFAULT)
}

/** 调情：回应者台词 */
export function buildFlirtTargetLine(
  actor: Character,
  target: Character,
): string {
  if (isLoverOf(target, actor) || isLoverOf(actor, target)) {
    return pick(LOVER_TARGET)
  }
  const named = pick([
    `${shortName(actor)}，你……`,
    ...TARGET_DEFAULT,
  ])
  if (named.length <= 16) return named
  return lineByTraits(target, TARGET_TRAIT_LINES, TARGET_DEFAULT)
}
