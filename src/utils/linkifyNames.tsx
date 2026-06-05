import type { ReactNode } from 'react'
import { CharacterLink } from '../components/CharacterLink'
import type { Character } from '../types/game'

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildNameIndex(
  characters: Record<string, Character>,
): { pattern: string; resolve: (matched: string) => string | undefined } {
  const variantToId = new Map<string, string>()

  for (const char of Object.values(characters)) {
    variantToId.set(char.name, char.id)
    const short = char.name.split('·')[0]
    if (short && short !== char.name) {
      variantToId.set(short, char.id)
    }
  }

  const variants = [...variantToId.keys()].sort((a, b) => b.length - a.length)
  const pattern = variants.map(escapeRegex).join('|')

  return {
    pattern,
    resolve: (matched) => variantToId.get(matched),
  }
}

export function linkifyCharacterNames(
  text: string,
  characters: Record<string, Character>,
  onSelect: (id: string) => void,
): ReactNode {
  const { pattern, resolve } = buildNameIndex(characters)
  if (!pattern) return text

  const regex = new RegExp(`(${pattern})`, 'g')
  const parts = text.split(regex)

  return parts.map((part, i) => {
    const charId = resolve(part)
    if (charId) {
      return (
        <CharacterLink
          key={`${i}-${part}`}
          name={part}
          onClick={() => onSelect(charId)}
        />
      )
    }
    return part
  })
}
