interface Props {
  text: string
  anchorX: number
  anchorY: number
  nodeWidth: number
}

const CHAR_WIDTH = 11
const MAX_CHARS = 16

export function SpeechBubble({ text, anchorX, anchorY, nodeWidth }: Props) {
  const display =
    text.length > MAX_CHARS ? `${text.slice(0, MAX_CHARS)}…` : text
  const bubbleW = Math.max(72, Math.min(168, display.length * CHAR_WIDTH + 20))
  const bubbleH = 30
  const bx = anchorX + nodeWidth / 2 - bubbleW / 2
  const by = anchorY - bubbleH - 14
  const tailX = bubbleW / 2

  return (
    <g className="speech-bubble" transform={`translate(${bx}, ${by})`}>
      <rect
        className="bubble-bg"
        width={bubbleW}
        height={bubbleH}
        rx={8}
        ry={8}
      />
      <polygon
        className="bubble-tail"
        points={`${tailX - 6},${bubbleH} ${tailX + 6},${bubbleH} ${tailX},${bubbleH + 9}`}
      />
      <text
        className="bubble-text"
        x={bubbleW / 2}
        y={bubbleH / 2 + 1}
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {display}
      </text>
    </g>
  )
}
