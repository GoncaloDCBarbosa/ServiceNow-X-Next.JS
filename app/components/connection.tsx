"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

/**
 * The rail's connection indicator reflects what actually happened on the last
 * request rather than being decorative: every page reports the outcome of its
 * own fetch, so a red dot always means a real failure.
 */
export type ConnectionState = "unknown" | "live" | "down";

type ConnectionApi = {
  state: ConnectionState;
  checkedAt: Date | null;
  report: (state: Exclude<ConnectionState, "unknown">) => void;
};

const ConnectionContext = createContext<ConnectionApi>({
  state: "unknown",
  checkedAt: null,
  report: () => {},
});

export function ConnectionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConnectionState>("unknown");
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);

  const report = useCallback((next: Exclude<ConnectionState, "unknown">) => {
    setState(next);
    setCheckedAt(new Date());
  }, []);

  const value = useMemo(() => ({ state, checkedAt, report }), [state, checkedAt, report]);

  return <ConnectionContext.Provider value={value}>{children}</ConnectionContext.Provider>;
}

export function useConnection() {
  return useContext(ConnectionContext);
}
