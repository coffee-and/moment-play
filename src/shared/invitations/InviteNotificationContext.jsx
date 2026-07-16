import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { fetchPendingFriendOmokInviteCount } from "../../infrastructure/supabase/friendOmokInvitesGateway.js";
import { useAuth } from "../auth/AuthContext.jsx";

const DEFAULT_POLL_INTERVAL_MS = 30_000;

const EMPTY_CONTEXT = Object.freeze({
  isRefreshing: false,
  lastUpdatedAt: null,
  pendingCount: 0,
  refreshInviteNotifications: async () => 0,
  syncPendingCountFromInvites: () => 0,
});

const InviteNotificationContext = createContext(EMPTY_CONTEXT);

function isActiveIncomingInvite(invite, now = Date.now()) {
  if (!invite || invite.direction !== "incoming" || invite.status !== "pending") return false;
  if (!invite.expiresAt) return true;
  const expiresAt = new Date(invite.expiresAt).getTime();
  return Number.isNaN(expiresAt) || expiresAt > now;
}

export function countActiveIncomingInvites(invites, now = Date.now()) {
  return Array.isArray(invites)
    ? invites.filter((invite) => isActiveIncomingInvite(invite, now)).length
    : 0;
}

export function InviteNotificationProvider({ children, pollIntervalMs = DEFAULT_POLL_INTERVAL_MS }) {
  const { isConfigured, status: authStatus, user } = useAuth();
  const activeUserId = authStatus === "authenticated" ? user?.id ?? null : null;
  const activeUserIdRef = useRef(activeUserId);
  const requestRef = useRef(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [refreshStatus, setRefreshStatus] = useState("idle");
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);

  activeUserIdRef.current = activeUserId;

  const refreshInviteNotifications = useCallback(async () => {
    if (!isConfigured || !activeUserId) {
      setPendingCount(0);
      setRefreshStatus("idle");
      setLastUpdatedAt(null);
      return 0;
    }

    if (requestRef.current?.userId === activeUserId) {
      return requestRef.current.promise;
    }

    const requestUserId = activeUserId;
    setRefreshStatus((current) => (current === "idle" ? "loading" : "refreshing"));

    const request = fetchPendingFriendOmokInviteCount()
      .then((count) => {
        if (activeUserIdRef.current === requestUserId) {
          setPendingCount(count);
          setRefreshStatus("ready");
          setLastUpdatedAt(Date.now());
        }
        return count;
      })
      .catch((error) => {
        if (activeUserIdRef.current === requestUserId) setRefreshStatus("error");
        throw error;
      })
      .finally(() => {
        if (requestRef.current?.promise === request) requestRef.current = null;
      });

    requestRef.current = { promise: request, userId: requestUserId };
    return request;
  }, [activeUserId, isConfigured]);

  const syncPendingCountFromInvites = useCallback((invites) => {
    const count = countActiveIncomingInvites(invites);
    setPendingCount(count);
    setRefreshStatus("ready");
    setLastUpdatedAt(Date.now());
    return count;
  }, []);

  useEffect(() => {
    requestRef.current = null;
    if (!isConfigured || !activeUserId) {
      setPendingCount(0);
      setRefreshStatus("idle");
      setLastUpdatedAt(null);
      return undefined;
    }

    const refreshSilently = () => {
      void refreshInviteNotifications().catch(() => {});
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") refreshSilently();
    };

    refreshSilently();
    const intervalId = window.setInterval(refreshSilently, Math.max(5_000, pollIntervalMs));
    window.addEventListener("focus", refreshSilently);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshSilently);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [activeUserId, isConfigured, pollIntervalMs, refreshInviteNotifications]);

  const value = useMemo(() => ({
    isRefreshing: refreshStatus === "loading" || refreshStatus === "refreshing",
    lastUpdatedAt,
    pendingCount,
    refreshInviteNotifications,
    syncPendingCountFromInvites,
  }), [lastUpdatedAt, pendingCount, refreshInviteNotifications, refreshStatus, syncPendingCountFromInvites]);

  return <InviteNotificationContext.Provider value={value}>{children}</InviteNotificationContext.Provider>;
}

export function useInviteNotifications() {
  return useContext(InviteNotificationContext);
}
