import type { Character, NarrativeEntry } from '../types/game'

function shortName(name: string): string {
  return name.split('·')[0]
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function reactionByTraits(char: Character, entry: NarrativeEntry): string {
  const traits = char.traits
  const type = entry.type

  if (type === 'player') {
    if (traits.includes('进取心强')) return '机会来了……'
    if (traits.includes('审慎') || traits.includes('戒心重')) return '这步太冒险，得再想想。'
    if (traits.includes('有同理心')) return '希望不要伤及无辜。'
    if (traits.includes('骄傲')) return '正合我意。'
    if (traits.includes('机灵')) return '有意思，看看怎么借力。'
    return '有人在背后推动局面。'
  }

  if (traits.includes('进取心强')) return '机会来了，不能错过。'
  if (traits.includes('敏感') || traits.includes('低调')) return '……还是先观望吧。'
  if (traits.includes('骄傲')) return '不过如此。'
  if (traits.includes('有同理心')) return '希望不要有人受伤。'
  if (traits.includes('抗压强')) return '事已至此，只能往前。'
  if (traits.includes('机灵')) return '这事没那么简单。'
  if (traits.includes('有原则')) return '希望一切顺利。'
  if (traits.includes('急性子')) return '还等什么？快行动！'
  if (traits.includes('求知欲强')) return '得把今天的事记下来……'
  if (traits.includes('冷静')) return '正合我意。'
  if (traits.includes('重感情')) return '心里忽然有些乱。'

  return '局势越来越复杂了。'
}

const PRESET_REACTIONS: Record<string, Record<string, string>> = {
  'n-2': {
    'char-elena': '这一天，我等了很久。',
    'char-aldrin': '黑木的未来，交给你了。',
    'char-cedric': '姐姐……她确实比我更适合。',
  },
  'n-3': {
    'char-elena': '哪怕只有一会儿，也够了。',
    'char-rowan': '我宁愿冒险，也不愿再等了。',
    'char-lyra': '你们的事，我会守口如瓶。',
  },
  'n-4': {
    'char-theron': '该让黑木知道谁说了算。',
    'char-aldrin': '塞隆这是在逼我们出手。',
  },
}

export function generateReactions(
  entry: NarrativeEntry,
  characters: Record<string, Character>,
): Record<string, string> {
  const preset = PRESET_REACTIONS[entry.id]
  if (preset) return { ...preset }

  const reactions: Record<string, string> = {}
  const involved = new Set(entry.characterIds ?? [])

  for (const id of involved) {
    const char = characters[id]
    if (!char) continue

    if (entry.text.includes(shortName(char.name))) {
      reactions[id] = reactionByTraits(char, entry)
    } else {
      reactions[id] = reactionByTraits(char, entry)
    }
  }

  return reactions
}

export function enrichNarrativeEntry(
  entry: NarrativeEntry,
  characters: Record<string, Character>,
): NarrativeEntry {
  if (entry.reactions || entry.type === 'system') return entry
  if (!entry.characterIds?.length) return entry

  return {
    ...entry,
    reactions: generateReactions(entry, characters),
  }
}

export function enrichNarrative(
  entries: NarrativeEntry[],
  characters: Record<string, Character>,
): NarrativeEntry[] {
  return entries.map((e) => enrichNarrativeEntry(e, characters))
}

export function randomWitnessReaction(char: Character): string {
  const lines = [
    `这跟${char.title}有什么关系？`,
    '感觉要有大事发生。',
    '先看看再说。',
    pick(['有点不安。', '倒也有趣。', '意料之中。']),
  ]
  if (char.traits.includes('戒心重')) return '这里面肯定有猫腻。'
  return pick(lines)
}
