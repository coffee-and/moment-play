import { omokClassName as cx } from "../omokStyles.js";

export function OmokSettingToggle({ checked, disabled = false, label, onChange }) {
  return (
    <button
      aria-pressed={checked}
      className={cx(`omok-game__setting-toggle${checked ? " is-on" : ""}`)}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      type="button"
    >
      <span>{label}</span>
      <strong>{checked ? "ON" : "OFF"}</strong>
    </button>
  );
}
