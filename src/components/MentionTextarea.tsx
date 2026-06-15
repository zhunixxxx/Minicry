import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  createMentionElement,
  domToMentionValue,
  getOffsetRange,
  getTextBeforeCursor,
  renderMentionValueToDom,
} from '../utils/mentionTokens'

export interface MentionCharacter {
  id: string
  name: string
}

interface MentionState {
  query: string
  start: number
  end: number
}

interface Props {
  value: string
  onChange: (value: string) => void
  characters: MentionCharacter[]
  onMentionClick?: (characterId: string) => void
  placeholder?: string
  rows?: number
  disabled?: boolean
  onSubmit?: () => void
}

function getMentionAtCursor(text: string, cursor: number): MentionState | null {
  const before = text.slice(0, cursor)

  const atMatch = before.match(/@([^\s@]*)$/)
  if (atMatch) {
    return {
      query: atMatch[1],
      start: cursor - atMatch[0].length,
      end: cursor,
    }
  }

  const tailMatch = before.match(/([^\s，。！？、；：「」『』（）\n@]{2,8})$/)
  if (tailMatch) {
    return {
      query: tailMatch[1],
      start: cursor - tailMatch[1].length,
      end: cursor,
    }
  }

  return null
}

function filterCharacters(
  characters: MentionCharacter[],
  query: string,
): MentionCharacter[] {
  const q = query.trim().toLowerCase()
  if (!q) return characters

  return characters.filter((c) => {
    const name = c.name.toLowerCase()
    const given = c.name.split('·')[0]?.toLowerCase() ?? ''
    return name.includes(q) || given.startsWith(q) || name.startsWith(q)
  })
}

interface DropdownPosition {
  left: number
  bottom: number
  width: number
}

export function MentionTextarea({
  value,
  onChange,
  characters,
  onMentionClick,
  placeholder,
  rows = 2,
  disabled = false,
  onSubmit,
}: Props) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [mention, setMention] = useState<MentionState | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [open, setOpen] = useState(false)
  const [dropdownPos, setDropdownPos] = useState<DropdownPosition | null>(null)
  const lastEmittedValue = useRef(value)
  const lastMentionQueryRef = useRef<string | null>(null)

  const suggestions = mention ? filterCharacters(characters, mention.query) : []

  const syncFromProp = useCallback(() => {
    const editor = editorRef.current
    if (!editor) return
    if (value === lastEmittedValue.current) return
    renderMentionValueToDom(editor, value)
    lastEmittedValue.current = value
  }, [value])

  useEffect(() => {
    syncFromProp()
  }, [syncFromProp])

  const emitChange = useCallback(() => {
    const editor = editorRef.current
    if (!editor) return
    const next = domToMentionValue(editor)
    lastEmittedValue.current = next
    onChange(next)
  }, [onChange])

  const updateDropdownPosition = useCallback(() => {
    const el = editorRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setDropdownPos({
      left: rect.left,
      bottom: window.innerHeight - rect.top + 4,
      width: Math.min(rect.width, 168),
    })
  }, [])

  const updateMention = useCallback(() => {
    const el = editorRef.current
    if (!el || disabled) {
      setOpen(false)
      return
    }

    const textBefore = getTextBeforeCursor(el)
    const ctx = getMentionAtCursor(textBefore, textBefore.length)
    if (!ctx) {
      setMention(null)
      setOpen(false)
      lastMentionQueryRef.current = null
      return
    }

    const matches = filterCharacters(characters, ctx.query)
    if (matches.length === 0) {
      setMention(null)
      setOpen(false)
      lastMentionQueryRef.current = null
      return
    }

    const queryChanged = lastMentionQueryRef.current !== ctx.query
    lastMentionQueryRef.current = ctx.query

    setMention(ctx)
    if (queryChanged) {
      setActiveIndex(0)
    } else {
      setActiveIndex((i) => Math.min(i, matches.length - 1))
    }
    setOpen(true)
    updateDropdownPosition()
  }, [characters, disabled, updateDropdownPosition])

  useEffect(() => {
    if (!open) return
    updateDropdownPosition()
    window.addEventListener('resize', updateDropdownPosition)
    window.addEventListener('scroll', updateDropdownPosition, true)
    return () => {
      window.removeEventListener('resize', updateDropdownPosition)
      window.removeEventListener('scroll', updateDropdownPosition, true)
    }
  }, [open, updateDropdownPosition])

  function insertMention(char: MentionCharacter) {
    const editor = editorRef.current
    if (!editor || !mention) return

    const offsetRange = getOffsetRange(editor, mention.start, mention.end)
    if (!offsetRange) return

    const range = document.createRange()
    range.setStart(offsetRange.startNode, offsetRange.startOffset)
    range.setEnd(offsetRange.endNode, offsetRange.endOffset)
    range.deleteContents()

    const token = createMentionElement(char.name, char.id)
    const space = document.createTextNode('\u00a0')
    const frag = document.createDocumentFragment()
    frag.appendChild(token)
    frag.appendChild(space)
    range.insertNode(frag)

    const sel = window.getSelection()
    if (sel) {
      sel.removeAllRanges()
      const after = document.createRange()
      after.setStartAfter(space)
      after.collapse(true)
      sel.addRange(after)
    }

    setOpen(false)
    setMention(null)
    emitChange()
    editor.focus()
  }

  function handleInput() {
    emitChange()
    updateMention()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (open && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((i) => (i + 1) % suggestions.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((i) => (i - 1 + suggestions.length) % suggestions.length)
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        insertMention(suggestions[activeIndex])
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setOpen(false)
        return
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSubmit?.()
    }
  }

  function handleKeyUp(e: React.KeyboardEvent<HTMLDivElement>) {
    if (['ArrowUp', 'ArrowDown', 'Escape', 'Enter', 'Tab'].includes(e.key)) return
    updateMention()
  }

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement
    const token = target.closest<HTMLElement>('.mention-token')
    if (token?.dataset.charId) {
      e.preventDefault()
      onMentionClick?.(token.dataset.charId)
      return
    }
    updateMention()
  }

  function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    if (!text) return
    document.execCommand('insertText', false, text)
    emitChange()
    updateMention()
  }

  return (
    <div className="mention-textarea-wrap">
      <div
        ref={editorRef}
        className="custom-input mention-editor"
        contentEditable={!disabled}
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder}
        data-rows={rows}
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onClick={handleClick}
        onPaste={handlePaste}
      />
      {open &&
        suggestions.length > 0 &&
        dropdownPos &&
        createPortal(
          <ul
            className="mention-dropdown"
            role="listbox"
            style={{
              position: 'fixed',
              left: dropdownPos.left,
              bottom: dropdownPos.bottom,
              width: dropdownPos.width,
            }}
          >
            {suggestions.map((char, index) => (
              <li key={char.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  className={`mention-option ${index === activeIndex ? 'active' : ''}`}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    insertMention(char)
                  }}
                >
                  <span className="mention-option-name">{char.name}</span>
                </button>
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </div>
  )
}
