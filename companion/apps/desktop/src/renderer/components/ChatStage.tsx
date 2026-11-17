type Message = { id: string; role: string; content: string; createdAt?: string };

type Props = {
  messages: Message[];
  draft: string;
  busy: boolean;
  listening: boolean;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onToggleMic: () => void;
  suggestions: string[];
};

function MicIcon() {
  return (
    <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3" />
    </svg>
  );
}

function ArrowUpIcon() {
  return (
    <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 19V5" />
      <path d="M6 11l6-6 6 6" />
    </svg>
  );
}

export function ChatStage({
  messages,
  draft,
  busy,
  listening,
  onDraftChange,
  onSend,
  onToggleMic,
  suggestions,
}: Props) {
  return (
    <div className="chat-main">
      <div className="message-list" aria-live="polite">
        {messages.length === 0 && (
          <div className="empty-stage">
            <h2 className="greeting-title">How can I help?</h2>
            <p className="greeting-sub">
              Ask me anything, or tell me to do something on your PC — open apps, play media, check
              your mail. I only claim what I can observe.
            </p>
            <div className="chips">
              {suggestions.map((s) => (
                <button key={s} className="chip" onClick={() => onDraftChange(s)}>{s}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`message ${m.role}`}>
            <div className="message-role">{m.role === 'assistant' ? 'Companion' : 'You'}</div>
            <div className="message-content">{m.content}</div>
          </div>
        ))}
      </div>

      <div className="composer-dock">
        <div className="composer">
          <textarea
            aria-label="Message"
            placeholder="Ask anything…"
            rows={1}
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
          />
          <div className="composer-actions">
            <button
              className={listening ? 'round-btn live' : 'round-btn'}
              onClick={onToggleMic}
              title={listening ? 'Stop listening' : 'Talk'}
              aria-label={listening ? 'Stop listening' : 'Talk'}
            >
              <MicIcon />
            </button>
            <button
              className="round-btn send"
              onClick={onSend}
              disabled={busy || !draft.trim()}
              title="Send"
              aria-label="Send"
            >
              <ArrowUpIcon />
            </button>
          </div>
        </div>
        <div className="composer-hint">Enter to send · Shift + Enter for a new line</div>
      </div>
    </div>
  );
}
