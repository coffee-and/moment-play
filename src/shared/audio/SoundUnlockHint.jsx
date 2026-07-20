import { useGameAudio } from "./GameAudioContext.jsx";

export function SoundUnlockHint() {
  const { showUnlockHint, toggleAudio } = useGameAudio();

  if (!showUnlockHint) return null;

  return (
    <div className="sound-unlock-hint-region">
      <button className="sound-unlock-hint" type="button" onClick={() => void toggleAudio()}>
        스피커를 눌러 음악을 켤 수 있어요.
      </button>
    </div>
  );
}
