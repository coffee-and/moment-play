function GuideGrid({ cells, columns, label }) {
  return (
    <div
      aria-label={label}
      className="game-guide-example__grid"
      role="img"
      style={{
        "--guide-grid-columns": columns,
        "--guide-grid-rows": Math.ceil(cells.length / columns),
      }}
    >
      {cells.map((cell, index) => (
        <span
          aria-hidden="true"
          className={`game-guide-example__cell is-${cell.state ?? "empty"}`}
          key={index}
        >
          {cell.label ?? ""}
        </span>
      ))}
    </div>
  );
}

const LITS_CELLS = [
  { state: "filled" }, {}, {}, {},
  { state: "filled" }, {}, {}, {},
  { state: "filled" }, { state: "filled" }, {}, {},
  {}, {}, {}, {},
];

const SHIKAKU_CELLS = [
  { state: "claimed" }, { state: "claimed", label: "6" }, { state: "claimed" },
  { state: "claimed" }, { state: "claimed" }, { state: "claimed" },
  {}, {}, {},
];

const MINESWEEPER_CELLS = [
  { state: "revealed", label: "1" }, { state: "flag", label: "⚑" }, { state: "revealed", label: "1" },
  { state: "revealed", label: "1" }, { state: "revealed", label: "1" }, { state: "revealed", label: "1" },
  { state: "revealed" }, { state: "revealed" }, { state: "revealed" },
];

const MOSAIC_CELLS = [
  { state: "filled" }, { state: "empty", label: "2" }, { state: "marked", label: "×" },
  { state: "filled" }, { state: "empty", label: "3" }, { state: "marked", label: "×" },
  { state: "filled" }, { state: "marked", label: "×" }, { state: "marked", label: "×" },
];

const BLOCK_BLAST_CELLS = [
  { state: "block" }, { state: "block" }, { state: "block" }, { state: "preview" }, { state: "preview" },
  {}, {}, {}, {}, {},
];

const GAME_2048_CELLS = [
  { state: "tile", label: "2" },
  { state: "tile", label: "2" },
  { state: "hint", label: "→" },
  { state: "tile-strong", label: "4" },
];

const MEMORY_CELLS = [
  { state: "sequence-one", label: "1" },
  { state: "sequence-two", label: "2" },
  { state: "sequence-three", label: "3" },
  { state: "sequence-four", label: "4" },
];

const SUDOKU_CELLS = [
  { state: "number", label: "5" }, { state: "number", label: "3" }, { state: "number", label: "4" },
  { state: "number", label: "6" }, { state: "number-focus", label: "7" }, { state: "number", label: "2" },
  { state: "number", label: "1" }, { state: "number", label: "9" }, { state: "number", label: "8" },
];

const OMOK_CELLS = [
  {}, {}, {}, {}, {}, {}, {},
  {}, { state: "white-stone", label: "●" }, {}, {}, {}, {}, {},
  {}, {}, { state: "black-stone", label: "●" }, {}, {}, {}, {},
  {}, {}, { state: "white-stone", label: "●" }, { state: "black-stone", label: "●" }, {}, {}, {},
  {}, {}, {}, {}, { state: "black-stone", label: "●" }, {}, {},
  {}, {}, {}, {}, {}, { state: "black-stone", label: "●" }, {},
  {}, {}, {}, {}, {}, {}, { state: "black-stone", label: "●" },
];

const GLOW_SEQUENCE_CELLS = [
  { state: "glow-one", label: "1" }, {}, {},
  {}, {}, { state: "glow-two", label: "2" },
  {}, { state: "glow-three", label: "3" }, {},
];

function SetExample() {
  const cards = [
    { color: "red", count: 1 },
    { color: "green", count: 2 },
    { color: "purple", count: 3 },
  ];

  return (
    <div className="game-guide-example__set" role="img" aria-label="색과 개수는 모두 다르고 모양과 채움은 모두 같은 SET 카드 세 장">
      {cards.map((card) => (
        <span aria-hidden="true" className={`game-guide-example__set-card is-${card.color}`} key={card.color}>
          {Array.from({ length: card.count }, (_, index) => <i key={index}>●</i>)}
        </span>
      ))}
    </div>
  );
}

function FlappyExample() {
  return (
    <div className="game-guide-example__flight" role="img" aria-label="별이 위아래 기둥 사이의 빈 공간을 통과하는 성공 예시">
      <span className="game-guide-example__pillar is-top" aria-hidden="true" />
      <span className="game-guide-example__flight-star" aria-hidden="true">★</span>
      <span className="game-guide-example__flight-path" aria-hidden="true">→</span>
      <span className="game-guide-example__pillar is-bottom" aria-hidden="true" />
    </div>
  );
}

function TimingTapExample() {
  return (
    <div className="game-guide-example__timing" role="img" aria-label="움직이는 표시가 목표 구간 중앙에 멈춘 성공 예시">
      <span className="game-guide-example__timing-target" aria-hidden="true" />
      <span className="game-guide-example__timing-marker" aria-hidden="true" />
    </div>
  );
}

