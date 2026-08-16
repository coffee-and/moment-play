import { useGameAudio } from "./GameAudioContext.jsx";
import { SpeakerHighIcon, SpeakerSlashIcon } from "../components/icons/PhosphorIcons.jsx";
import { IconButton } from "../components/IconButton.jsx";

export function SoundToggle({ compact = false }) {
  const { enabled, isAudible, toggleAudio } = useGameAudio();
  const active = enabled && isAudible;
  const label = active ? "음악과 효과음 끄기" : "음악과 효과음 켜기";

  return (
    <IconButton
      label={label}
      aria-pressed={active}
      onClick={() => void toggleAudio()}
      variant={compact ? "stage" : "header"}
    >
      {active ? <SpeakerHighIcon /> : <SpeakerSlashIcon />}
    </IconButton>
  );
}
