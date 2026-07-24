import { useState } from "react";

export function usePuzzleHints(steps = [], { onViewBoard } = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasUsedHint, setHasUsedHint] = useState(false);
  const [isStepActive, setIsStepActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const safeStepIndex = Math.min(stepIndex, Math.max(0, steps.length - 1));

  function requestHint() {
    if (hasUsedHint && !isStepActive) {
      setStepIndex(0);
      setIsStepActive(true);
    }
    setIsOpen(true);
  }

  function acceptHint() {
    setHasUsedHint(true);
    setIsStepActive(true);
    setStepIndex(0);
    setIsOpen(true);
  }

  function showNextHint() {
    setIsStepActive(true);
    setStepIndex((current) => Math.min(current + 1, Math.max(0, steps.length - 1)));
  }

  function showPreviousHint() {
    setIsStepActive(true);
    setStepIndex((current) => Math.max(0, current - 1));
  }

  function resetHints({ preserveUsage = false } = {}) {
    setIsOpen(false);
    setIsStepActive(false);
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
    currentStep: hasUsedHint && isStepActive ? steps[safeStepIndex] ?? null : null,
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
