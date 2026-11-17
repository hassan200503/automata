type Props = {
  voiceOn: boolean;
  /** Short status line shown under the label. */
  detail: string;
  /** Visual state of the status dot. */
  status: 'live' | 'speaking' | 'thinking' | 'waiting' | 'off' | 'error';
  disabled?: boolean;
  onToggle: (next: boolean) => void;
};

export function VoiceSwitch({ voiceOn, detail, status, disabled, onToggle }: Props) {
  return (
    <div className={`voice-switch ${voiceOn ? 'on' : 'off'}`}>
      <span className={`vs-icon ${status}`} aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="3" width="6" height="11" rx="3" />
          <path d="M5 11a7 7 0 0 0 14 0" />
          <path d="M12 18v3" />
        </svg>
      </span>
      <span className="vs-labels">
        <strong>Voice</strong>
        <span className="vs-status">
          <i className={`vs-dot ${status}`} />
          {detail}
        </span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={voiceOn}
        aria-label={voiceOn ? 'Turn voice off' : 'Turn voice on'}
        title={voiceOn ? 'Voice is on — click to turn it off' : 'Voice is off — click to turn it on'}
        className={`switch ${voiceOn ? 'on' : ''}`}
        onClick={() => onToggle(!voiceOn)}
        disabled={disabled}
      >
        <span className="switch-knob" />
      </button>
    </div>
  );
}
