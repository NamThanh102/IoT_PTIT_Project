/**
 * ToggleSwitch.jsx — Nút bật/tắt thiết bị (LED)
 *
 * Trạng thái: 'ON' → hiện ON + nút gạt sang phải; 'OFF' → OFF;
 * 'loading' → spinner + disabled (đang chờ xác nhận từ backend).
 * Props: state, disabled, onClick.
 */
export default function ToggleSwitch({ state, disabled, onClick }) {
  const isOn = state === 'ON';
  const isLoading = state === 'loading';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isOn}
      className={`toggle${isOn ? ' on' : ''}${isLoading ? ' loading' : ''}`}
      disabled={disabled || isLoading}
      onClick={onClick}
    >
      <span className="toggle-track">
        {isLoading && <span className="toggle-spinner" />}
        {!isLoading && (
          <span className="toggle-label">{isOn ? 'ON' : 'OFF'}</span>
        )}
        <span className="toggle-knob" />
      </span>
    </button>
  );
}
