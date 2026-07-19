// The Figma wordmark is built from a 40px circle with a 36px offset cutout.
// Keep that geometry here so every rendered logo uses the approved crescent.
export function MoonMark() {
  return (
    <path
      d="M20 0a20 20 0 1 0 20 20A20 20 0 0 0 20 0Zm12-6a18 18 0 1 1 0 36 18 18 0 1 1 0-36Z"
      fill="currentColor"
      fillRule="evenodd"
    />
  );
}
