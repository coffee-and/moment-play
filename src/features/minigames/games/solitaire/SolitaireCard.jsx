import { getSolitaireRankLabel } from "./solitaire.logic.js";
import { bindCssModule } from "../../../../shared/styles/bindCssModule.js";
import styles from "./solitaire.module.css";

const cx = bindCssModule(styles);

export function getTableauCardOffset(column, index) {
  const previousCards = column.slice(0, index);
  return {
    "--face-down-before": previousCards.filter((card) => !card.faceUp).length,
    "--face-up-before": previousCards.filter((card) => card.faceUp).length,
  };
}

export function getSolitaireSource(element) {
  const source = element?.closest?.("[data-source-type]");
  if (!source) return null;
  const type = source.dataset.sourceType;
  if (type === "waste") return { type };
  if (type === "foundation") return { type, suit: source.dataset.sourceSuit };
  if (type === "tableau") {
    return { type, column: Number(source.dataset.sourceColumn), index: Number(source.dataset.sourceIndex) };
  }
  return null;
}

export function getSolitaireDestination(element) {
  const destination = element?.closest?.("[data-drop-type]");
  if (!destination) return null;
  const type = destination.dataset.dropType;
  if (type === "foundation") return { type, suit: destination.dataset.dropSuit };
  if (type === "tableau") return { type, column: Number(destination.dataset.dropColumn) };
  return null;
}

export function SolitaireCard({ card, className = "", onClick, onDoubleClick, source, style }) {
  const sourceProps = source ? {
    "data-source-type": source.type,
    "data-source-column": source.column,
    "data-source-index": source.index,
    "data-source-suit": source.suit,
  } : {};

  if (!card.faceUp) {
    return <span aria-label="뒤집힌 카드" className={cx(`solitaire-card is-back ${className}`)} style={style}><span /></span>;
  }

  return (
    <button aria-label={`${getSolitaireRankLabel(card.rank)} ${card.symbol}`} className={cx(`solitaire-card is-front is-${card.color} ${className}`)} onClick={onClick} onDoubleClick={onDoubleClick} style={style} type="button" {...sourceProps}>
      <span className={cx("solitaire-card__corner")}><strong>{getSolitaireRankLabel(card.rank)}</strong><span>{card.symbol}</span></span>
      <span className={cx("solitaire-card__suit")} aria-hidden="true">{card.symbol}</span>
      <span className={cx("solitaire-card__corner is-bottom")} aria-hidden="true"><strong>{getSolitaireRankLabel(card.rank)}</strong><span>{card.symbol}</span></span>
    </button>
  );
}
