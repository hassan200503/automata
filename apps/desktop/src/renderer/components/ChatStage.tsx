type Message = { id: string; role: string; content: string; createdAt?: string };

type Props = {
  messages: Message[];
  draft: string;
  busy: boolean;
  voiceMode: boolean;
  muted: boolean;
  speaking: boolean;
  voiceState: string;
  interimTranscript: string;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onSuggestion: (text: string) => void;
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
  muted,
  speaking,
  voiceState,
  interimTranscript,
  onDraftChange,
  onSend,
  onSuggestion,
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
            <h2>{muted ? 'What should we do?' : voiceMode ? 'I am listening' : 'Voice is on'}</h2>
            <p>
              {muted
                ? 'Voice is off in the sidebar. Turn it on to talk, or type. I open apps, play media, read pages and mail aloud, and run OS tasks.'
                : voiceMode
                  ? 'Speak naturally — I act on this PC and only claim what I can observe.'
                  : 'Voice is on by default. I will start listening the moment the microphone is ready — or type a command to continue. I open apps, play media, read pages and mail aloud, and run OS tasks.'}
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
                  : muted
                    ? 'Voice off · Enter to send'
                    : voiceMode
                      ? 'Voice on · listening'
                      : 'Voice on · ready'}
            </span>
            <div className="composer-right">
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
