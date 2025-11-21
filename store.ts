import { create } from "zustand";
import { Note, Connection, Cursor, Stroke } from "@/types";

interface Store {
  // Notes
  notes: Note[];
  setNotes: (notes: Note[]) => void;
  addNote: (note: Note) => void;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;

  // Connections
  connections: Connection[];
  setConnections: (connections: Connection[]) => void;
  addConnection: (connection: Connection) => void;
  updateConnection: (id: string, updates: Partial<Connection>) => void;
  deleteConnection: (id: string) => void;

  // Strokes
  strokes: Stroke[];
  setStrokes: (strokes: Stroke[]) => void;
  addStroke: (stroke: Stroke) => void;
  updateStroke: (id: string, updates: Partial<Stroke>) => void;
  deleteStroke: (id: string) => void;

  // Stroke settings
  strokeColor: string;
  setStrokeColor: (color: string) => void;
  strokeWidth: number;
  setStrokeWidth: (width: number) => void;

  // Selection (for creating connections and general selection)
  selectedNoteId: string | null;
  setSelectedNoteId: (id: string | null) => void;
  selectedItemId: string | null;
  setSelectedItemId: (id: string | null) => void;

  // Tool selection
  selectedTool: "select" | "note" | "text" | "arrow" | "pen" | "eraser";
  setSelectedTool: (
    tool: "select" | "note" | "text" | "arrow" | "pen" | "eraser"
  ) => void;

  // Theme
  theme: "light" | "dark";
  toggleTheme: () => void;

  // Cursors
  cursors: Cursor[];
  setCursors: (cursors: Cursor[]) => void;
  updateCursor: (cursor: Cursor) => void;

  // Viewport (pan & zoom)
  viewport: { x: number; y: number; zoom: number };
  setViewport: (viewport: { x: number; y: number; zoom: number }) => void;
  panViewport: (dx: number, dy: number) => void;
  zoomViewport: (delta: number, centerX?: number, centerY?: number) => void;
}

export const useStore = create<Store>((set) => ({
  notes: [],
  setNotes: (notes) => set({ notes }),
  addNote: (note) => set((s) => ({ notes: [...s.notes, note] })),
  updateNote: (id, updates) =>
    set((s) => ({
      notes: s.notes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
    })),
  deleteNote: (id) =>
    set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),

  connections: [],
  setConnections: (connections) => set({ connections }),
  addConnection: (connection) =>
    set((s) => ({ connections: [...s.connections, connection] })),
  updateConnection: (id, updates) =>
    set((s) => ({
      connections: s.connections.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    })),
  deleteConnection: (id) =>
    set((s) => ({ connections: s.connections.filter((c) => c.id !== id) })),

  strokes: [],
  setStrokes: (strokes) => set({ strokes }),
  addStroke: (stroke) => set((s) => ({ strokes: [...s.strokes, stroke] })),
  updateStroke: (id: string, updates: Partial<Stroke>) =>
    set((s) => ({
      strokes: s.strokes.map((stroke) =>
        stroke.id === id ? { ...stroke, ...updates } : stroke
      ),
    })),
  deleteStroke: (id) =>
    set((s) => ({ strokes: s.strokes.filter((stroke) => stroke.id !== id) })),

  strokeColor: "#3b82f6",
  setStrokeColor: (color) => set({ strokeColor: color }),
  strokeWidth: 2,
  setStrokeWidth: (width) => set({ strokeWidth: width }),

  selectedNoteId: null,
  setSelectedNoteId: (id) => set({ selectedNoteId: id }),

  selectedItemId: null,
  setSelectedItemId: (id) => set({ selectedItemId: id }),

  selectedTool: "select",
  setSelectedTool: (tool) => set({ selectedTool: tool }),

  theme: "light",
  toggleTheme: () =>
    set((s) => {
      const newTheme = s.theme === "light" ? "dark" : "light";
      // Update document attribute
      if (typeof document !== "undefined") {
        document.documentElement.setAttribute("data-theme", newTheme);
      }
      return { theme: newTheme };
    }),

  cursors: [],
  setCursors: (cursors) => set({ cursors }),
  updateCursor: (cursor) =>
    set((s) => ({
      cursors: s.cursors.some((c) => c.user_id === cursor.user_id)
        ? s.cursors.map((c) => (c.user_id === cursor.user_id ? cursor : c))
        : [...s.cursors, cursor],
    })),

  viewport: { x: 0, y: 0, zoom: 1 },
  setViewport: (viewport) => set({ viewport }),
  panViewport: (dx, dy) =>
    set((s) => ({
      viewport: { ...s.viewport, x: s.viewport.x + dx, y: s.viewport.y + dy },
    })),
  zoomViewport: (delta, centerX = 0, centerY = 0) =>
    set((s) => {
      const newZoom = Math.max(0.1, Math.min(3, s.viewport.zoom + delta));
      const zoomRatio = newZoom / s.viewport.zoom;

      // Zoom towards the center point
      const newX = centerX - (centerX - s.viewport.x) * zoomRatio;
      const newY = centerY - (centerY - s.viewport.y) * zoomRatio;

      return { viewport: { x: newX, y: newY, zoom: newZoom } };
    }),
}));
