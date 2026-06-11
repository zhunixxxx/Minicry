import { useEffect, useRef } from 'react'
import type { Character, House } from '../types/game'
import { CharacterLink } from './CharacterLink'
import { CharacterAvatar } from './CharacterAvatar'
import { RelationshipBondBars } from './RelationshipBondBars'
import { getRelationLabel } from '../utils/familyTree'
import { linkifyCharacterNames } from '../utils/linkifyNames'
import {
  getBond,
  getBondPartnerIds,
  getKinshipRelations,
} from '../utils/relationshipBonds'

interface Props {
  character?: Character
  house?: House
  characters: Record<string, Character>
  onSelectCharacter: (id: string) => void
}

const ATTR_LABELS: Record<string, string> = {
  diplomacy: '公关',
  martial: '行动',
  stewardship: '统筹',
  intrigue: '策略',
  learning: '学养',
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
    if (!character) return
    panelRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [character?.id])

  if (!character || !house) {
    return (
      <aside className="panel character-panel" ref={panelRef}>
        <header className="panel-header">
          <span className="panel-label">人物档案</span>
        </header>
        <div className="panel-empty">
          <p className="panel-empty-icon" aria-hidden="true">📋</p>
          <p className="panel-empty-title">暂无人物</p>
          <p className="panel-empty-desc">创建人物后，档案将显示在此处。</p>
        </div>
      </aside>
    )
  }

  const kinshipRelations = getKinshipRelations(character)
  const bondPartnerIds = getBondPartnerIds(character.id, characters)

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
            {house.motto}
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
        <h3>能力</h3>
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
        <h3>性格</h3>
        <div className="tag-list">
          {character.traits.map((t) => (
            <span key={t} className="tag tag-trait">
              {t}
            </span>
          ))}
        </div>
      </section>

      <section className="info-section">
        <h3>兴趣爱好</h3>
        <div className="tag-list">
          {character.preferences.map((p) => (
            <span key={p} className="tag tag-pref">
              {p}
            </span>
          ))}
        </div>
      </section>

      {kinshipRelations.length > 0 && (
        <section className="info-section">
          <h3>亲缘关系</h3>
          <ul className="relation-list">
            {kinshipRelations.map((rel) => {
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
      )}

      <section className="info-section">
        <h3>情感关系</h3>
        {bondPartnerIds.length === 0 ? (
          <p className="bond-empty-hint">暂无显著的情感往来记录。</p>
        ) : (
          <ul className="bond-partner-list">
            {bondPartnerIds.map((partnerId) => {
              const partner = characters[partnerId]
              if (!partner) return null
              const outgoing = getBond(character, partnerId)
              const incoming = getBond(partner, character.id)
              return (
                <li key={partnerId} className="bond-partner-item">
                  <CharacterLink
                    name={partner.name}
                    onClick={() => onSelectCharacter(partner.id)}
                    className="bond-partner-name"
                  />
                  <RelationshipBondBars
                    outgoingFriendship={outgoing.friendship}
                    outgoingRomance={outgoing.romance}
                    incomingFriendship={incoming.friendship}
                    incomingRomance={incoming.romance}
                  />
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="info-section bio-section">
        <h3>人物传记</h3>
        <p className="character-bio">
          {linkifyCharacterNames(character.bio, characters, onSelectCharacter)}
        </p>
      </section>
    </aside>
  )
}
