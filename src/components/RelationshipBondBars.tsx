import {
  getFriendshipLabel,
  getRomanceLabel,
} from '../utils/relationshipBonds'

interface BondTrackProps {
  label: string
  value: number
  tone: 'friendship' | 'romance'
  tierLabel: string
}

function BondTrack({ label, value, tone, tierLabel }: BondTrackProps) {
  return (
    <div className={`bond-track-row bond-track-row--${tone}`}>
      <span className="bond-axis-label">{label}</span>
      <div className="bond-track">
        <div
          className={`bond-fill bond-fill--${tone}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="bond-value">{value}</span>
      <span className="bond-tier">{tierLabel}</span>
    </div>
  )
}

interface Props {
  /** 我对对方 */
  outgoingFriendship: number
  outgoingRomance: number
  /** 对方对我 */
  incomingFriendship: number
  incomingRomance: number
  compact?: boolean
}

export function RelationshipBondBars({
  outgoingFriendship,
  outgoingRomance,
  incomingFriendship,
  incomingRomance,
  compact = false,
}: Props) {
  return (
    <div className={`bond-bars ${compact ? 'bond-bars--compact' : ''}`}>
      <div className="bond-direction-group">
        <span className="bond-direction-label">我对 TA</span>
        <BondTrack
          label="友情"
          value={outgoingFriendship}
          tone="friendship"
          tierLabel={getFriendshipLabel(outgoingFriendship)}
        />
        <BondTrack
          label="爱情"
          value={outgoingRomance}
          tone="romance"
          tierLabel={getRomanceLabel(outgoingRomance)}
        />
      </div>
      <div className="bond-direction-group">
        <span className="bond-direction-label">TA 对我</span>
        <BondTrack
          label="友情"
          value={incomingFriendship}
          tone="friendship"
          tierLabel={getFriendshipLabel(incomingFriendship)}
        />
        <BondTrack
          label="爱情"
          value={incomingRomance}
          tone="romance"
          tierLabel={getRomanceLabel(incomingRomance)}
        />
      </div>
    </div>
  )
}
