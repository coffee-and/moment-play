-- Foreign-key indexes protect parent deletes and updates from scanning the
-- referencing tables. Match composite foreign keys in constraint order.
create index friend_game_invites_friendship_id_idx
on public.friend_game_invites (friendship_id);

create index omok_room_moves_room_player_user_idx
on public.omok_room_moves (room_id, player_user_id);

create index omok_rooms_round_requested_by_idx
on public.omok_rooms (round_requested_by);

-- auth.uid() and auth.jwt() are stable for a statement. Wrapping them in an
-- uncorrelated subquery lets PostgreSQL evaluate each value once per query
-- instead of once per candidate row.
alter policy profiles_select_own
on public.profiles
using (user_id = (select auth.uid()));

alter policy profiles_insert_own
on public.profiles
with check (user_id = (select auth.uid()));

alter policy profiles_update_own
on public.profiles
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

alter policy omok_room_players_update_self
on public.omok_room_players
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

alter policy omok_room_players_delete_self
on public.omok_room_players
using (user_id = (select auth.uid()));

alter policy friendships_select_participant_permanent
on public.friendships
using (
  (
    requester_id = (select auth.uid())
    or addressee_id = (select auth.uid())
  )
  and coalesce(
    ((select auth.jwt()) ->> 'is_anonymous')::boolean,
    true
  ) = false
);

alter policy friend_game_invites_select_participant_permanent
on public.friend_game_invites
using (
  (
    sender_id = (select auth.uid())
    or receiver_id = (select auth.uid())
  )
  and coalesce(
    ((select auth.jwt()) ->> 'is_anonymous')::boolean,
    true
  ) = false
);

-- The primary key starts with room_id, so it cannot cover user-only lookups or
-- auth.users cascades. Keep this FK index even when short-term scan stats are 0.
comment on index public.omok_room_players_user_id_idx is
  'Covers the auth.users foreign key and user-only membership lookups; retain independently of short-term idx_scan statistics.';
