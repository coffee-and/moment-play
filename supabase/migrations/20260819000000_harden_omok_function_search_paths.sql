-- Keep every legacy Omok SECURITY DEFINER function on the same trusted
-- name-resolution contract as the newer application RPCs. The functions use
-- schema-qualified auth helpers and public application objects, so adding
-- pg_catalog preserves behavior while preventing public objects from taking
-- precedence over built-in functions and operators.

alter function public.omok_accept_rematch(uuid)
  set search_path = pg_catalog, public;
alter function public.omok_cancel_rematch(uuid)
  set search_path = pg_catalog, public;
alter function public.omok_count_line(uuid, integer, integer, integer, text, integer, integer)
  set search_path = pg_catalog, public;
alter function public.omok_create_room(text, boolean, boolean, boolean, boolean)
  set search_path = pg_catalog, public;
alter function public.omok_is_room_member(uuid)
  set search_path = pg_catalog, public;
alter function public.omok_leave_room(uuid)
  set search_path = pg_catalog, public;
alter function public.omok_request_rematch(uuid)
  set search_path = pg_catalog, public;
alter function public.omok_room_players_touch_activity()
  set search_path = pg_catalog, public;
alter function public.omok_round_has_winner(uuid, integer, text)
  set search_path = pg_catalog, public;
alter function public.omok_round_is_finished(uuid, integer, text)
  set search_path = pg_catalog, public;
alter function public.omok_start_room(uuid)
  set search_path = pg_catalog, public;
alter function public.omok_submit_move(uuid, integer, integer, integer, integer, text)
  set search_path = pg_catalog, public;
alter function public.omok_update_player_guide_preferences(uuid, boolean, boolean)
  set search_path = pg_catalog, public;
alter function public.omok_update_room_settings(uuid, text, boolean, boolean)
  set search_path = pg_catalog, public;
