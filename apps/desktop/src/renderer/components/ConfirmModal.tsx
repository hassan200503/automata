type Props = {
  toolName?: string;
  title?: string;
  eyebrow?: string;
  summary: string;
  confirmLabel?: string;
  rejectLabel?: string;
  confirmTone?: 'primary' | 'danger';
  busy?: boolean;
  onConfirm: () => void;
  onReject: () => void;
};

export function ConfirmModal({
  toolName,
  title,
  eyebrow,
  summary,
  confirmLabel,
  rejectLabel,
  confirmTone = 'primary',
  busy,
  onConfirm,
  onReject,
}: Props) {
  const heading = title ?? (toolName ? `Allow ${toolName}?` : 'Confirm');
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="modal-panel">
        <div className="eyebrow">{eyebrow ?? 'Confirmation required'}</div>
        <h3 id="confirm-title">{heading}</h3>
        <p className="muted">{summary}</p>
        <div className="actions">
          <button className={confirmTone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} disabled={busy}>
            {confirmLabel ?? 'Confirm'}
          </button>
          <button className="ghost" onClick={onReject} disabled={busy}>
            {rejectLabel ?? 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
}
