-- Data retention cleanup for moment-play.
--
-- Deletes, in order:
--   1. Waiting Omok rooms inactive for more than 24 hours.
--   2. Any remaining Omok rooms (players/moves cascade) inactive for more than 7 days.
--   3. Anonymous auth users inactive for more than 30 days, who are no longer
--      referenced by any surviving room (as host or as a seated player).
--
-- Not executed by this migration. Only reachable via the daily pg_cron job
-- below - no client role can call it (see revokes at the bottom).

create or replace function public.moment_play_cleanup_expired_data()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 1. Waiting rooms inactive for more than 24 hours.
  delete from public.omok_rooms
  where status = 'waiting'
    and last_activity_at < now() - interval '24 hours';

  -- 2. Any remaining rooms inactive for more than 7 days.
  -- (public.omok_room_moves cascades via its existing FK to omok_rooms.)
  delete from public.omok_rooms
  where last_activity_at < now() - interval '7 days';

  -- 3. Anonymous auth users inactive for more than 30 days, not referenced by
  -- any surviving room. Deleting auth.users cascades to public.profiles.
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

revoke all on function public.moment_play_cleanup_expired_data() from public, anon, authenticated;

create extension if not exists pg_cron;

do $$
begin
  if not exists (select 1 from cron.job where jobname = 'moment-play-daily-cleanup') then
    perform cron.schedule(
      'moment-play-daily-cleanup',
      '0 18 * * *', -- 18:00 UTC = 03:00 Asia/Seoul
      $cron$select public.moment_play_cleanup_expired_data();$cron$
    );
  end if;
end
$$;
