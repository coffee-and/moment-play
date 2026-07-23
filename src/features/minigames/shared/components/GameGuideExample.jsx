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

export function GameGuideExample({ type }) {
  const examples = {
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
