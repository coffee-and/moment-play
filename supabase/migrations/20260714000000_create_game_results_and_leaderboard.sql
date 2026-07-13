create table public.game_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_key text not null check (game_key in ('2048', 'memory', 'sudoku', 'omok')),
  mode text null,
  score_value bigint null,
  duration_ms bigint null,
  match_result text null,
  client_submission_id uuid not null,
  created_at timestamptz not null default now(),
  constraint game_results_client_submission_unique unique (user_id, client_submission_id),
  constraint game_results_shape_check check (
    (game_key = '2048' and mode is null and score_value is not null and score_value between 0 and 9000000000000000 and duration_ms is null and match_result is null)
    or (game_key = 'memory' and mode is null and score_value is not null and score_value between 0 and 100000 and duration_ms is null and match_result is null)
    or (game_key = 'sudoku' and mode in ('easy', 'medium', 'advanced') and score_value is null and duration_ms is not null and duration_ms between 1000 and 86400000 and match_result is null)
    or (game_key = 'omok' and mode in ('standard', 'free') and score_value is null and duration_ms is null and match_result is not null and match_result in ('win', 'loss', 'draw'))
  )
);

create index game_results_score_leaderboard_idx
on public.game_results(game_key, mode, score_value desc, created_at asc)
where game_key in ('2048', 'memory');

create index game_results_duration_leaderboard_idx
on public.game_results(game_key, mode, duration_ms asc, created_at asc)
where game_key = 'sudoku';

alter table public.game_results enable row level security;

revoke all on table public.game_results from anon, authenticated;
grant insert (user_id, game_key, mode, score_value, duration_ms, match_result, client_submission_id)
on table public.game_results to authenticated;

create policy game_results_insert_permanent_own
on public.game_results
for insert
to authenticated
with check (
  user_id = auth.uid()
  and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, true) = false
  and game_key <> 'omok'
);

create or replace function public.get_game_leaderboard(
  p_game_key text,
  p_mode text default null,
  p_limit integer default 50
)
returns table (
  rank bigint,
  nickname text,
  game_key text,
  mode text,
  score_value bigint,
  duration_ms bigint,
  match_result text,
  created_at timestamptz,
  is_current_user boolean
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if p_game_key is null or p_game_key not in ('2048', 'memory', 'sudoku', 'omok') then
    raise exception 'Unsupported game key';
  end if;
  if p_game_key = 'sudoku' and p_mode not in ('easy', 'medium', 'advanced') then
    raise exception 'Sudoku difficulty is required';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception 'Leaderboard limit must be between 1 and 100';
  end if;

  return query
  with ordered_results as (
    select
      result.*,
      row_number() over (
        partition by result.user_id
        order by
          case when result.game_key in ('2048', 'memory') then result.score_value end desc nulls last,
          case when result.game_key = 'sudoku' then result.duration_ms end asc nulls last,
          result.created_at asc
      ) as user_result_order
    from public.game_results as result
    where result.game_key = p_game_key
      and (p_mode is null or result.mode = p_mode)
  ),
  ranked_results as (
    select
      result.*,
      dense_rank() over (
        order by
          case when result.game_key in ('2048', 'memory') then result.score_value end desc nulls last,
          case when result.game_key = 'sudoku' then result.duration_ms end asc nulls last
      ) as result_rank
    from ordered_results as result
    where result.user_result_order = 1
  )
  select
    result.result_rank,
    coalesce(profile.nickname, 'Player'),
    result.game_key,
    result.mode,
    result.score_value,
    result.duration_ms,
    result.match_result,
    result.created_at,
    result.user_id = auth.uid()
  from ranked_results as result
  left join public.profiles as profile on profile.user_id = result.user_id
  order by result.result_rank, result.created_at
  limit p_limit;
end;
$$;

revoke all on function public.get_game_leaderboard(text, text, integer) from public;
grant execute on function public.get_game_leaderboard(text, text, integer) to anon, authenticated;
