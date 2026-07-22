import { useEffect, useRef } from 'react';

const GAME_EXIT_GUARD_KEY = '__momentPlayGameExitGuard';

function createGuardMarker() {
  return {
    hash: window.location.hash,
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  };
}

export function useGameBrowserBackGuard({ isExitConfirmationOpen, onRequestExit }) {
  const isEnabled = typeof onRequestExit === 'function';
  const onRequestExitRef = useRef(onRequestExit);
  const isArmedRef = useRef(false);
  const isWaitingForDialogRef = useRef(false);
  const didOpenDialogRef = useRef(false);
  const armGuardRef = useRef(null);

  onRequestExitRef.current = onRequestExit;

  useEffect(() => {
    const isHashGameRoute = /^#\/minigames\/[^/]+/.test(window.location.hash);

    if (!isEnabled || !isHashGameRoute) return undefined;

    function armGuard() {
      const currentMarker = window.history.state?.[GAME_EXIT_GUARD_KEY];
      if (currentMarker?.hash === window.location.hash) {
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
      isArmedRef.current = true;
    }

    function handlePopState() {
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
  }, [isEnabled]);

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
}
