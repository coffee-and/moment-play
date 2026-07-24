import { useState } from "react";

export function usePuzzleHints(steps = []) {
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

  function resetHints() {
    setIsOpen(false);
    setHasUsedHint(false);
    setStepIndex(0);
  }

  return {
    acceptHint,
    closeHint: () => setIsOpen(false),
    currentStep: hasUsedHint ? steps[safeStepIndex] ?? null : null,
    hasUsedHint,
    isOpen,
    requestHint,
    resetHints,
    showNextHint,
    showPreviousHint,
    stepCount: steps.length,
    stepIndex: safeStepIndex,
  };
}
