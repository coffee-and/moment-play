import { useRef, useState } from "react";
import {
  BoardFitIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from "../../../../shared/components/icons/PhosphorIcons.jsx";
import { GameIconButton } from "./GameIconButton.jsx";

const ZOOM_STEPS = [1, 1.25, 1.5, 1.75, 2];

export function BoardViewport({ children, label = "게임 보드" }) {
  const [zoomIndex, setZoomIndex] = useState(0);
  const viewportRef = useRef(null);
  const zoom = ZOOM_STEPS[zoomIndex];

  function fitBoard() {
    setZoomIndex(0);
    viewportRef.current?.scrollTo?.({ left: 0, top: 0 });
  }

  return (
    <div className="board-viewport">
      <div
        aria-label={`${label} 보기 영역`}
        className="board-viewport__scroll"
        ref={viewportRef}
        tabIndex={zoom > 1 ? 0 : undefined}
      >
        <div
          className="board-viewport__surface"
          style={{ "--board-zoom": zoom }}
        >
          {children}
        </div>
      </div>
      <div className="board-viewport__controls" role="group" aria-label="보드 크기 조절">
        <GameIconButton
          disabled={zoomIndex === 0}
          label="보드 축소"
          onClick={() => setZoomIndex((current) => Math.max(0, current - 1))}
        >
          <ZoomOutIcon />
        </GameIconButton>
        <output aria-live="polite" aria-label="현재 보드 크기">
          {Math.round(zoom * 100)}%
        </output>
        <GameIconButton
          disabled={zoomIndex === ZOOM_STEPS.length - 1}
          label="보드 확대"
          onClick={() => setZoomIndex((current) => Math.min(ZOOM_STEPS.length - 1, current + 1))}
        >
          <ZoomInIcon />
        </GameIconButton>
        <GameIconButton label="보드 화면에 맞추기" onClick={fitBoard}>
          <BoardFitIcon />
        </GameIconButton>
      </div>
    </div>
  );
}