function SolitaireExample() {
  return (
    <div className="game-guide-example__solitaire" role="img" aria-label="검정 8 아래에 빨강 7을 놓고 완성 칸에는 스페이드 A를 놓는 예시">
      <span className="game-guide-example__playing-card is-black" aria-hidden="true"><b>8</b><i>♣</i></span>
      <span className="game-guide-example__playing-card is-red is-lower" aria-hidden="true"><b>7</b><i>♥</i></span>
      <span className="game-guide-example__solitaire-arrow" aria-hidden="true">→</span>
      <span className="game-guide-example__playing-card is-black is-foundation" aria-hidden="true"><b>A</b><i>♠</i></span>
    </div>
  );
}

export function GameGuideExample({ type }) {
  const examples = {
    "2048": {
      caption: "플레이 예시 · 같은 숫자 2 두 개를 한쪽으로 밀면 4로 합쳐져요.",
      visual: <GuideGrid cells={GAME_2048_CELLS} columns={4} label="숫자 2 두 개가 숫자 4로 합쳐지는 예시" />,
    },
    memory: {
      caption: "플레이 예시 · 빛난 아이콘을 1번부터 4번까지 같은 순서로 눌러요.",
      visual: <GuideGrid cells={MEMORY_CELLS} columns={4} label="네 아이콘을 순서대로 기억하는 예시" />,
    },
    sudoku: {
      caption: "성공 예시 · 한 3×3 영역에는 1부터 9까지 숫자가 한 번씩만 들어가요.",
      visual: <GuideGrid cells={SUDOKU_CELLS} columns={3} label="1부터 9까지 중복 없이 채운 스도쿠 영역 예시" />,
    },
    omok: {
      caption: "성공 예시 · 흑돌 다섯 개가 대각선으로 이어졌어요.",
      visual: <GuideGrid cells={OMOK_CELLS} columns={7} label="흑돌 다섯 개가 대각선으로 연결된 오목 승리 예시" />,
    },
    flappy: {
      caption: "플레이 예시 · 탭 높이를 조절해 위아래 기둥 사이를 통과해요.",
      visual: <FlappyExample />,
    },
    "timing-tap": {
      caption: "성공 예시 · 움직이는 표시를 밝은 목표 구간 중앙에서 멈춰요.",
      visual: <TimingTapExample />,
    },
    "glow-sequence": {
      caption: "플레이 예시 · 빛난 위치를 1 → 2 → 3 순서로 다시 눌러요.",
      visual: <GuideGrid cells={GLOW_SEQUENCE_CELLS} columns={3} label="세 위치가 차례로 빛난 순서 기억 예시" />,
    },
    solitaire: {
      caption: "플레이 예시 · 검정 8 아래에는 빨강 7, 완성 칸에는 같은 문양의 A부터 놓아요.",
      visual: <SolitaireExample />,
    },
    lits: {
      caption: "성공 예시 · 한 영역의 네 칸이 L 모양으로 이어져요.",
      visual: <GuideGrid cells={LITS_CELLS} columns={4} label="네 칸이 L 모양으로 연결된 성공 예시" />,
    },
    shikaku: {
      caption: "성공 예시 · 숫자 6 하나를 포함한 3×2 사각형의 넓이는 6이에요.",
      visual: <GuideGrid cells={SHIKAKU_CELLS} columns={3} label="숫자 6을 포함한 3 곱하기 2 사각형 성공 예시" />,
    },
    minesweeper: {
      caption: "성공 예시 · 깃발 칸을 피하고 안전한 칸을 모두 열었어요. 깃발 표시는 필수가 아니에요.",
      visual: <GuideGrid cells={MINESWEEPER_CELLS} columns={3} label="지뢰 한 칸을 깃발로 표시하고 나머지 안전한 칸을 모두 연 성공 예시" />,
    },
    set: {
      caption: "성공 예시 · 색과 개수는 모두 다르고, 모양과 채움은 모두 같아요.",
      visual: <SetExample />,
    },
    mosaic: {
      caption: "성공 예시 · 가운데 숫자 3의 주변에는 칠한 칸이 정확히 세 개 있어요.",
      visual: <GuideGrid cells={MOSAIC_CELLS} columns={3} label="숫자 3 주변에 세 칸을 칠한 모자이크 성공 예시" />,
    },
    "block-blast": {
      caption: "성공 예시 · 표시된 두 칸에 블록을 놓으면 가로 한 줄이 완성되어 사라져요.",
      visual: <GuideGrid cells={BLOCK_BLAST_CELLS} columns={5} label="두 칸 블록으로 가로 한 줄을 완성하는 배치 예시" />,
    },
  };
  const example = examples[type];
  if (!example) return null;

  return (
    <figure className="game-guide-example">
      {example.visual}
      <figcaption>{example.caption}</figcaption>
    </figure>
  );
}
