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
  很有魅力: ['今天的你，特别好看。', '这眼神，让人移不开。', '你一笑，周围都亮了。'],
  骄傲: ['能跟我说话，算你运气好。', '别误会，我只是顺便夸你一句。', '别得意，我可没别的意思。'],
  开朗: ['嘿，笑一个嘛！', '你今天的样子真好看！', '来，跟我聊两句？'],
  重感情: ['见到你，心跳总会快一点。', '今晚月色很好，想和你一起看。', '不知道为什么，看见你就想靠近。'],
  机灵: ['哦？你脸红了。', '别躲，让我好好看看你。', '被我抓到了吧，你在偷看我。'],
  冷静: ['……你今天不错。', '别多想，随口一说。', '嗯，挺顺眼的。'],
  审慎: ['要是冒昧了，抱歉……', '容我说一句心里话。', '不知道合不合适，但我想说……'],
}

const TARGET_TRAIT_LINES: Record<string, string[]> = {
  骄傲: ['哼，油嘴滑舌。', '少来这套。', '你以为我会信？'],
  敏感: ['你、你说什么……', '别、别这样……', '别靠太近……'],
  开朗: ['哈哈，你真会说话！', '讨厌啦！', '行行行，算你会说。'],
  重感情: ['你也是……', '我的心跳得好快。', '别说了，我脸都红了。'],
  机灵: ['哦？你胆子不小。', '有趣，继续。', '你这套对我可不管用——大概吧。'],
  冷静: ['……无聊。', '说完了？', '嗯，知道了。'],
  审慎: ['这、这合适吗……', '别让人看见。', '你小声点……'],
  戒心重: ['你到底想做什么？', '少在我面前耍花样。', '别以为我听不出你的意图。'],
  急性子: ['有话快说！', '别磨磨蹭蹭的！', '你到底想表达什么？'],
}

const ACTOR_DEFAULT = [
  '你今天特别好看。',
  '能跟你单独说会儿话，真好。',
  '刚才还在想你，你就出现了。',
  '别走，陪我说说话。',
  '你今天的笑容很犯规。',
  '不知道为什么，看见你就想逗你。',
  '有空吗？想约你待一会儿。',
]
const TARGET_DEFAULT = [
  '……',
  '你这话从何说起？',
  '别闹。',
  '你认真的？',
  '再这样我可要生气了——大概吧。',
  '耳朵都红了，还说这些。',
  '好啦好啦，我知道了。',
]

const LOVER_ACTOR = [
  '只有在你面前，我才敢这样说话。',
  '每次看见你，还是像第一次那样心动。',
  '要是能一直这样待着就好了。',
  '你知道的，我对别人从不会这样。',
  '别走，再让我看你一会儿。',
  '跟你在一起的时候，时间总是过得太快。',
  '我想把这句话藏很久，但还是想告诉你——我在乎你。',
]
const LOVER_TARGET = [
  '我也是……',
  '你总知道怎么说进我心里。',
  '别说了，我会当真的。',
  '你再说下去，我就舍不得走了。',
  '嗯，我也是这么想的。',
  '你这个人啊……真拿你没办法。',
  '我也是，每次看见你都一样。',
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
    `${shortName(target)}，你今天真好看。`,
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
