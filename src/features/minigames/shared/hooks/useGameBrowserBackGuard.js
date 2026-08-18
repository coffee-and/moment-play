import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

const GAME_EXIT_GUARD_KEY = '__momentPlayGameExitGuard';

function createGuardMarker() {
  return {
    hash: window.location.hash,
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  };
}

export function useGameBrowserBackGuard({ isExitConfirmationOpen, onNavigate, onRequestExit }) {
  const isEnabled = typeof onNavigate === 'function' && typeof onRequestExit === 'function';
  const onNavigateRef = useRef(onNavigate);
  const onRequestExitRef = useRef(onRequestExit);
  const isArmedRef = useRef(false);
  const isWaitingForDialogRef = useRef(false);
  const didOpenDialogRef = useRef(false);
  const armGuardRef = useRef(null);
  const ownsGuardRef = useRef(false);
  const pendingNavigationRef = useRef(null);

  onNavigateRef.current = onNavigate;
  onRequestExitRef.current = onRequestExit;

  const continueNavigationFromOriginalEntry = useCallback((destination) => {
    const routerIndex = window.history.state?.idx;

    if (Number.isInteger(routerIndex) && routerIndex > 0) {
      pendingNavigationRef.current = { destination, stage: 'previous-entry' };
      window.history.back();
      return;
    }

    ownsGuardRef.current = false;
    onNavigateRef.current?.(destination, { replace: true });
    onNavigateRef.current?.(destination);
  }, []);

  const navigateFromGame = useCallback((destination = '/') => {
    if (pendingNavigationRef.current) return;

    if (!ownsGuardRef.current) {
      onNavigateRef.current?.(destination);
      return;
    }

    if (!isArmedRef.current) {
      continueNavigationFromOriginalEntry(destination);
      return;
    }

    pendingNavigationRef.current = { destination, stage: 'guard-entry' };
    isArmedRef.current = false;
    window.history.back();
  }, [continueNavigationFromOriginalEntry]);

  useLayoutEffect(() => {
    const isHashGameRoute = /^#\/minigames\/[^/]+/.test(window.location.hash);

    if (!isEnabled || !isHashGameRoute) return undefined;

    function armGuard() {
      const currentMarker = window.history.state?.[GAME_EXIT_GUARD_KEY];
      if (currentMarker?.hash === window.location.hash) {
        ownsGuardRef.current = true;
        isArmedRef.current = true;
        return;
      }

      window.history.pushState(
        {
          ...window.history.state,
          [GAME_EXIT_GUARD_KEY]: createGuardMarker(),
        },
        '',
        window.location.href,
      );
      ownsGuardRef.current = true;
      isArmedRef.current = true;
    }

    function handlePopState() {
      if (pendingNavigationRef.current?.stage === 'guard-entry') {
        const { destination } = pendingNavigationRef.current;
        pendingNavigationRef.current = null;
        continueNavigationFromOriginalEntry(destination);
        return;
      }

      if (pendingNavigationRef.current?.stage === 'previous-entry') {
        const { destination } = pendingNavigationRef.current;
        pendingNavigationRef.current = null;
        ownsGuardRef.current = false;
        onNavigateRef.current?.(destination);
        return;
      }

      if (!isArmedRef.current) return;
      isArmedRef.current = false;
      isWaitingForDialogRef.current = true;
      didOpenDialogRef.current = false;
      onRequestExitRef.current?.();
    }

    armGuardRef.current = armGuard;
    armGuard();
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      armGuardRef.current = null;
    };
  }, [continueNavigationFromOriginalEntry, isEnabled]);

  useEffect(() => {
    if (!isWaitingForDialogRef.current) return;

    if (isExitConfirmationOpen) {
      didOpenDialogRef.current = true;
      return;
    }

    if (!didOpenDialogRef.current) return;
    armGuardRef.current?.();
    isWaitingForDialogRef.current = false;
    didOpenDialogRef.current = false;
  }, [isExitConfirmationOpen]);

  return navigateFromGame;
}
