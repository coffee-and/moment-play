import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  cancelFriendOmokInvite,
  createFriendOmokInvite,
  respondToFriendOmokInvite,
} from "../../infrastructure/supabase/friendOmokInvitesGateway.js";
import {
  cancelFriendRequest,
  fetchFriendOverview,
  fetchMyFriendProfile,
  findFriendByCode,
  removeFriend,
  respondToFriendRequest,
  sendFriendRequest,
} from "../../infrastructure/supabase/friendsGateway.js";
import { useInviteNotifications } from "../../shared/invitations/InviteNotificationContext.jsx";
import {
  FRIENDS_LOAD_STATUS,
  getFriendlyErrorMessage,
  groupFriendInvites,
  groupFriendOverview,
  normalizeFriendCode,
} from "./friendsPageModel.js";

export function useFriendsDashboard({ accountId, navigateToRoom }) {
  const {
    invites,
    isRefreshing: isRefreshingInvites,
    refreshInviteNotifications,
  } = useInviteNotifications();
  const copyResetTimerRef = useRef(null);
  const activeRef = useRef(true);
  const [profile, setProfile] = useState(null);
  const [overview, setOverview] = useState([]);
  const [loadStatus, setLoadStatus] = useState(FRIENDS_LOAD_STATUS.IDLE);
  const [pageError, setPageError] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviteTarget, setInviteTarget] = useState(null);
  const [busyInviteId, setBusyInviteId] = useState("");
  const [searchCode, setSearchCode] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [searchStatus, setSearchStatus] = useState("idle");
  const [searchMessage, setSearchMessage] = useState("");
  const [actionKey, setActionKey] = useState("");
  const [copyStatus, setCopyStatus] = useState("idle");

  const applyDashboard = useCallback(([nextProfile, nextOverview]) => {
    setProfile(nextProfile);
    setOverview(nextOverview);
  }, []);

  const fetchDashboard = useCallback(() => Promise.all([
    fetchMyFriendProfile(),
    fetchFriendOverview(),
  ]), []);

  const loadDashboard = useCallback(async () => {
    const dashboard = await fetchDashboard();
    applyDashboard(dashboard);
    return dashboard;
  }, [applyDashboard, fetchDashboard]);

  const refreshInvites = useCallback(async ({ surfaceError = false } = {}) => {
    if (surfaceError) setInviteError("");
    try {
      return await refreshInviteNotifications();
    } catch (error) {
      if (surfaceError) {
        setInviteError(getFriendlyErrorMessage(error, "오목 초대함을 새로고침하지 못했습니다."));
      }
      throw error;
    }
  }, [refreshInviteNotifications]);

  useEffect(() => {
    let active = true;
    setLoadStatus(FRIENDS_LOAD_STATUS.LOADING);
    setPageError("");

    fetchDashboard()
      .then((dashboard) => {
        if (!active) return;
        applyDashboard(dashboard);
        setLoadStatus(FRIENDS_LOAD_STATUS.READY);
      })
      .catch((error) => {
        if (!active) return;
        setPageError(getFriendlyErrorMessage(error, "친구 정보를 불러오지 못했습니다."));
        setLoadStatus(FRIENDS_LOAD_STATUS.ERROR);
      });

    return () => {
      active = false;
    };
  }, [accountId, applyDashboard, fetchDashboard]);

  useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
      window.clearTimeout(copyResetTimerRef.current);
    };
  }, []);

  const groups = useMemo(() => groupFriendOverview(overview), [overview]);
  const inviteGroups = useMemo(() => groupFriendInvites(invites), [invites]);

  const enterRoom = useCallback((roomId) => {
    if (!activeRef.current) return;
    if (!roomId) {
      setInviteError("초대 대기실 정보를 찾지 못했어요.");
      return;
    }
    navigateToRoom(roomId);
  }, [navigateToRoom]);

  const copyCode = useCallback(async () => {
    if (!profile?.friendCode) return;
    window.clearTimeout(copyResetTimerRef.current);
    try {
      await navigator.clipboard.writeText(profile.friendCode);
      setCopyStatus("copied");
      copyResetTimerRef.current = window.setTimeout(() => setCopyStatus("idle"), 1600);
    } catch {
      setCopyStatus("error");
    }
  }, [profile?.friendCode]);

  const updateSearchCode = useCallback((value) => {
    setSearchCode(normalizeFriendCode(value));
    setSearchResult(null);
    setSearchMessage("");
    setSearchStatus("idle");
  }, []);

  const search = useCallback(async () => {
    const normalizedCode = normalizeFriendCode(searchCode);
    setSearchCode(normalizedCode);
    setSearchResult(null);
    setSearchMessage("");

    if (normalizedCode.length !== 10) {
      setSearchStatus("error");
      setSearchMessage("친구 코드 10자리를 입력해 주세요.");
      return;
    }

    setSearchStatus("loading");
    try {
      const result = await findFriendByCode(normalizedCode);
      setSearchResult(result);
      setSearchStatus("ready");
    } catch (error) {
      setSearchStatus("error");
      setSearchMessage(getFriendlyErrorMessage(error, "친구를 검색하지 못했습니다."));
    }
  }, [searchCode]);

  const sendRequest = useCallback(async () => {
    if (!searchResult || searchResult.relationshipStatus !== "none") return;
    setActionKey(`search:${searchResult.friendCode}`);
    setSearchMessage("");

    try {
      await sendFriendRequest(searchResult.friendCode);
      setSearchResult((current) => current ? { ...current, relationshipStatus: "pending_outgoing" } : current);
      await loadDashboard();
    } catch (error) {
      setSearchMessage(getFriendlyErrorMessage(error));
    } finally {
      setActionKey("");
    }
  }, [loadDashboard, searchResult]);

  const runRelationshipAction = useCallback(async (item, action) => {
    setActionKey(item.friendshipId);
    setPageError("");

    try {
      if (action === "accept" || action === "reject") {
        await respondToFriendRequest(item.friendshipId, action);
      } else if (action === "cancel") {
        await cancelFriendRequest(item.friendshipId);
      } else if (action === "remove") {
        await removeFriend(item.friendshipId);
      }
      await loadDashboard();
    } catch (error) {
      setPageError(getFriendlyErrorMessage(error));
    } finally {
      setActionKey("");
    }
  }, [loadDashboard]);

  const openInviteDialog = useCallback((friend) => {
    setInviteError("");
    setInviteTarget(friend);
  }, []);

  const closeInviteDialog = useCallback(() => {
    if (busyInviteId) return;
    setInviteTarget(null);
    setInviteError("");
  }, [busyInviteId]);

  const createInvite = useCallback(async (settings) => {
    if (!inviteTarget) return;
    const busyKey = `create:${inviteTarget.friendshipId}`;
    setBusyInviteId(busyKey);
    setInviteError("");

    try {
      const createdInvite = await createFriendOmokInvite({
        friendshipId: inviteTarget.friendshipId,
        ...settings,
      });
      setInviteTarget(null);
      void refreshInviteNotifications().catch(() => {});
      enterRoom(createdInvite?.roomId);
    } catch (error) {
      setInviteError(getFriendlyErrorMessage(error, "오목 초대를 보내지 못했습니다."));
    } finally {
      setBusyInviteId("");
    }
  }, [enterRoom, inviteTarget, refreshInviteNotifications]);

  const runInviteAction = useCallback(async (invite, action) => {
    setBusyInviteId(invite.inviteId);
    setInviteError("");

    try {
      if (action === "accept") {
        const acceptedInvite = await respondToFriendOmokInvite(invite.inviteId, "accept");
        void refreshInviteNotifications().catch(() => {});
        enterRoom(acceptedInvite?.roomId);
        return;
      }
      if (action === "decline") {
        await respondToFriendOmokInvite(invite.inviteId, "decline");
      } else if (action === "cancel") {
        await cancelFriendOmokInvite(invite.inviteId);
      }
      await refreshInvites({ surfaceError: true });
    } catch (error) {
      setInviteError(getFriendlyErrorMessage(error, "오목 초대를 처리하지 못했습니다."));
    } finally {
      setBusyInviteId("");
    }
  }, [enterRoom, refreshInviteNotifications, refreshInvites]);

  return {
    actionKey,
    busyInviteId,
    closeInviteDialog,
    copyCode,
    copyStatus,
    createInvite,
    enterRoom,
    groups,
    inviteError,
    inviteGroups,
    inviteTarget,
    isRefreshingInvites,
    loadStatus,
    openInviteDialog,
    pageError,
    profile,
    refreshInvites,
    runInviteAction,
    runRelationshipAction,
    search,
    searchCode,
    searchMessage,
    searchResult,
    searchStatus,
    sendRequest,
    updateSearchCode,
  };
}
