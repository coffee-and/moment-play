import { useCallback, useEffect, useRef, useState } from "react";
import { ONLINE_COPY_RESET_MS } from "./omokOnline.constants.js";

export function useInviteClipboard({ inviteUrl, onError, onSuccess }) {
  const [copied, setCopied] = useState(false);
  const copiedTimeoutRef = useRef(null);

  const clearCopiedTimeout = useCallback(() => {
    if (!copiedTimeoutRef.current) return;
    window.clearTimeout(copiedTimeoutRef.current);
    copiedTimeoutRef.current = null;
  }, []);

  const copyInviteUrl = useCallback(async () => {
    if (!inviteUrl) return false;
    clearCopiedTimeout();

    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      onSuccess();
      copiedTimeoutRef.current = window.setTimeout(() => {
        copiedTimeoutRef.current = null;
        setCopied(false);
      }, ONLINE_COPY_RESET_MS);
      return true;
    } catch {
      setCopied(false);
      onError("복사하지 못했습니다. 초대 링크를 직접 복사해 주세요.");
      return false;
    }
  }, [clearCopiedTimeout, inviteUrl, onError, onSuccess]);

  useEffect(() => {
    clearCopiedTimeout();
    setCopied(false);
  }, [clearCopiedTimeout, inviteUrl]);

  useEffect(() => clearCopiedTimeout, [clearCopiedTimeout]);

  return { copied, copyInviteUrl };
}
