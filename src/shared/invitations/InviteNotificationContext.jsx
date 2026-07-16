import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { fetchFriendOmokInvites } from "../../infrastructure/supabase/friendOmokInvitesGateway.js";
import { useAuth } from "../auth/AuthContext.jsx";
import {
  getInviteResultKey,
  getInviteResultMessage,
  getRecentInviteResults,
  shouldNotifyInviteResult,
} from "./inviteStatus.js";
import "./invite-notifications.css";

const DEFAULT_POLL_INTERVAL_MS = 30_000;
const MAX_STORED_RESULT_KEYS = 80;
const SEEN_RESULT_STORAGE_PREFIX = "moment-play.invite-results-seen";

const EMPTY_CONTEXT = Object.freeze({
  isRefreshing: false,
  lastUpdatedAt: null,
  pendingCount: 0,
  recentResults: [],
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

function resultStorageKey(userId) {
  return `${SEEN_RESULT_STORAGE_PREFIX}.${userId}`;
}

function readSeenResultKeys(userId) {
  try {
    const raw = window.localStorage.getItem(resultStorageKey(userId));
    if (raw === null) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((value) => typeof value === "string") : [];
  } catch {
    return null;
  }
}

function writeSeenResultKeys(userId, keys) {
  try {
    window.localStorage.setItem(resultStorageKey(userId), JSON.stringify(keys.slice(0, MAX_STORED_RESULT_KEYS)));
  } catch {
    // Notification history is a progressive enhancement; storage failure must not block the app.
  }
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
  const seenResultKeysRef = useRef(new Set());
  const resultBaselineReadyRef = useRef(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [recentResults, setRecentResults] = useState([]);
  const [refreshStatus, setRefreshStatus] = useState("idle");
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [resultNotification, setResultNotification] = useState(null);

  activeUserIdRef.current = activeUserId;

  const applyInviteSnapshot = useCallback((invites) => {
    const count = countActiveIncomingInvites(invites);
    const recentInviteResults = getRecentInviteResults(invites, 4);
    setPendingCount(count);
    setRecentResults(recentInviteResults);
    setRefreshStatus("ready");
    setLastUpdatedAt(Date.now());

    if (!activeUserId) return count;

    const resultHistory = getRecentInviteResults(invites, MAX_STORED_RESULT_KEYS);
    const entries = resultHistory
      .map((invite) => ({ invite, key: getInviteResultKey(invite) }))
      .filter((entry) => entry.key);

    if (!resultBaselineReadyRef.current) {
      seenResultKeysRef.current = new Set(entries.map((entry) => entry.key));
      resultBaselineReadyRef.current = true;
      writeSeenResultKeys(activeUserId, entries.map((entry) => entry.key));
      return count;
    }

    const unseenEntries = entries.filter((entry) => !seenResultKeysRef.current.has(entry.key));
    entries.forEach((entry) => seenResultKeysRef.current.add(entry.key));
    writeSeenResultKeys(activeUserId, entries.map((entry) => entry.key));

    const nextResult = unseenEntries.find((entry) => shouldNotifyInviteResult(entry.invite));
    if (nextResult) {
      const invite = nextResult.invite;
      const canEnterRoom = invite.status === "accepted" && invite.direction === "outgoing" && invite.roomId;
      setResultNotification({
        key: nextResult.key,
        message: getInviteResultMessage(invite),
        actionLabel: canEnterRoom ? "대기실 입장" : "초대함 보기",
        to: canEnterRoom
          ? `/minigames/omok/room/${encodeURIComponent(invite.roomId)}`
          : "/friends#omok-invites",
      });
    }

    return count;
  }, [activeUserId]);

  const refreshInviteNotifications = useCallback(async () => {
    if (!isConfigured || !activeUserId) {
      setPendingCount(0);
      setRecentResults([]);
      setRefreshStatus("idle");
      setLastUpdatedAt(null);
      return 0;
    }

    if (requestRef.current?.userId === activeUserId) {
      return requestRef.current.promise;
    }

    const requestUserId = activeUserId;
    setRefreshStatus((current) => (current === "idle" ? "loading" : "refreshing"));

    const request = fetchFriendOmokInvites()
      .then((invites) => {
        if (activeUserIdRef.current !== requestUserId) return 0;
        return applyInviteSnapshot(invites);
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
  }, [activeUserId, applyInviteSnapshot, isConfigured]);

  const syncPendingCountFromInvites = useCallback((invites) => applyInviteSnapshot(invites), [applyInviteSnapshot]);

  useEffect(() => {
    requestRef.current = null;
    setResultNotification(null);

    if (!isConfigured || !activeUserId) {
      seenResultKeysRef.current = new Set();
      resultBaselineReadyRef.current = false;
      setPendingCount(0);
      setRecentResults([]);
      setRefreshStatus("idle");
      setLastUpdatedAt(null);
      return undefined;
    }

    const storedKeys = readSeenResultKeys(activeUserId);
    seenResultKeysRef.current = new Set(storedKeys ?? []);
    resultBaselineReadyRef.current = storedKeys !== null;

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

  useEffect(() => {
    if (!resultNotification) return undefined;
    const timeoutId = window.setTimeout(() => setResultNotification(null), 6_000);
    return () => window.clearTimeout(timeoutId);
  }, [resultNotification]);

  const value = useMemo(() => ({
    isRefreshing: refreshStatus === "loading" || refreshStatus === "refreshing",
    lastUpdatedAt,
    pendingCount,
    recentResults,
    refreshInviteNotifications,
    syncPendingCountFromInvites,
  }), [lastUpdatedAt, pendingCount, recentResults, refreshInviteNotifications, refreshStatus, syncPendingCountFromInvites]);

  return (
    <InviteNotificationContext.Provider value={value}>
      {children}
      {resultNotification ? (
        <aside className="invite-result-toast" role="status" aria-live="polite">
          <div className="invite-result-toast__copy">
            <strong>{resultNotification.message}</strong>
            <Link className="invite-result-toast__action" to={resultNotification.to} onClick={() => setResultNotification(null)}>
              {resultNotification.actionLabel}
            </Link>
          </div>
          <button className="invite-result-toast__close" type="button" aria-label="알림 닫기" onClick={() => setResultNotification(null)}>
            ×
          </button>
        </aside>
      ) : null}
    </InviteNotificationContext.Provider>
  );
}

export function useInviteNotifications() {
  return useContext(InviteNotificationContext);
}
