import { useEffect, useRef } from 'react'
import type { Character, NarrativeEntry } from '../types/game'
import { formatDate } from '../utils/familyTree'
import { linkifyCharacterNames } from '../utils/linkifyNames'

interface Props {
  entries: NarrativeEntry[]
  year: number
  month: number
  characters: Record<string, Character>
  onSelectCharacter: (id: string) => void
}

export function NarrativePanel({
  entries,
  year,
  month,
  characters,
  onSelectCharacter,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [entries.length])

  return (
    <aside className="panel narrative-panel">
      <header className="panel-header">
        <span className="panel-label">核心叙事</span>
        <time className="game-date">{formatDate(year, month)}</time>
      </header>

      <div className="narrative-scroll" ref={scrollRef}>
        {entries.map((entry) => (
          <article
            key={entry.id}
            className={`narrative-entry narrative-entry--${entry.type}`}
          >
            <header className="entry-meta">
              <span className="entry-date">
                {formatDate(entry.year, entry.month)}
              </span>
              <span className={`entry-badge entry-badge--${entry.type}`}>
                {entry.type === 'player'
                  ? '干预'
                  : entry.type === 'event'
                    ? '事件'
                    : '背景'}
              </span>
            </header>
            <p className="entry-text">
              {linkifyCharacterNames(entry.text, characters, onSelectCharacter)}
            </p>
          </article>
        ))}
      </div>
    </aside>
  )
}
