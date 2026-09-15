const STATE_STYLE = {
  on: { background: '#dcfce7', color: '#166534' },
  off: { background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--divider)' },
  loading: { background: '#eff6ff', color: '#2563eb' },
  failed: { background: '#fef2f2', color: '#dc2626' },
};

export default function StatusBadge({ status }) {
  const key = String(status).toLowerCase();
  const style = STATE_STYLE[key] || STATE_STYLE.off;
  return (
    <span className={`status-badge ${key}`} style={style}>
      {key === 'loading' && <span className="badge-spinner" />}
      {String(status).toUpperCase()}
    </span>
  );
}
