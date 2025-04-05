import React, { createContext, useContext, useReducer, ReactNode, useMemo, useEffect, useRef, useCallback } from 'react';
import { useUserContext } from './UserContext'; // Need user/household context to know which cats to fetch
import { useLoading } from './LoadingContext';
import { toast } from 'sonner';
import { CatType } from "@/lib/types"; // Use the existing detailed CatType
import { getCatsByHouseholdId } from "@/lib/services/apiService"; // Reuse the service function

// Remove the simple Cat interface, use CatType from types.ts
// interface Cat {
//   id: string;
//   name: string;
//   age: number;
//   breed: string;
// }

interface CatsState {
  cats: CatType[];
  isLoading: boolean;
  error: string | null;
}

const initialState: CatsState = {
  cats: [],
  isLoading: false,
  error: null,
};

interface CatsAction {
  type: 'FETCH_START' | 'FETCH_SUCCESS' | 'FETCH_ERROR' | 'ADD_CAT' | 'REMOVE_CAT' | 'UPDATE_CAT'; // Removed SYNC_STATE
  payload?: CatType[] | CatType | string; // Adjusted payload types
}

function catsReducer(state: CatsState, action: CatsAction): CatsState {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, isLoading: true, error: null };
    case 'FETCH_SUCCESS':
      return { ...state, isLoading: false, cats: action.payload as CatType[], error: null };
    case 'FETCH_ERROR':
      return { ...state, isLoading: false, error: action.payload as string };
    case 'ADD_CAT':
      // Check for duplicates before adding?
      return { ...state, cats: [...state.cats, action.payload as CatType] };
    case 'REMOVE_CAT':
      return { ...state, cats: state.cats.filter(cat => cat.id !== (action.payload as CatType).id) };
    case 'UPDATE_CAT':
      return {
        ...state,
        cats: state.cats.map(cat =>
          cat.id === (action.payload as CatType).id ? { ...cat, ...(action.payload as CatType) } : cat
        ),
      };
    // case 'SYNC_STATE': // Replaced by fetch actions
    //   return action.payload as CatsState;
    default:
      return state;
  }
}

const CatsContext = createContext<{
  state: CatsState;
  dispatch: React.Dispatch<CatsAction>;
}>({ state: initialState, dispatch: () => null });

export const CatsProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(catsReducer, initialState);
  const { state: userState } = useUserContext();
  const { currentUser } = userState;
  const { addLoadingOperation, removeLoadingOperation } = useLoading();
  const abortControllerRef = useRef<AbortController | null>(null);
  const loadingIdRef = useRef<string | null>(null);
  const hasAttemptedLoadRef = useRef(false);

  const cleanupLoading = useCallback(() => {
    if (loadingIdRef.current) {
      try {
        removeLoadingOperation(loadingIdRef.current);
      } catch (error) {
        console.error('[CatsProvider] Error cleaning up loading:', error);
      } finally {
        loadingIdRef.current = null;
      }
    }
  }, [removeLoadingOperation]);

  useEffect(() => {
    hasAttemptedLoadRef.current = false;
  }, [currentUser?.householdId]);

  useEffect(() => {
    const loadingId = 'cats-data-load';
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    let isMounted = true;

    const loadCatsData = async () => {
      const householdId = currentUser?.householdId;
      if (!householdId || !isMounted || hasAttemptedLoadRef.current) {
        if (!householdId) {
          dispatch({ type: 'FETCH_SUCCESS', payload: [] });
        }
        return;
      }

      hasAttemptedLoadRef.current = true;

      try {
        loadingIdRef.current = loadingId;
        dispatch({ type: 'FETCH_START' });
        addLoadingOperation({ id: loadingId, priority: 3, description: 'Carregando dados dos gatos...' });

        console.log("[CatsProvider] Loading cats for household:", householdId);
        const catsData: CatType[] = await getCatsByHouseholdId(householdId);

        if (!isMounted) return;

        console.log("[CatsProvider] Cats loaded:", catsData.length);
        dispatch({ type: 'FETCH_SUCCESS', payload: catsData });
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.log('[CatsProvider] Request aborted');
          return;
        }

        if (!isMounted) return;

        console.error("[CatsProvider] Error loading cats data:", error);
        const errorMessage = error.message || 'Falha ao carregar dados dos gatos';
        dispatch({ type: 'FETCH_ERROR', payload: errorMessage });
        toast.error(errorMessage);
      } finally {
        if (isMounted) {
          cleanupLoading();
        }
      }
    };

    loadCatsData();

    return () => {
      isMounted = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      cleanupLoading();
    };
  }, [currentUser?.householdId, addLoadingOperation, cleanupLoading]);

  const contextValue = useMemo(() => ({ state, dispatch }), [state]);

  return (
    <CatsContext.Provider value={contextValue}>
      {children}
    </CatsContext.Provider>
  );
};

export const useCats = () => useContext(CatsContext);

// Selector hook remains useful
export const useCatsSelector = <T, >(selector: (state: CatsState) => T): T => {
  const { state } = useCats();
  return selector(state);
};