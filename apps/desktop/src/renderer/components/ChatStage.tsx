type Message = { id: string; role: string; content: string; createdAt?: string };

type Props = {
  messages: Message[];
  draft: string;
  busy: boolean;
  voiceMode: boolean;
  speaking: boolean;
  voiceState: string;
  muted: boolean;
  interimTranscript: string;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onSuggestion: (text: string) => void;
  onToggleVoice: () => void;
};

const SUGGESTIONS = [
  'Play a song by name',
  'Read my unread emails aloud',
  'Open Chrome and read this page to me',
  'Turn brightness up',
  'Lock my PC',
];

export function ChatStage({
  messages,
  draft,
  busy,
  voiceMode,
  speaking,
  voiceState,
  muted,
  interimTranscript,
  onDraftChange,
  onSend,
  onSuggestion,
  onToggleVoice,
}: Props) {
  const orbClass = `orb ${voiceMode ? 'live' : ''} ${speaking ? 'speaking' : ''}`.trim();

  return (
    <div className="chat">
      <div className="messages" aria-live="polite">
        {messages.length === 0 && (
          <div className="empty-hero">
            <div className={orbClass} aria-hidden="true">
              <span className="orb-ring" />
              <span className="orb-core" />
            </div>
            <h2>{voiceMode ? 'I am listening' : 'What should we do?'}</h2>
            <p>
              {voiceMode
                ? 'Speak naturally — I act on this PC and only claim what I can observe.'
                : 'Tap the mic and talk, or type. I open apps, play media, read pages and mail aloud, and run OS tasks.'}
            </p>
            <div className="chips">
              {SUGGESTIONS.map((s) => (
                <button key={s} className="chip" onClick={() => onSuggestion(s)} disabled={busy}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`msg ${m.role}`}>
            <div className="msg-meta">{m.role === 'assistant' ? 'Automata' : 'You'}</div>
            <div className="msg-body">{m.content}</div>
          </div>
        ))}
        {interimTranscript && (
          <div className="msg assistant">
            <div className="msg-body vb-transcript">{interimTranscript}</div>
          </div>
        )}
      </div>

      <div className="composer">
        <div className="composer-box">
          <textarea
            aria-label="Message"
            placeholder="Speak or type a command…"
            value={draft}
            rows={1}
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
          />
          <div className="composer-actions">
            <span className="composer-hint">
              {voiceState === 'processing'
                ? 'Thinking…'
                : speaking
                  ? 'Speaking — say “stop” to interrupt'
                  : voiceMode
                    ? 'Listening live'
                    : 'Enter to send · Shift+Enter for a new line'}
            </span>
            <div className="composer-right">
              <button
                className={`icon-btn mic ${voiceMode ? 'live' : ''}`}
                title={voiceMode ? 'Pause listening' : 'Start listening'}
                aria-label={voiceMode ? 'Pause listening' : 'Start listening'}
                onClick={onToggleVoice}
                disabled={busy || muted}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <rect x="9" y="3" width="6" height="11" rx="3" />
                  <path d="M5 11a7 7 0 0 0 14 0" />
                  <path d="M12 18v3" />
                </svg>
              </button>
              <button
                className="icon-btn send"
                title="Send"
                aria-label="Send"
                onClick={onSend}
                disabled={busy || !draft.trim()}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 19V5" />
                  <path d="M6 11l6-6 6 6" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
