import { useGameAudio } from "./GameAudioContext.jsx";
import { SpeakerHighIcon, SpeakerSlashIcon } from "../components/icons/PhosphorIcons.jsx";

export function SoundToggle({ compact = false }) {
  const { enabled, isAudible, toggleAudio } = useGameAudio();
  const active = enabled && isAudible;
  const label = active ? "음악과 효과음 끄기" : "음악과 효과음 켜기";

  return (
    <button
      className={`header-icon-button${compact ? " game-stage__icon-button sound-toggle--compact" : ""}`}
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      onClick={() => void toggleAudio()}
    >
      {active ? <SpeakerHighIcon /> : <SpeakerSlashIcon />}
    </button>
  );
}
