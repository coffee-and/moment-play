import { useCallback, useLayoutEffect, useRef } from "react";

const LONG_PRESS_DELAY_MS = 480;
const LONG_PRESS_MOVEMENT_TOLERANCE_PX = 12;
const FOLLOW_UP_EVENT_SUPPRESSION_MS = 800;

function isSameCell(left, right) {
  return Object.is(left, right);
}

export function useMinesweeperCellPress({ isEnabled, onFlag, onReveal }) {
  const activeGestureRef = useRef(null);
  const suppressedCellRef = useRef(null);
  const suppressionTimerRef = useRef(null);
  const isEnabledRef = useRef(isEnabled);
  const onFlagRef = useRef(onFlag);
  const onRevealRef = useRef(onReveal);

  isEnabledRef.current = isEnabled;
  onFlagRef.current = onFlag;
  onRevealRef.current = onReveal;

  const clearSuppression = useCallback(() => {
    window.clearTimeout(suppressionTimerRef.current);
    suppressionTimerRef.current = null;
    suppressedCellRef.current = null;
  }, []);

  const suppressFollowUpEvents = useCallback((cellIndex, { expire = false } = {}) => {
    clearSuppression();
    suppressedCellRef.current = cellIndex;
    if (expire) {
      suppressionTimerRef.current = window.setTimeout(
        clearSuppression,
        FOLLOW_UP_EVENT_SUPPRESSION_MS,
      );
    }
  }, [clearSuppression]);

  const expireSuppression = useCallback(() => {
    if (suppressedCellRef.current == null) return;
    window.clearTimeout(suppressionTimerRef.current);
    suppressionTimerRef.current = window.setTimeout(
      clearSuppression,
      FOLLOW_UP_EVENT_SUPPRESSION_MS,
    );
  }, [clearSuppression]);

  const clearActiveGesture = useCallback(() => {
    window.clearTimeout(activeGestureRef.current?.timerId);
    activeGestureRef.current = null;
  }, []);

  const cancel = useCallback(() => {
    clearActiveGesture();
    clearSuppression();
  }, [clearActiveGesture, clearSuppression]);

  const beginTouch = useCallback((event, cellIndex) => {
    if (!isEnabledRef.current || event.pointerType !== "touch" || event.isPrimary === false) return;

    cancel();
    const gesture = {
      cellIndex,
      didLongPress: false,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      timerId: null,
    };
    gesture.timerId = window.setTimeout(() => {
      if (activeGestureRef.current !== gesture || !isEnabledRef.current) return;
      gesture.didLongPress = true;
      gesture.timerId = null;
      suppressFollowUpEvents(cellIndex);
      onFlagRef.current?.(cellIndex);
    }, LONG_PRESS_DELAY_MS);
    activeGestureRef.current = gesture;
  }, [cancel, suppressFollowUpEvents]);

  const finishTouch = useCallback((event) => {
    const gesture = activeGestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    clearActiveGesture();
    if (gesture.didLongPress) expireSuppression();
  }, [clearActiveGesture, expireSuppression]);

  const cancelTouch = useCallback((event) => {
    const gesture = activeGestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    clearActiveGesture();
    if (gesture.didLongPress) expireSuppression();
  }, [clearActiveGesture, expireSuppression]);

  const trackTouch = useCallback((event) => {
    const gesture = activeGestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId || gesture.didLongPress) return;
    const distance = Math.hypot(
      event.clientX - gesture.startX,
      event.clientY - gesture.startY,
    );
    if (distance > LONG_PRESS_MOVEMENT_TOLERANCE_PX) clearActiveGesture();
  }, [clearActiveGesture]);

  const handleClick = useCallback((event, cellIndex) => {
    if (isSameCell(suppressedCellRef.current, cellIndex)) {
      event.preventDefault();
      return;
    }
    if (isEnabledRef.current) onRevealRef.current?.(cellIndex);
  }, []);

  const handleContextMenu = useCallback((event, cellIndex) => {
    event.preventDefault();
    if (!isEnabledRef.current || isSameCell(suppressedCellRef.current, cellIndex)) return;

    const gesture = activeGestureRef.current;
    const isTouchContextMenu = event.nativeEvent?.pointerType === "touch";
    if (gesture && isSameCell(gesture.cellIndex, cellIndex)) {
      window.clearTimeout(gesture.timerId);
      gesture.didLongPress = true;
      gesture.timerId = null;
      suppressFollowUpEvents(cellIndex);
    } else if (isTouchContextMenu) {
      suppressFollowUpEvents(cellIndex, { expire: true });
    }
    onFlagRef.current?.(cellIndex);
  }, [suppressFollowUpEvents]);

  const getCellHandlers = useCallback((cellIndex) => ({
    onClick: (event) => handleClick(event, cellIndex),
    onContextMenu: (event) => handleContextMenu(event, cellIndex),
    onPointerCancel: cancelTouch,
    onPointerDown: (event) => beginTouch(event, cellIndex),
    onPointerLeave: cancelTouch,
    onPointerMove: trackTouch,
    onPointerUp: finishTouch,
  }), [beginTouch, cancelTouch, finishTouch, handleClick, handleContextMenu, trackTouch]);

  useLayoutEffect(() => {
    if (!isEnabled) cancel();
  }, [cancel, isEnabled]);

  useLayoutEffect(() => {
    window.addEventListener("blur", cancel);
    window.addEventListener("pagehide", cancel);
    return () => {
      window.removeEventListener("blur", cancel);
      window.removeEventListener("pagehide", cancel);
      cancel();
    };
  }, [cancel]);

  return { cancel, getCellHandlers };
}
