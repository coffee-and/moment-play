import { useRef } from "react";
import { getSolitaireDestination, getSolitaireSource } from "./SolitaireCard.jsx";

const DRAG_THRESHOLD_PX = 8;

export function useSolitaireDrag({ enabled, onMove, onSelect }) {
  const dragRef = useRef(null);
  const suppressClickRef = useRef(false);

  function consumeSuppressedClick() {
    if (!suppressClickRef.current) return false;
    suppressClickRef.current = false;
    return true;
  }

  function handlePointerDown(event) {
    if (!enabled) return;
    const source = getSolitaireSource(event.target);
    if (!source) return;
    dragRef.current = { source, startX: event.clientX, startY: event.clientY, moved: false };
  }

  function handlePointerMove(event) {
    const drag = dragRef.current;
    if (!drag) return;
    if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < DRAG_THRESHOLD_PX) return;
    drag.moved = true;
    onSelect(drag.source);
  }

  function handlePointerUp(event) {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag?.moved) return;

    const target = typeof document.elementFromPoint === "function"
      ? document.elementFromPoint(event.clientX, event.clientY)
      : event.target;
    const destination = getSolitaireDestination(target);
    if (destination) onMove(drag.source, destination);
    suppressClickRef.current = true;
  }

  return {
    consumeSuppressedClick,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}
