export default function InlineHelpButton({ label, lines = [], onOpen }) {
  if (!Array.isArray(lines) || lines.length === 0) {
    return null
  }

  return (
    <button
      type="button"
      className="inline-help-trigger"
      aria-haspopup="dialog"
      aria-label={`Help for ${label}`}
      title={`Help for ${label}`}
      onClick={() => onOpen?.({ label, lines })}
    >
      ?
    </button>
  )
}
