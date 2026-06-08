import { useEffect, useRef } from 'react'
import type { Character, House } from '../types/game'
import { CharacterLink } from './CharacterLink'
import { CharacterAvatar } from './CharacterAvatar'
import { getRelationLabel } from '../utils/familyTree'
import { linkifyCharacterNames } from '../utils/linkifyNames'

interface Props {
  character: Character
  house: House
  characters: Record<string, Character>
  onSelectCharacter: (id: string) => void
}

const ATTR_LABELS: Record<string, string> = {
  diplomacy: '外交',
  martial: '军事',
  stewardship: '管理',
  intrigue: '谋略',
  learning: '学识',
}

const GENDER_LABEL: Record<string, string> = {
  male: '男',
  female: '女',
}

export function CharacterPanel({
  character,
  house,
  characters,
  onSelectCharacter,
}: Props) {
  const panelRef = useRef<HTMLElement>(null)

  useEffect(() => {
    panelRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [character.id])

  const events = character.relations.filter(
    (r) =>
      r.type === 'rival' ||
      r.type === 'lover' ||
      r.type === 'engaged' ||
      r.type === 'ally',
  )

  return (
    <aside className="panel character-panel" ref={panelRef}>
      <header className="panel-header">
        <span className="panel-label">人物档案</span>
      </header>

      <div className="character-hero">
        <div
          className="character-avatar"
          style={{ borderColor: house.color }}
        >
          <CharacterAvatar avatar={character.avatar} size={52} />
          <span className="house-emblem" title={house.name}>
            {house.emblem}
          </span>
        </div>
        <div className="character-identity">
          <h2 className="character-name">
            {character.name}
            {character.nickname ? (
              <span className="character-nickname">「{character.nickname}」</span>
            ) : null}
          </h2>
          <p className="character-title">{character.title}</p>
          <p className="character-house" style={{ color: house.color }}>
            {house.name} · {house.motto}
          </p>
        </div>
      </div>

      <section className="info-section">
        <h3>基本信息</h3>
        <dl className="info-grid">
          <dt>年龄</dt>
          <dd>{character.age} 岁</dd>
          <dt>性别</dt>
          <dd>{GENDER_LABEL[character.gender]}</dd>
          <dt>状态</dt>
          <dd>{character.isAlive ? '在世' : '已故'}</dd>
          <dt>职业</dt>
          <dd>{character.title}</dd>
        </dl>
      </section>

      <section className="info-section">
        <h3>人物属性</h3>
        <div className="attr-bars">
          {Object.entries(character.attributes).map(([key, value]) => (
            <div key={key} className="attr-row">
              <span className="attr-label">{ATTR_LABELS[key]}</span>
              <div className="attr-track">
                <div
                  className="attr-fill"
                  style={{
                    width: `${(value / 20) * 100}%`,
                    background: house.color,
                  }}
                />
              </div>
              <span className="attr-value">{value}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="info-section">
        <h3>性格特质</h3>
        <div className="tag-list">
          {character.traits.map((t) => (
            <span key={t} className="tag tag-trait">
              {t}
            </span>
          ))}
        </div>
      </section>

      <section className="info-section">
        <h3>喜好</h3>
        <div className="tag-list">
          {character.preferences.map((p) => (
            <span key={p} className="tag tag-pref">
              {p}
            </span>
          ))}
        </div>
      </section>

      <section className="info-section">
        <h3>关系网络</h3>
        <ul className="relation-list">
          {character.relations.map((rel) => {
            const target = characters[rel.targetId]
            if (!target) return null
            return (
              <li key={`${rel.targetId}-${rel.type}`} className="relation-item">
                <span className="relation-type">
                  {rel.label ?? getRelationLabel(rel.type)}
                </span>
                <CharacterLink
                  name={target.name}
                  onClick={() => onSelectCharacter(target.id)}
                  className="relation-name"
                />
              </li>
            )
          })}
        </ul>
      </section>

      {events.length > 0 && (
        <section className="info-section">
          <h3>关键事件</h3>
          <ul className="event-list">
            {events.map((rel) => {
              const target = characters[rel.targetId]
              return (
                <li key={rel.targetId} className="event-item">
                  与{' '}
                  {target ? (
                    <CharacterLink
                      name={target.name}
                      onClick={() => onSelectCharacter(target.id)}
                    />
                  ) : null}{' '}
                  的{rel.label ?? getRelationLabel(rel.type)}关系
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <section className="info-section bio-section">
        <h3>人物传记</h3>
        <p className="character-bio">
          {linkifyCharacterNames(character.bio, characters, onSelectCharacter)}
        </p>
      </section>
    </aside>
  )
}
