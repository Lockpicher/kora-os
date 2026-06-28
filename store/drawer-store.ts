import { create } from "zustand"

export type EntityType = "task" | "project" | "product" | "customer" | null
export type DrawerMode = "view" | "edit" | "create"

interface DrawerState {
  isOpen: boolean
  entityId: string | null
  entityType: EntityType
  activeTab: string
  
  // Advanced state
  mode: DrawerMode
  loading: boolean
  dirty: boolean
  saving: boolean
  fullscreen: boolean
  width: "default" | "wide" | "full"
  
  openDrawer: (params: { type: EntityType; id?: string; tab?: string; mode?: DrawerMode }) => void
  closeDrawer: () => void
  setActiveTab: (tab: string) => void
  setMode: (mode: DrawerMode) => void
  setDirty: (dirty: boolean) => void
  setSaving: (saving: boolean) => void
  toggleFullscreen: () => void
}

export const useDrawerStore = create<DrawerState>((set) => ({
  isOpen: false,
  entityId: null,
  entityType: null,
  activeTab: "Detalles",
  
  mode: "view",
  loading: false,
  dirty: false,
  saving: false,
  fullscreen: false,
  width: "default",
  
  openDrawer: ({ type, id = null, tab = "Detalles", mode = "view" }) => set({
    isOpen: true,
    entityType: type,
    entityId: id,
    activeTab: tab,
    mode: mode,
    loading: !!id // if id is provided, we assume we might need to load data
  }),
  
  closeDrawer: () => set({
    isOpen: false,
    dirty: false, // reset on close
  }),
  
  setActiveTab: (tab) => set({ activeTab: tab }),
  setMode: (mode) => set({ mode }),
  setDirty: (dirty) => set({ dirty }),
  setSaving: (saving) => set({ saving }),
  toggleFullscreen: () => set((state) => ({ fullscreen: !state.fullscreen }))
}))
