-- Ranked attempts that never produced a result do not need permanent
-- retention. Replaced open attempts are removed transactionally by
-- begin_ranked_game; this daily cleanup covers attempts whose clients never
-- returned. Completed attempts remain because game_results references them.
-- Account deletion remains outside this retention job and belongs to the
-- account-management lifecycle.

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
end;
$$;

revoke all on function public.moment_play_cleanup_expired_data()
from public, anon, authenticated;
