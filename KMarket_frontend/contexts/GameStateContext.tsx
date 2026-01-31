import React, { createContext, useContext, useRef, useCallback, useState } from 'react';

interface PricePoint {
  price: number;
  time: number;
}

interface GridCell {
  id: number;
  row: number;
  col: number;
  x: number;
  w: number;
  h: number;
  priceHigh: number;
  priceLow: number;
  odds: number;
  status: 'idle' | 'active' | 'won' | 'lost';
  betTime: number | null;
}

interface GameState {
  priceData: PricePoint[];
  basePrice: number | null;
  animPrice: number | null;
  targetPrice: number | null;
  gridCells: GridCell[];
  lastTime: number;
  priceChange: number;
  isInitialized: boolean;
}

interface GameStateContextType {
  gameState: React.MutableRefObject<GameState>;
  saveState: (state: Partial<GameState>) => void;
  resetState: () => void;
  isGameActive: boolean;
  setIsGameActive: (active: boolean) => void;
}

const initialGameState: GameState = {
  priceData: [],
  basePrice: null,
  animPrice: null,
  targetPrice: null,
  gridCells: [],
  lastTime: Date.now(),
  priceChange: 0,
  isInitialized: false,
};

const GameStateContext = createContext<GameStateContextType | null>(null);

export function GameStateProvider({ children }: { children: React.ReactNode }) {
  const gameStateRef = useRef<GameState>({ ...initialGameState });
  const [isGameActive, setIsGameActive] = useState(false);

  const saveState = useCallback((state: Partial<GameState>) => {
    gameStateRef.current = { ...gameStateRef.current, ...state, isInitialized: true };
  }, []);

  const resetState = useCallback(() => {
    gameStateRef.current = { ...initialGameState };
  }, []);

  return (
    <GameStateContext.Provider value={{ 
      gameState: gameStateRef, 
      saveState, 
      resetState,
      isGameActive,
      setIsGameActive
    }}>
      {children}
    </GameStateContext.Provider>
  );
}

export function useGameState() {
  const context = useContext(GameStateContext);
  if (!context) {
    throw new Error('useGameState must be used within a GameStateProvider');
  }
  return context;
}
