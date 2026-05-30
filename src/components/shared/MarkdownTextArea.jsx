import { useRef } from 'react'

function clampSelectionStart(value) {
  return Number.isFinite(value) ? value : 0
}

export default function MarkdownTextArea({
  value,
  onChange,
  placeholder,
  rows = 4,
  disabled = false,
  className = 'job-input form-textarea',
}) {
  const inputRef = useRef(null)

  function applyWrapper(prefix, suffix, fallbackText) {
    const input = inputRef.current
    if (!input || disabled) {
      return
    }

    const start = clampSelectionStart(input.selectionStart)
    const end = clampSelectionStart(input.selectionEnd)
    const raw = value || ''
    const selected = raw.slice(start, end)
    const content = selected || fallbackText
    const nextValue = `${raw.slice(0, start)}${prefix}${content}${suffix}${raw.slice(end)}`

    onChange(nextValue)

    window.requestAnimationFrame(() => {
      input.focus()
      const selectionStart = start + prefix.length
      const selectionEnd = selectionStart + content.length
      input.setSelectionRange(selectionStart, selectionEnd)
    })
  }

  function applyListPrefix() {
    const input = inputRef.current
    if (!input || disabled) {
      return
    }

    const start = clampSelectionStart(input.selectionStart)
    const raw = value || ''
    const lineStart = raw.lastIndexOf('\n', Math.max(0, start - 1)) + 1
    const nextValue = `${raw.slice(0, lineStart)}- ${raw.slice(lineStart)}`

    onChange(nextValue)

    window.requestAnimationFrame(() => {
      const caret = start + 2
      input.focus()
      input.setSelectionRange(caret, caret)
    })
  }

  return (
    <div className="markdown-textarea-wrap">
      <div className="markdown-toolbar" role="toolbar" aria-label="Text formatting">
        <button
          type="button"
          className="text-button markdown-tool-button"
          onClick={() => applyWrapper('**', '**', 'bold text')}
          aria-label="Bold"
          disabled={disabled}
        >
          <span className="markdown-tool-icon" aria-hidden="true">B</span>
          <span className="markdown-tool-label">Bold</span>
        </button>
        <button
          type="button"
          className="text-button markdown-tool-button"
          onClick={() => applyWrapper('*', '*', 'italic text')}
          aria-label="Italic"
          disabled={disabled}
        >
          <span className="markdown-tool-icon markdown-tool-icon-italic" aria-hidden="true">I</span>
          <span className="markdown-tool-label">Italic</span>
        </button>
        <button
          type="button"
          className="text-button markdown-tool-button"
          onClick={applyListPrefix}
          aria-label="Bullet list"
          disabled={disabled}
        >
          <span className="markdown-tool-icon" aria-hidden="true">•</span>
          <span className="markdown-tool-label">Bullet</span>
        </button>
      </div>

      <textarea
        ref={inputRef}
        className={className}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        disabled={disabled}
      />

      <span className="form-help">
        Supports line breaks, - bullet points, **bold**, and *italic*.
      </span>
    </div>
  )
}
