import type { Character, NarrativeEntry } from '../types/game'
import { buildEventReaction } from './ageSpeech'
import { buildEventKindReaction } from './eventReactionDialogues'

const PRESET_REACTIONS: Record<string, Record<string, string>> = {
  'n-2': {
    'char-elena': '这一天，我等了很久。',
    'char-aldrin': '金雀花庄园的未来，交给你了。',
    'char-cedric': '姐姐……她确实比我更适合。',
  },
  'n-3': {
    'char-elena': '哪怕只有一会儿，也够了。',
    'char-rowan': '我宁愿冒险，也不愿再等了。',
    'char-lyra': '你们的事，我会守口如瓶。',
  },
  'n-4': {
    'char-theron': '该让金雀花知道，这河道由谁说了算。',
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
  const entryType = entry.type === 'player' ? 'player' : 'event'

  for (const id of involved) {
    const char = characters[id]
    if (!char) continue

    const kindLine = buildEventKindReaction(char, entry, characters)
    if (kindLine) {
      reactions[id] = kindLine
      continue
    }

    reactions[id] = buildEventReaction(char, entryType)
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
  return buildEventReaction(char, 'event')
}
