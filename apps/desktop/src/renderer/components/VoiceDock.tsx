type Props = {
  voiceMode: boolean;
  speaking: boolean;
  voiceState: string;
  voiceEngine: string;
  cloudConsentNeeded: boolean;
  muted: boolean;
  interimTranscript: string;
  calibrationQuestion: string;
  calibrationStep: string | null;
  voiceWarning: string;
  voiceError: string;
  speechPrivacyNeeded: boolean;
  onOpenMicSettings: () => void;
};

export function VoiceDock(props: Props) {
  const {
    voiceMode, speaking, voiceState, voiceEngine, cloudConsentNeeded, muted,
    interimTranscript, calibrationQuestion, calibrationStep,
    voiceWarning, voiceError, speechPrivacyNeeded, onOpenMicSettings,
  } = props;

  const activity = voiceState === 'processing' ? 'thinking' : speaking ? 'speaking' : voiceMode ? 'live' : '';
  const headline = speaking
    ? 'Speaking'
    : voiceState === 'processing'
      ? 'Thinking'
      : voiceState === 'starting'
        ? 'Opening the microphone'
        : voiceMode
          ? 'Listening'
          : cloudConsentNeeded
            ? 'Voice is on — waiting for your OK'
            : muted
              ? 'Voice off — replies as text'
              : 'Ready — voice is on';

  return (
    <div className={`voicebar ${activity}`}>
      <div className={`vb-orb ${voiceMode ? 'live' : ''} ${speaking ? 'speak' : ''}`} aria-hidden="true">
        <span className="ring" />
        <span className="core" />
      </div>
      <div className="vb-text">
        <strong>{headline}</strong>
        <span>
          {voiceMode
            ? `Mic active · ${voiceEngine === 'gemini' ? 'Gemini transcription' : `${voiceEngine} engine`} · audio is not stored`
            : cloudConsentNeeded
              ? 'Short clips are transcribed by Gemini. Nothing is saved as an audio file.'
              : muted
                ? 'Turn voice back on in the sidebar when you want to talk again.'
                : 'Speak naturally — I keep listening and acting even when this window is in the background.'}
        </span>
      </div>
      {voiceMode && (
        <div className="vb-line">
          <span className="pulse-dot" /> <span className="muted">Say “stop” while I talk to interrupt.</span>
        </div>
      )}
      {calibrationQuestion && (
        <div className="vb-line vb-transcript">Setup {calibrationStep ? `(${calibrationStep})` : ''}: {calibrationQuestion}</div>
      )}
      {interimTranscript && <div className="vb-line vb-transcript" aria-live="polite">{interimTranscript}</div>}
      {voiceWarning && <div className="vb-line vb-warn" role="status">{voiceWarning}</div>}
      {voiceError && <div className="vb-line vb-error" role="alert">{voiceError}</div>}
      {speechPrivacyNeeded && (
        <div className="vb-line">
          <button className="ghost" onClick={onOpenMicSettings}>Open Windows microphone privacy settings</button>
        </div>
      )}
    </div>
  );
}
