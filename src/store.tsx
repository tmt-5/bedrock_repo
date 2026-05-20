import React, { createContext, useContext, useEffect, useReducer } from 'react';
import type { Experiment, AtomicItem } from './data';

export interface AppState {
  experiments: Experiment[];
  items: AtomicItem[];
}

type Action =
  | { type: 'ADD_EXPERIMENT'; payload: Experiment }
  | { type: 'UPDATE_EXPERIMENT'; payload: Experiment }
  | { type: 'ADD_ITEM'; payload: AtomicItem }
  | { type: 'UPDATE_ITEM'; payload: AtomicItem }
  | { type: 'DELETE_ITEM'; payload: { id: string } }
  | { type: 'DELETE_EXPERIMENT'; payload: { id: string } };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'ADD_EXPERIMENT':
      return { ...state, experiments: [...state.experiments, action.payload] };
    case 'UPDATE_EXPERIMENT':
      return { ...state, experiments: state.experiments.map(e => e.id === action.payload.id ? action.payload : e) };
    case 'ADD_ITEM':
      return { ...state, items: [...state.items, action.payload] };
    case 'UPDATE_ITEM':
      return { ...state, items: state.items.map(i => i.id === action.payload.id ? action.payload : i) };
    case 'DELETE_ITEM':
      return { ...state, items: state.items.filter(i => i.id !== action.payload.id) };
    case 'DELETE_EXPERIMENT':
      return {
        experiments: state.experiments.filter(e => e.id !== action.payload.id),
        items: state.items.filter(i => i.experimentId !== action.payload.id),
      };
    default:
      return state;
  }
}

const STORAGE_KEY = 'bedrock_data';

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { experiments: [], items: [] };
    return JSON.parse(raw) as AppState;
  } catch {
    return { experiments: [], items: [] };
  }
}

interface StoreContext {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

const BedrockContext = createContext<StoreContext>({
  state: { experiments: [], items: [] },
  dispatch: () => {},
});

export function BedrockProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  return (
    <BedrockContext.Provider value={{ state, dispatch }}>
      {children}
    </BedrockContext.Provider>
  );
}

export function useStore() {
  return useContext(BedrockContext);
}
