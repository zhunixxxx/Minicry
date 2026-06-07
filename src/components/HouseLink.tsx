interface Props {
  name: string
  onClick: () => void
  className?: string
}

export function HouseLink({ name, onClick, className = '' }: Props) {
  return (
    <button
      type="button"
      className={`house-link ${className}`.trim()}
      onClick={onClick}
    >
      {name}
    </button>
  )
}
