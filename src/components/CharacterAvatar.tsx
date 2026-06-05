import { avatarIdToDataUrl, isGeneratedAvatar } from '../utils/avatars'

interface Props {
  avatar: string
  size?: number
  className?: string
}

export function CharacterAvatar({ avatar, size = 48, className = '' }: Props) {
  if (isGeneratedAvatar(avatar)) {
    const src = avatarIdToDataUrl(avatar)
    if (src) {
      return (
        <img
          src={src}
          alt=""
          className={`character-avatar-img ${className}`.trim()}
          width={size}
          height={size}
          draggable={false}
        />
      )
    }
  }

  return (
    <span
      className={`character-avatar-emoji ${className}`.trim()}
      style={{ fontSize: size * 0.55, lineHeight: 1 }}
      aria-hidden
    >
      {avatar}
    </span>
  )
}
