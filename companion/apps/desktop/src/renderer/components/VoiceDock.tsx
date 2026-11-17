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
  onStartListening: () => void;
  onStopListening: () => void;
  onToggleMute: () => void;
  onStopEverything: () => void;
  onOpenMicSettings: () => void;
};

export function VoiceDock(props: Props) {
  const {
    voiceMode, speaking, voiceState, voiceEngine, cloudConsentNeeded, muted,
    hasProvider, hasConversation, interimTranscript, calibrationQuestion, calibrationStep,
    voiceWarning, voiceError, speechPrivacyNeeded,
    onEnableCloudSpeech, onStartListening, onStopListening, onToggleMute, onStopEverything, onOpenMicSettings,
  } = props;

  const activity = voiceState === 'processing' ? 'thinking' : speaking ? 'speaking' : voiceMode ? 'live' : '';
  const headline = voiceMode
    ? speaking ? 'Speaking' : voiceState === 'processing' ? 'Thinking' : voiceState === 'starting' ? 'Opening the microphone' : 'Listening'
    : cloudConsentNeeded ? 'Voice needs your OK' : 'Live voice is off';

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
              : 'Speech is the primary way to talk. Text always works too.'}
        </span>
      </div>
      <div className="vb-actions">
        {cloudConsentNeeded && !voiceMode && (
          <button className="primary" onClick={onEnableCloudSpeech} disabled={!hasConversation || muted || !hasProvider}>
            Enable cloud speech
          </button>
        )}
        {voiceMode
          ? <button onClick={onStopListening}>Pause</button>
          : !cloudConsentNeeded && <button onClick={onStartListening} disabled={!hasConversation || muted}>Listen</button>}
        <button onClick={onToggleMute}>{muted ? 'Unmute' : 'Mute'}</button>
        <button className="danger" onClick={onStopEverything}>Stop everything</button>
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
