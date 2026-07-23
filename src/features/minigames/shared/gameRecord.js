export const RECORD_DIRECTION = Object.freeze({
  HIGHER: "higher",
  LOWER: "lower",
});

function toFiniteNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function isNewGameRecord({ previous, next, direction = RECORD_DIRECTION.HIGHER }) {
  const nextValue = toFiniteNumber(next);
  if (nextValue === null) return false;

  const previousValue = toFiniteNumber(previous);
  if (previousValue === null) return true;

  return direction === RECORD_DIRECTION.LOWER
    ? nextValue < previousValue
    : nextValue > previousValue;
}
