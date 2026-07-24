import { useState } from "react";

export function usePuzzleHints(steps = [], { onViewBoard } = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasUsedHint, setHasUsedHint] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const safeStepIndex = Math.min(stepIndex, Math.max(0, steps.length - 1));

  function requestHint() {
    setIsOpen(true);
  }

  function acceptHint() {
    setHasUsedHint(true);
    setStepIndex(0);
    setIsOpen(true);
  }

  function showNextHint() {
    setStepIndex((current) => Math.min(current + 1, Math.max(0, steps.length - 1)));
  }

  function showPreviousHint() {
    setStepIndex((current) => Math.max(0, current - 1));
  }

  function resetHints({ preserveUsage = false } = {}) {
    setIsOpen(false);
    if (!preserveUsage) setHasUsedHint(false);
    setStepIndex(0);
  }

  function viewOnBoard() {
    setIsOpen(false);
    if (typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(() => onViewBoard?.());
    } else {
      onViewBoard?.();
    }
  }

  return {
    acceptHint,
    closeHint: () => setIsOpen(false),
    currentStep: hasUsedHint ? steps[safeStepIndex] ?? null : null,
    hasUsedHint,
    isOpen,
    requestHint,
    resetHints,
    resetHintSteps: () => resetHints({ preserveUsage: true }),
    showNextHint,
    showPreviousHint,
    stepCount: steps.length,
    stepIndex: safeStepIndex,
    viewOnBoard,
  };
}
