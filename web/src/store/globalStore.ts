import { create } from "zustand";

interface GlobalState {
  selectedAppId: string;
  setSelectedAppId: (appId: string) => void;
}

export const useGlobalStore = create<GlobalState>((set) => ({
  selectedAppId: "org.schabi.newpipe",
  setSelectedAppId: (appId) => set({ selectedAppId: appId }),
}));
