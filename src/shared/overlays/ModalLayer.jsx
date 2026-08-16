import { useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  focusModalLayer,
  isTopModalLayer,
  registerModalLayer,
} from "./modalLayerManager.js";

export function ModalLayer({
  children,
  closeOnBackdrop = false,
  closeOnEscape = false,
  focusKey,
  onClose,
  onMouseDown,
  ...props
}) {
  const layerRef = useRef(null);
  const returnFocusRef = useRef(document.activeElement);
  const optionsRef = useRef({ closeOnEscape, onClose });
  optionsRef.current = { closeOnEscape, onClose };

  useLayoutEffect(() => (
    registerModalLayer(layerRef.current, () => optionsRef.current, returnFocusRef.current)
  ), []);

  useLayoutEffect(() => {
    focusModalLayer(layerRef.current);
  }, [focusKey]);

  useLayoutEffect(() => {
    const layerElement = layerRef.current;
    const observer = new MutationObserver(() => {
      if (!layerElement.contains(document.activeElement)) {
        focusModalLayer(layerElement);
      }
    });
    observer.observe(layerElement, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return createPortal(
    <div
      ref={layerRef}
      tabIndex={-1}
      data-modal-layer=""
      onMouseDown={(event) => {
        onMouseDown?.(event);
        if (
          !event.defaultPrevented
          && closeOnBackdrop
          && event.target === event.currentTarget
          && isTopModalLayer(event.currentTarget)
        ) {
          optionsRef.current.onClose?.();
        }
      }}
      {...props}
    >
      {children}
    </div>,
    document.body,
  );
}
