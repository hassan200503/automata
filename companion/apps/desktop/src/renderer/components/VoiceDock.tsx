type Props = {
  voiceMode: boolean;
  speaking: boolean;
  voiceState: string;
  voiceEngine: string;
  cloudConsentNeeded: boolean;
  muted: boolean;
  hasProvider: boolean;
  hasConversation: boolean;
  interimTranscript: string;
  calibrationQuestion: string;
  calibrationStep: string | null;
  voiceWarning: string;
  voiceError: string;
  speechPrivacyNeeded: boolean;
  onEnableCloudSpeech: () => void;
  onToggleMute: () => void;
  onStopEverything: () => void;
  onOpenMicSettings: () => void;
};

export function VoiceDock(props: Props) {
  const {
    voiceMode, speaking, voiceState, voiceEngine, cloudConsentNeeded, muted,
    hasProvider, hasConversation, interimTranscript, calibrationQuestion, calibrationStep,
    voiceWarning, voiceError, speechPrivacyNeeded,
    onEnableCloudSpeech, onToggleMute, onStopEverything, onOpenMicSettings,
  } = props;

  const headline = voiceMode
    ? (speaking ? 'Companion is speaking' : voiceState === 'processing' ? 'Thinking' : voiceState === 'starting' ? 'Opening the microphone' : 'Listening')
    : cloudConsentNeeded ? 'Voice is off' : 'Voice ready';

  const detail = voiceMode
    ? `${voiceEngine === 'gemini' ? 'Gemini transcription' : `${voiceEngine} engine`} · audio is never stored`
    : cloudConsentNeeded
      ? 'Turn on cloud speech to talk out loud, or just type.'
      : 'Microphone is idle. Press the mic to start talking.';

  return (
    <div className={`voice-panel ${voiceMode ? 'listening' : ''} ${speaking ? 'speaking' : ''} ${voiceState === 'processing' ? 'thinking' : ''}`}>
      <div className="voice-hero">
        <div className={`voice-orb ${voiceMode ? 'live' : ''} ${speaking ? 'speak' : ''}`} aria-hidden="true">
          <span className="voice-orb-ring" />
          <span className="voice-orb-core" />
        </div>
        <div className="voice-status">
          <strong className="voice-headline">{headline}</strong>
          <div className="muted">{detail}</div>
        </div>
      </div>
      <div className="voice-actions">
        {cloudConsentNeeded && !voiceMode && (
          <button className="primary" onClick={onEnableCloudSpeech} disabled={!hasConversation || muted || !hasProvider}>
            Enable cloud speech
          </button>
        )}
        {voiceMode && (
          <span className="living-indicator" aria-live="polite"><span className="pulse" /> live</span>
        )}
        <button onClick={onToggleMute}>{muted ? 'Unmute' : 'Mute'}</button>
        <button className="danger" onClick={onStopEverything}>Stop</button>
      </div>
      {calibrationQuestion && <div className="voice-transcript">Setup {calibrationStep ? `(${calibrationStep})` : ''}: {calibrationQuestion}</div>}
      {interimTranscript && <div className="voice-transcript" aria-live="polite">{interimTranscript}</div>}
      {voiceWarning && <div className="voice-consent" role="status">{voiceWarning}</div>}
      {voiceError && <div className="voice-error" role="alert">{voiceError}</div>}
      {speechPrivacyNeeded && (
        <button className="ghost" onClick={onOpenMicSettings}>
          Open Windows microphone privacy settings
        </button>
      )}
    </div>
  );
}
