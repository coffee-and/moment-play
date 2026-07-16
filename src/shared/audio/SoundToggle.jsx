import { useGameAudio } from "./GameAudioContext.jsx";

function SpeakerIcon({ muted }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 9v6h4l5 4V5L8 9H4Z" fill="currentColor" />
      {muted ? (
        <path d="m16.5 9 4 6m0-6-4 6" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      ) : (
        <>
          <path d="M16 9.2c1.2 1.5 1.2 4.1 0 5.6" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
          <path d="M18.7 6.8c2.8 2.8 2.8 7.6 0 10.4" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
        </>
      )}
    </svg>
  );
}

export function SoundToggle({ compact = false }) {
  const { enabled, isAudible, toggleAudio } = useGameAudio();
  const active = enabled && isAudible;
  const label = active ? "음악과 효과음 끄기" : "음악과 효과음 켜기";

  return (
    <button
      className={`sound-toggle${compact ? " sound-toggle--compact" : ""}${active ? " is-active" : ""}`}
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      onClick={() => void toggleAudio()}
    >
      <SpeakerIcon muted={!active} />
    </button>
  );
}
