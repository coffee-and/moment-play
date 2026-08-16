-- PostgreSQL grants EXECUTE on newly created functions to PUBLIC unless the
-- function owner's default privileges say otherwise. Establish a deny-by-
-- default contract, then expose only the RPCs used by the application.
alter default privileges for role postgres in schema public
revoke execute on functions from public, anon, authenticated;

do $$
declare
  function_row record;
begin
  for function_row in
    select format(
      '%I.%I(%s)',
      namespace.nspname,
      proc.proname,
      pg_get_function_identity_arguments(proc.oid)
    ) as signature
    from pg_catalog.pg_proc as proc
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = proc.pronamespace
    where namespace.nspname = 'public'
      and proc.proowner = 'postgres'::regrole
      and proc.prokind = 'f'
  loop
    execute format(
      'revoke execute on function %s from public, anon, authenticated',
      function_row.signature
    );
  end loop;
end;
$$;

-- The leaderboard is intentionally readable before sign-in.
grant execute on function public.get_game_leaderboard(text, text, integer)
to anon, authenticated;

-- Ranked game lifecycle.
grant execute on function public.begin_ranked_game(text, text, jsonb)
to authenticated;
grant execute on function public.complete_ranked_game(uuid, uuid, jsonb)
to authenticated;

-- Account-owned profile and friend APIs.
grant execute on function public.update_my_profile_nickname(text)
to authenticated;
grant execute on function public.get_my_friend_profile()
to authenticated;
grant execute on function public.find_friend_by_code(text)
to authenticated;
grant execute on function public.send_friend_request(text)
to authenticated;
grant execute on function public.respond_friend_request(uuid, text)
to authenticated;
grant execute on function public.cancel_friend_request(uuid)
to authenticated;
grant execute on function public.remove_friend(uuid)
to authenticated;
grant execute on function public.get_friend_overview()
to authenticated;

-- Friend Omok invitation APIs.
grant execute on function public.create_friend_omok_invite(
  uuid,
  text,
  boolean,
  boolean,
  boolean,
  boolean
)
to authenticated;
grant execute on function public.respond_friend_omok_invite(uuid, text)
to authenticated;
grant execute on function public.cancel_friend_omok_invite(uuid)
to authenticated;
grant execute on function public.get_friend_omok_invites()
to authenticated;
grant execute on function public.get_pending_friend_omok_invite_count()
to authenticated;

-- Online Omok APIs.
grant execute on function public.omok_create_room(
  text,
  boolean,
  boolean,
  boolean,
  boolean
)
to authenticated;
grant execute on function public.omok_join_room(uuid)
to authenticated;
grant execute on function public.omok_leave_room(uuid)
to authenticated;
grant execute on function public.omok_update_player_guide_preferences(
  uuid,
  boolean,
  boolean
)
to authenticated;
grant execute on function public.omok_update_room_settings(
  uuid,
  text,
  boolean,
  boolean
)
to authenticated;
grant execute on function public.omok_start_room(uuid)
to authenticated;
grant execute on function public.omok_submit_move(
  uuid,
  integer,
  integer,
  integer,
  integer,
  text
)
to authenticated;
grant execute on function public.omok_request_rematch(uuid)
to authenticated;
grant execute on function public.omok_cancel_rematch(uuid)
to authenticated;
grant execute on function public.omok_accept_rematch(uuid)
to authenticated;

-- RLS policies on Omok tables call this helper as the requesting user. It is
-- not called by application code, but authenticated needs EXECUTE for policy
-- evaluation. Anon remains denied.
grant execute on function public.omok_is_room_member(uuid)
to authenticated;
