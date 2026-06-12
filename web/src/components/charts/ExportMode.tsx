import { createContext, useContext, type PropsWithChildren } from "react";

const ExportModeContext = createContext(false);

export function ExportModeProvider({ children }: PropsWithChildren) {
  return <ExportModeContext.Provider value>{children}</ExportModeContext.Provider>;
}

export function useExportMode(): boolean {
  return useContext(ExportModeContext);
}
