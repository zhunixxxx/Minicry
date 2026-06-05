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
    if (traits.includes('野心勃勃')) return '命运终于开始转动……'
    if (traits.includes('谨慎') || traits.includes('多疑')) return '这步棋太险，须再三权衡。'
    if (traits.includes('仁慈')) return '但愿此举不伤无辜。'
    if (traits.includes('傲慢')) return '正合我意，何须多言？'
    if (traits.includes('狡黠')) return '有趣，且看我如何借力。'
    return '有人在暗中推动棋局。'
  }

  if (traits.includes('野心勃勃')) return '机会来了，绝不能失手。'
  if (traits.includes('怯懦') || traits.includes('隐忍')) return '……还是先观望吧。'
  if (traits.includes('傲慢')) return '不过如此。'
  if (traits.includes('仁慈')) return '希望不要有人受伤。'
  if (traits.includes('坚毅')) return '既已如此，便无可退。'
  if (traits.includes('狡黠')) return '此事另有隐情。'
  if (traits.includes('虔诚')) return '愿诸神指引迷途。'
  if (traits.includes('急躁')) return '还等什么？快行动！'
  if (traits.includes('好学')) return '得记下今日种种……'
  if (traits.includes('冷酷')) return '正合我意。'
  if (traits.includes('多情')) return '心里忽然有些乱。'

  return '局势愈发难料了。'
}

const PRESET_REACTIONS: Record<string, Record<string, string>> = {
  'n-2': {
    'char-elena': '这一天，我等了很久。',
    'char-aldrin': '黑木的未来，托付给你了。',
    'char-cedric': '姐姐……她确实比我更适合。',
  },
  'n-3': {
    'char-elena': '哪怕只有一刻，也足够了。',
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
    `这与${char.title}何干？`,
    '我闻到了变故的气息。',
    '且静观其变。',
    pick(['令人不安。', '倒也有趣。', '意料之中。']),
  ]
  if (char.traits.includes('多疑')) return '其中必有蹊跷。'
  return pick(lines)
}
