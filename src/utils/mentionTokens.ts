/** 内部存储格式：@[显示名](角色id) */
const MENTION_TOKEN_RE = /@\[([^\]]+)\]\(([^)]+)\)/g

export type MentionSegment =
  | { type: 'text'; text: string }
  | { type: 'mention'; name: string; id: string }

export function serializeMentionToken(name: string, id: string): string {
  return `@[${name}](${id})`
}

/** 提交给 AI 时转为可读文本 */
export function mentionValueToPlainText(value: string): string {
  return value.replace(MENTION_TOKEN_RE, '@$1')
}

export function parseMentionValue(value: string): MentionSegment[] {
  const segments: MentionSegment[] = []
  let lastIndex = 0

  for (const match of value.matchAll(MENTION_TOKEN_RE)) {
    const index = match.index ?? 0
    if (index > lastIndex) {
      segments.push({ type: 'text', text: value.slice(lastIndex, index) })
    }
    segments.push({ type: 'mention', name: match[1], id: match[2] })
    lastIndex = index + match[0].length
  }

  if (lastIndex < value.length) {
    segments.push({ type: 'text', text: value.slice(lastIndex) })
  }

  return segments
}

export function getEditorPlainText(root: HTMLElement): string {
  let text = ''

  for (const node of root.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent ?? ''
      continue
    }
    if (node.nodeType !== Node.ELEMENT_NODE) continue

    const el = node as HTMLElement
    if (el.classList.contains('mention-token')) {
      text += el.textContent ?? ''
    } else if (el.tagName === 'BR') {
      text += '\n'
    } else {
      text += getEditorPlainText(el)
    }
  }

  return text
}

export function domToMentionValue(root: HTMLElement): string {
  let result = ''

  for (const node of root.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      result += node.textContent ?? ''
      continue
    }
    if (node.nodeType !== Node.ELEMENT_NODE) continue

    const el = node as HTMLElement
    if (el.classList.contains('mention-token')) {
      const id = el.dataset.charId
      const name = el.dataset.charName
      if (id && name) {
        result += serializeMentionToken(name, id)
      } else {
        result += el.textContent ?? ''
      }
    } else if (el.tagName === 'BR') {
      result += '\n'
    } else {
      result += domToMentionValue(el)
    }
  }

  return result
}

export function getTextBeforeCursor(root: HTMLElement): string {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return ''

  const range = sel.getRangeAt(0)
  if (!root.contains(range.startContainer)) return ''

  const preRange = document.createRange()
  preRange.selectNodeContents(root)
  preRange.setEnd(range.startContainer, range.startOffset)
  return preRange.toString()
}

interface TextOffsetRange {
  startNode: Node
  startOffset: number
  endNode: Node
  endOffset: number
}

function resolveTextOffset(
  root: HTMLElement,
  offset: number,
): { node: Node; nodeOffset: number } | null {
  let remaining = offset

  function walk(node: Node): { node: Node; nodeOffset: number } | null {
    if (node.nodeType === Node.TEXT_NODE) {
      const len = node.textContent?.length ?? 0
      if (remaining <= len) {
        return { node, nodeOffset: remaining }
      }
      remaining -= len
      return null
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return null
    const el = node as HTMLElement

    if (el.classList.contains('mention-token')) {
      const len = el.textContent?.length ?? 0
      if (remaining < len) {
        return { node: el, nodeOffset: 0 }
      }
      if (remaining === len) {
        const parent = el.parentNode
        if (!parent) return null
        const index = Array.from(parent.childNodes).indexOf(el as ChildNode)
        return { node: parent, nodeOffset: index + 1 }
      }
      remaining -= len
      return null
    }

    for (const child of el.childNodes) {
      const found = walk(child)
      if (found) return found
    }
    return null
  }

  for (const child of root.childNodes) {
    const found = walk(child)
    if (found) return found
  }
  return null
}

export function getOffsetRange(
  root: HTMLElement,
  start: number,
  end: number,
): TextOffsetRange | null {
  const startPos = resolveTextOffset(root, start)
  const endPos = resolveTextOffset(root, end)
  if (!startPos || !endPos) return null

  return {
    startNode: startPos.node,
    startOffset: startPos.nodeOffset,
    endNode: endPos.node,
    endOffset: endPos.nodeOffset,
  }
}

export function createMentionElement(name: string, id: string): HTMLSpanElement {
  const span = document.createElement('span')
  span.className = 'mention-token'
  span.dataset.charId = id
  span.dataset.charName = name
  span.contentEditable = 'false'
  span.setAttribute('role', 'button')
  span.setAttribute('tabindex', '-1')
  span.textContent = `@${name}`
  return span
}

export function renderMentionValueToDom(root: HTMLElement, value: string): void {
  root.innerHTML = ''

  for (const segment of parseMentionValue(value)) {
    if (segment.type === 'text') {
      const parts = segment.text.split('\n')
      parts.forEach((part, index) => {
        if (part) root.appendChild(document.createTextNode(part))
        if (index < parts.length - 1) root.appendChild(document.createElement('br'))
      })
      continue
    }
    root.appendChild(createMentionElement(segment.name, segment.id))
  }
}
