export default function KidPinCodeField({
  value,
  onChange,
  showCode,
  onToggleShow,
  placeholder = '4-digit code',
}) {
  return (
    <div className="credential-input-wrap">
      <input
        className="job-input"
        type={showCode ? 'text' : 'password'}
        inputMode="numeric"
        pattern="[0-9]{4}"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
      />
      <button
        type="button"
        className="credential-icon-button"
        onClick={onToggleShow}
        aria-label={showCode ? 'Hide PIN code' : 'Show PIN code'}
      >
        <span className="credential-icon" aria-hidden="true">{showCode ? '👁' : '🙈'}</span>
      </button>
    </div>
  )
}
