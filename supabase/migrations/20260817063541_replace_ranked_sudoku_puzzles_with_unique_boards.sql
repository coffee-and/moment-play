update private.ranked_sudoku_puzzles
set puzzle = case puzzle_id
      when 'ocean-01' then '000000010002195300198000567009761423026053701700020856000000084280019030300286070'
      when 'ocean-02' then '534000000000000008100040060850700003020800790713924806900030204200010005005206070'
      when 'ocean-03' then '500000902000100040000300000059701000000000700010004000001507080280400630305206070'
    end
where puzzle_id in ('ocean-01', 'ocean-02', 'ocean-03');

update private.ranked_sudoku_puzzles as variant
set puzzle = translate(source.puzzle, '123456789', '234567891')
from private.ranked_sudoku_puzzles as source
where variant.puzzle_id = source.puzzle_id || '-shift'
  and source.puzzle_id in ('ocean-01', 'ocean-02', 'ocean-03');

update private.ranked_sudoku_puzzles as variant
set puzzle = translate(source.puzzle, '123456789', '987654321')
from private.ranked_sudoku_puzzles as source
where variant.puzzle_id = source.puzzle_id || '-reverse'
  and source.puzzle_id in ('ocean-01', 'ocean-02', 'ocean-03');
