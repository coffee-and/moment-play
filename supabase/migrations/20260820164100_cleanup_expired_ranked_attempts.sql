-- Ranked attempts that never produced a result do not need permanent
-- retention. Replaced open attempts are removed transactionally by
-- begin_ranked_game; this daily cleanup covers attempts whose clients never
-- returned. Completed attempts remain because game_results references them.

create index ranked_game_attempts_expired_open_idx
on private.ranked_game_attempts(expires_at)
where status = 'open';

create or replace function public.moment_play_cleanup_expired_data()
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  delete from public.omok_rooms
  where status = 'waiting'
    and last_activity_at < now() - interval '24 hours';

  delete from public.omok_rooms
  where last_activity_at < now() - interval '7 days';

  delete from private.ranked_game_attempts as attempt
  where attempt.status = 'open'
    and attempt.expires_at < now();

  delete from auth.users as anon_user
  where anon_user.is_anonymous = true
    and not exists (
      select 1 from public.omok_rooms as room where room.host_user_id = anon_user.id
    )
    and not exists (
      select 1 from public.omok_room_players as player where player.user_id = anon_user.id
    )
    and coalesce(
      (select profile.last_active_at from public.profiles as profile where profile.user_id = anon_user.id),
      anon_user.last_sign_in_at,
      anon_user.created_at
    ) < now() - interval '30 days';
end;
$$;

revoke all on function public.moment_play_cleanup_expired_data()
from public, anon, authenticated;
