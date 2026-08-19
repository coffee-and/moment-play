import { useEffect, useRef } from "react";
import { ONLINE_POLL_INTERVAL_MS, ONLINE_ROOM_LOAD_STATUS } from "./omokOnline.constants.js";

export function useOmokRoomLifecycle({
  activeRoomId,
  joinRoom,
  refreshRoom,
  requestedRoomId,
  roomIdRef,
  status,
}) {
  const autoJoinRoomIdRef = useRef(null);

  useEffect(() => {
    roomIdRef.current = activeRoomId ?? null;
  }, [activeRoomId, roomIdRef]);

  useEffect(() => {
    if (!requestedRoomId) {
      autoJoinRoomIdRef.current = null;
      return;
    }
    if (autoJoinRoomIdRef.current === requestedRoomId) return;
    autoJoinRoomIdRef.current = requestedRoomId;
    joinRoom(requestedRoomId);
  }, [joinRoom, requestedRoomId]);

  useEffect(() => {
    if (status !== ONLINE_ROOM_LOAD_STATUS.READY || !activeRoomId) return undefined;
    const intervalId = window.setInterval(refreshRoom, ONLINE_POLL_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [activeRoomId, refreshRoom, status]);
}
