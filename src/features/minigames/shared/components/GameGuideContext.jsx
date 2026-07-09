import { createContext, useContext } from 'react';

const GameGuideContext = createContext(null);

export function GameGuideProvider({ children, guide }) {
  return <GameGuideContext.Provider value={guide}>{children}</GameGuideContext.Provider>;
}

export function useGameGuide() {
  return useContext(GameGuideContext);
}
