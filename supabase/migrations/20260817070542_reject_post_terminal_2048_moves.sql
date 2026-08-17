create or replace function private.ranked_2048_is_terminal(
  p_board integer[]
)
returns boolean
language plpgsql
immutable
strict
set search_path = pg_catalog
as $$
declare
  row_index integer;
  column_index integer;
  cell_index integer;
begin
  if cardinality(p_board) <> 16 then
    raise exception 'Invalid 2048 board';
  end if;
  if 2048 <= any(p_board) then
    return true;
  end if;
  if 0 = any(p_board) then
    return false;
  end if;

  for row_index in 0..3 loop
    for column_index in 0..3 loop
      cell_index := row_index * 4 + column_index + 1;
      if (column_index < 3 and p_board[cell_index] = p_board[cell_index + 1])
        or (row_index < 3 and p_board[cell_index] = p_board[cell_index + 4]) then
        return false;
      end if;
    end loop;
  end loop;

  return true;
end;
$$;

create or replace function private.verify_ranked_2048(
  p_seed bigint,
  p_proof jsonb
)
returns bigint
language plpgsql
immutable
strict
set search_path = pg_catalog, private
as $$
declare
  board integer[] := array_fill(0, array[16]);
  next_board integer[];
  compacted integer[];
  merged integer[];
  state bigint := p_seed;
  moves jsonb := p_proof -> 'moves';
  direction text;
  line_index integer;
  cell_offset integer;
  source_index integer;
  target_index integer;
  value_index integer;
  current_value integer;
  next_value integer;
  score bigint := 0;
begin
  if jsonb_typeof(p_proof) <> 'object'
    or p_proof - array['moves'] <> '{}'::jsonb then
    raise exception '2048 proof contains unsupported fields';
  end if;
  if jsonb_typeof(moves) <> 'array' then
    raise exception '2048 proof must contain a moves array';
  end if;
  if jsonb_array_length(moves) > 20000 then
    raise exception '2048 proof is too large';
  end if;

  select tile.board, tile.next_state
  into board, state
  from private.ranked_2048_add_tile(board, state) as tile;
  select tile.board, tile.next_state
  into board, state
  from private.ranked_2048_add_tile(board, state) as tile;

  for direction in select jsonb_array_elements_text(moves) loop
    if private.ranked_2048_is_terminal(board) then
      raise exception '2048 proof continues after the first terminal state';
    end if;
    if direction not in ('up', 'right', 'down', 'left') then
      raise exception 'Invalid 2048 move';
    end if;

    next_board := array_fill(0, array[16]);

    for line_index in 0..3 loop
      compacted := array[]::integer[];

      for cell_offset in 0..3 loop
        source_index := case
          when direction = 'left' then line_index * 4 + cell_offset + 1
          when direction = 'right' then line_index * 4 + (3 - cell_offset) + 1
          when direction = 'up' then cell_offset * 4 + line_index + 1
          else (3 - cell_offset) * 4 + line_index + 1
        end;
        if board[source_index] <> 0 then
          compacted := array_append(compacted, board[source_index]);
        end if;
      end loop;

      merged := array[]::integer[];
      value_index := 1;
      while value_index <= cardinality(compacted) loop
        current_value := compacted[value_index];
        next_value := case
          when value_index < cardinality(compacted) then compacted[value_index + 1]
          else null
        end;

        if current_value = next_value then
          merged := array_append(merged, current_value * 2);
          score := score + current_value * 2;
          value_index := value_index + 2;
        else
          merged := array_append(merged, current_value);
          value_index := value_index + 1;
        end if;
      end loop;

      while cardinality(merged) < 4 loop
        merged := array_append(merged, 0);
      end loop;

      for cell_offset in 0..3 loop
        target_index := case
          when direction = 'left' then line_index * 4 + cell_offset + 1
          when direction = 'right' then line_index * 4 + (3 - cell_offset) + 1
          when direction = 'up' then cell_offset * 4 + line_index + 1
          else (3 - cell_offset) * 4 + line_index + 1
        end;
        next_board[target_index] := merged[cell_offset + 1];
      end loop;
    end loop;

    if next_board is distinct from board then
      board := next_board;
      select tile.board, tile.next_state
      into board, state
      from private.ranked_2048_add_tile(board, state) as tile;
    end if;
  end loop;

  if not private.ranked_2048_is_terminal(board) then
    raise exception '2048 attempt has not reached a rankable terminal state';
  end if;

  return score;
end;
$$;

revoke all on function private.ranked_2048_is_terminal(integer[])
from public, anon, authenticated;
revoke all on function private.verify_ranked_2048(bigint, jsonb)
from public, anon, authenticated;
