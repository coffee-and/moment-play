-- The original column grant is represented as a table UPDATE privilege by the
-- remote role catalog. Revoke the table privilege so profile changes can only
-- pass through update_my_profile_nickname(text).

revoke update on table public.profiles from authenticated;
