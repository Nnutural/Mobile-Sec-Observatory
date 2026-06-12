import type { RefObject } from "react";
import { create } from "zustand";

export interface ExportRegistryEntry {
  exportName: string;
  title: string;
  ref: RefObject<HTMLElement>;
}

interface ExportRegistryState {
  entries: ExportRegistryEntry[];
  register: (entry: ExportRegistryEntry) => void;
  unregister: (exportName: string, ref?: RefObject<HTMLElement>) => void;
  list: () => ExportRegistryEntry[];
}

export const useExportRegistry = create<ExportRegistryState>((set, get) => ({
  entries: [],
  register: (entry) =>
    set((state) => ({
      entries: [...state.entries.filter((item) => item.exportName !== entry.exportName), entry],
    })),
  unregister: (exportName, ref) =>
    set((state) => ({
      entries: state.entries.filter((item) => item.exportName !== exportName || (ref && item.ref !== ref)),
    })),
  list: () => get().entries,
}));
