interface Props {
  name: string
  onClick: () => void
  className?: string
}

export function CharacterLink({ name, onClick, className = '' }: Props) {
  return (
    <button
      type="button"
      className={`character-link ${className}`.trim()}
      onClick={onClick}
    >
      {name}
    </button>
  )
}
