import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type {
  DeclaredAgent,
  DeclaredRegistryFile,
  Finding,
  ObservationSource,
  ObservationsFile,
  ObservedAgent,
  ReconciledAgent,
} from '../domain/types.ts';
import { reconcile } from '../domain/reconcile.ts';
import { evaluateRules, sortFindingsBySeverity } from '../domain/rules.ts';
import {
  DEMO_DECLARED,
  DEMO_NOW,
  DEMO_OBSERVED,
  DEMO_SOURCES,
} from '../data/demoData.ts';

interface AgentkartState {
  declared: DeclaredAgent[];
  observed: ObservedAgent[];
  sources: ObservationSource[];
  declaredGeneratedAt: string | null;
  observedGeneratedAt: string | null;
  reconciled: ReconciledAgent[];
  findings: Finding[];
  now: Date;
  loadDemo: () => void;
  setDeclared: (file: DeclaredRegistryFile) => void;
  setObserved: (file: ObservationsFile) => void;
  reset: () => void;
}

const AgentkartContext = createContext<AgentkartState | null>(null);

interface RawState {
  declared: DeclaredAgent[];
  observed: ObservedAgent[];
  sources: ObservationSource[];
  declaredGeneratedAt: string | null;
  observedGeneratedAt: string | null;
}

function initialState(): RawState {
  return {
    declared: DEMO_DECLARED,
    observed: DEMO_OBSERVED,
    sources: DEMO_SOURCES,
    declaredGeneratedAt: DEMO_NOW.toISOString(),
    observedGeneratedAt: DEMO_NOW.toISOString(),
  };
}

interface Props {
  children: ReactNode;
  now?: Date;
}

export function AgentkartProvider({ children, now }: Props) {
  const [state, setState] = useState<RawState>(() => initialState());
  const referenceNow = now ?? DEMO_NOW;

  const reconciled = useMemo(
    () => reconcile(state.declared, state.observed).agents,
    [state.declared, state.observed],
  );

  const findings = useMemo(
    () => sortFindingsBySeverity(evaluateRules(reconciled, referenceNow)),
    [reconciled, referenceNow],
  );

  const loadDemo = useCallback(() => {
    setState(initialState());
  }, []);

  const reset = useCallback(() => {
    setState(initialState());
  }, []);

  const setDeclared = useCallback((file: DeclaredRegistryFile) => {
    setState((prev) => ({
      ...prev,
      declared: file.agents,
      declaredGeneratedAt: file.generatedAt,
    }));
  }, []);

  const setObserved = useCallback((file: ObservationsFile) => {
    setState((prev) => ({
      ...prev,
      observed: file.observations,
      sources: file.sources,
      observedGeneratedAt: file.generatedAt,
    }));
  }, []);

  const value: AgentkartState = {
    declared: state.declared,
    observed: state.observed,
    sources: state.sources,
    declaredGeneratedAt: state.declaredGeneratedAt,
    observedGeneratedAt: state.observedGeneratedAt,
    reconciled,
    findings,
    now: referenceNow,
    loadDemo,
    setDeclared,
    setObserved,
    reset,
  };

  return <AgentkartContext.Provider value={value}>{children}</AgentkartContext.Provider>;
}

export function useAgentkart(): AgentkartState {
  const ctx = useContext(AgentkartContext);
  if (!ctx) {
    throw new Error('useAgentkart må brukes innenfor AgentkartProvider');
  }
  return ctx;
}
