-- The invite overview is the single source for notification state. Keeping a
-- second count-only SECURITY DEFINER endpoint duplicates that contract and
-- expands the privileged API surface without an application consumer.
drop function if exists public.get_pending_friend_omok_invite_count();
