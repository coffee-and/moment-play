import { OMOK_BOARD_SIZE, STONE } from "../omok.constants.js";
import { omokClassName as cx } from "../omokStyles.js";
import { getStoneLabel } from "../omok.presentation.js";
import { isSamePosition, pointToPercent, positionKey } from "../omok.utils.js";

const STAR_POINTS = [
  [3, 3],
  [11, 3],
  [7, 7],
  [3, 11],
  [11, 11],
];

function getIntersectionLabel(position, cell, isForbidden) {
  const base = `${position.row + 1}행 ${position.col + 1}열`;
  if (cell) return `${base}, ${getStoneLabel(cell)}돌`;
  if (isForbidden) return `${base}, 금수 자리`;
  return `${base}, 빈 교차점`;
}

function PlayerSummary({ active, name, status, stone }) {
  return (
    <div className={cx(`omok-game__player${active ? " is-active" : ""}`)}>
      <span className={cx(`omok-game__dot is-${stone}`)} aria-hidden="true" />
      <div>
        <div className={cx("omok-game__player-name")}>{name}</div>
        <div className={cx("omok-game__player-status")}>{status}</div>
      </div>
    </div>
  );
}

export function OmokBoard({
  board,
  draw,
  errorMessage,
  deriveWarning,
  forbiddenMessage,
  forbiddenPositionKeys,
  interactionDisabled,
  lastMove,
  onMove,
  players,
  rejectedPosition,
  statusMessage,
  syncWarning,
  turn,
  winner,
  winningLine,
}) {
  return (
    <>
      <div className={cx("omok-game__turns")} aria-label="대국자 정보">
        <PlayerSummary
          active={turn === STONE.BLACK && !winner && !draw}
          name={players[STONE.BLACK].name}
          status={players[STONE.BLACK].status}
          stone={STONE.BLACK}
        />
        <span className={cx("omok-game__vs")}>vs</span>
        <PlayerSummary
          active={turn === STONE.WHITE && !winner && !draw}
          name={players[STONE.WHITE].name}
          status={players[STONE.WHITE].status}
          stone={STONE.WHITE}
        />
      </div>
      <div className={cx("omok-game__board-wrap")}>
        <div className={cx("omok-game__board")} role="group" aria-label={`${OMOK_BOARD_SIZE}x${OMOK_BOARD_SIZE} 오목 보드`}>
          <span className={cx("omok-game__grid")} aria-hidden="true" />
          {STAR_POINTS.map(([column, row]) => (
            <span
              className={cx("omok-game__star")}
              style={{ left: pointToPercent(column), top: pointToPercent(row) }}
              key={`${column}-${row}`}
              aria-hidden="true"
            />
          ))}
          {board.map((row, rowIndex) =>
            row.map((cell, colIndex) => {
              const position = { row: rowIndex, col: colIndex };
              const key = positionKey(position);
              const isForbidden = forbiddenPositionKeys.has(key);
              const isRejected = isSamePosition(rejectedPosition, position);
              const isWinning = winningLine.some((item) => isSamePosition(item, position));
              const isLast = isSamePosition(lastMove, position);
              const isDisabled = Boolean(cell || interactionDisabled);

              return (
                <button
                  className={cx(`omok-game__intersection${isForbidden ? " is-forbidden" : ""}${isRejected ? " is-rejected" : ""}`)}
                  type="button"
                  style={{ left: pointToPercent(colIndex), top: pointToPercent(rowIndex) }}
                  key={key}
                  disabled={isDisabled}
                  aria-disabled={isForbidden || isDisabled ? "true" : undefined}
                  aria-label={getIntersectionLabel(position, cell, isForbidden)}
                  onClick={() => onMove(position)}
                >
                  {cell ? (
                    <span
                      className={cx(`omok-game__stone is-${cell}${isLast ? " is-last" : ""}${isWinning ? " is-winning" : ""}`)}
                      aria-hidden="true"
                    />
                  ) : null}
                </button>
              );
            }),
          )}
        </div>
      </div>
      <p className={cx("omok-game__hint")}>{statusMessage}</p>
      {syncWarning ? <p className={cx("omok-game__hint")} role="status">{syncWarning}</p> : null}
      {deriveWarning ? <p className={cx("omok-game__notice is-error")} role="alert">{deriveWarning}</p> : null}
      {errorMessage ? <p className={cx("omok-game__notice is-error")} role="alert">{errorMessage}</p> : null}
      {forbiddenMessage ? <p className={cx("omok-game__hint")} role="status">{forbiddenMessage}</p> : null}
    </>
  );
}
