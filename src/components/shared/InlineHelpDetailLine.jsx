export default function InlineHelpDetailLine({ line }) {
  const text = String(line || '').trim()
  const separatorIndex = text.indexOf(':')

  if (separatorIndex > 0 && separatorIndex < 42) {
    const heading = text.slice(0, separatorIndex + 1)
    const detail = text.slice(separatorIndex + 1).trim()
    const isLongHeading = heading.length > 18
    const headingLengthClass = isLongHeading ? 'help-popover-item-title-long' : ''

    return (
      <li className="help-popover-item">
        <span className={`help-popover-item-title ${headingLengthClass}`.trim()}>{heading}</span>
        {detail ? <span className="help-popover-item-detail">{detail}</span> : null}
      </li>
    )
  }

  return (
    <li className="help-popover-item">
      <span className="help-popover-item-detail">{text}</span>
    </li>
  )
}
