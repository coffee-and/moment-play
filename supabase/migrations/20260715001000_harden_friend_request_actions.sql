create or replace function public.respond_friend_request(
  p_friendship_id uuid,
  p_action text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_user_id uuid;
  normalized_action text;
  locked_friendship_id uuid;
begin
  current_user_id := public.moment_play_require_permanent_user();
  normalized_action := lower(btrim(p_action));

  if normalized_action is null or normalized_action not in ('accept', 'reject') then
    raise exception 'Unsupported friend request action';
  end if;

  select friendship.id
  into locked_friendship_id
  from public.friendships as friendship
  where friendship.id = p_friendship_id
    and friendship.addressee_id = current_user_id
    and friendship.status = 'pending'
  for update;

  if locked_friendship_id is null then
    raise exception 'Pending friend request not found';
  end if;

  if normalized_action = 'accept' then
    update public.friendships
    set status = 'accepted', responded_at = now()
    where id = locked_friendship_id;
  else
    delete from public.friendships
    where id = locked_friendship_id;
  end if;

  return locked_friendship_id;
end;
$$;

revoke all on function public.respond_friend_request(uuid, text) from public, anon;
grant execute on function public.respond_friend_request(uuid, text) to authenticated;
