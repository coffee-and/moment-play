export const SOLITAIRE_PHASE = Object.freeze({
  IDLE: "idle",
  PLAYING: "playing",
  STALLED: "stalled",
  COMPLETED: "completed",
});

export const SOLITAIRE_DIALOG = Object.freeze({
  EXIT: "exit",
  NEW_GAME: "new-game",
});

export function createSolitaireState({ board, dealId, difficulty }) {
  return {
    assisted: false,
    board,
    dealId,
    dialog: null,
    difficulty,
    history: [],
    isNewRecord: false,
    moves: 0,
    phase: SOLITAIRE_PHASE.IDLE,
    selection: null,
  };
}

export function solitaireReducer(state, action) {
  switch (action.type) {
    case "START_GAME":
      return {
        ...createSolitaireState(action),
        phase: SOLITAIRE_PHASE.PLAYING,
      };
    case "COMMIT_BOARD":
      if (state.phase !== SOLITAIRE_PHASE.PLAYING) return state;
      return {
        ...state,
        board: action.board,
        history: [...state.history, { board: state.board, moves: state.moves }],
        moves: state.moves + 1,
        phase: action.isStalled ? SOLITAIRE_PHASE.STALLED : SOLITAIRE_PHASE.PLAYING,
        selection: null,
      };
    case "UNDO": {
      const previous = state.history.at(-1);
      if (!previous) return state;
      return {
        ...state,
        assisted: true,
        board: previous.board,
        dialog: null,
        history: state.history.slice(0, -1),
        moves: previous.moves,
        phase: SOLITAIRE_PHASE.PLAYING,
        selection: null,
      };
    }
    case "SELECT":
      return state.phase === SOLITAIRE_PHASE.PLAYING
        ? { ...state, selection: action.selection }
        : state;
    case "MARK_ASSISTED":
      return state.assisted ? state : { ...state, assisted: true };
    case "COMPLETE":
      return {
        ...state,
        board: action.board,
        dialog: null,
        isNewRecord: Boolean(action.isNewRecord),
        phase: SOLITAIRE_PHASE.COMPLETED,
        selection: null,
      };
    case "CHOOSE_DIFFICULTY":
      return {
        ...state,
        dialog: null,
        phase: SOLITAIRE_PHASE.IDLE,
        selection: null,
      };
    case "OPEN_DIALOG":
      return { ...state, dialog: action.dialog };
    case "CLOSE_DIALOG":
      return { ...state, dialog: null };
    default:
      return state;
  }
}
