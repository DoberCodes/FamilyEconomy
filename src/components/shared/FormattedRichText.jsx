function renderInline(text, keyPrefix) {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .flatMap((chunk, index) => {
      if (/^\*\*[^*]+\*\*$/.test(chunk)) {
        return (
          <strong key={`${keyPrefix}:b:${index}`}>
            {chunk.slice(2, -2)}
          </strong>
        )
      }

      return chunk
        .split(/(\*[^*]+\*)/g)
        .filter(Boolean)
        .map((inlineChunk, inlineIndex) => {
          if (/^\*[^*]+\*$/.test(inlineChunk)) {
            return (
              <em key={`${keyPrefix}:i:${index}:${inlineIndex}`}>
                {inlineChunk.slice(1, -1)}
              </em>
            )
          }

          return (
            <span key={`${keyPrefix}:t:${index}:${inlineIndex}`}>
              {inlineChunk}
            </span>
          )
        })
    })
}

function tokenizeLines(value) {
  const rawLines = String(value || '').split(/\r?\n/)
  const blocks = []
  let listItems = []

  function pushListIfNeeded() {
    if (listItems.length > 0) {
      blocks.push({ type: 'list', items: listItems })
      listItems = []
    }
  }

  rawLines.forEach((rawLine) => {
    const line = rawLine.trimEnd()
    const bulletMatch = line.match(/^\s*[-*]\s+(.+)$/)

    if (bulletMatch) {
      listItems.push(bulletMatch[1])
      return
    }

    pushListIfNeeded()

    if (line.trim().length === 0) {
      blocks.push({ type: 'spacer' })
      return
    }

    blocks.push({ type: 'paragraph', text: line })
  })

  pushListIfNeeded()

  return blocks
}

export default function FormattedRichText({ value, className = '' }) {
  if (!value || !String(value).trim()) {
    return null
  }

  const blocks = tokenizeLines(value)

  return (
    <div className={`formatted-rich-text ${className}`.trim()}>
      {blocks.map((block, blockIndex) => {
        if (block.type === 'spacer') {
          return <div key={`spacer:${blockIndex}`} className="formatted-rich-text-spacer" />
        }

        if (block.type === 'list') {
          return (
            <ul key={`list:${blockIndex}`} className="formatted-rich-text-list">
              {block.items.map((item, itemIndex) => (
                <li key={`item:${blockIndex}:${itemIndex}`}>
                  {renderInline(item, `l:${blockIndex}:${itemIndex}`)}
                </li>
              ))}
            </ul>
          )
        }

        return (
          <p key={`paragraph:${blockIndex}`} className="formatted-rich-text-paragraph">
            {renderInline(block.text, `p:${blockIndex}`)}
          </p>
        )
      })}
    </div>
  )
}
