"use client";

import { supabase } from "@/lib/supabase/client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useStore } from "@/store";
import { Note } from "./Note";
import { ConnectionLine } from "./Connection";
import { Toolbar } from "./Toolbar";
import { ThemeToggle } from "./ThemeToggle";
import { ContextMenu } from "./ContextMenu";
import { InviteModal } from "./InviteModal";
import { Board } from "@/types";
import { ArrowLeft } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

export function Canvas({ boardId }: { boardId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const { notes, setNotes, addNote, updateNote, deleteNote } = useStore();
  const { connections, setConnections, addConnection, deleteConnection } =
    useStore();
  const { strokes, setStrokes, addStroke } = useStore();
  const updateStroke = useStore((s) => s.updateStroke);
  const deleteStroke = useStore((s) => s.deleteStroke);
  const selectedNoteId = useStore((s) => s.selectedNoteId);
  const selectedItemId = useStore((s) => s.selectedItemId);
  const setSelectedItemId = useStore((s) => s.setSelectedItemId);
  const selectedItemIds = useStore((s) => s.selectedItemIds);
  const setSelectedItemIds = useStore((s) => s.setSelectedItemIds);
  const clearSelection = useStore((s) => s.clearSelection);
  const cursors = useStore((s) => s.cursors);
  const setCursors = useStore((s) => s.setCursors);
  const updateCursor = useStore((s) => s.updateCursor);
  const removeCursor = useStore((s) => s.removeCursor);
  const selectedTool = useStore((s) => s.selectedTool);
  const setSelectedTool = useStore((s) => s.setSelectedTool);
  const viewport = useStore((s) => s.viewport);
  const panViewport = useStore((s) => s.panViewport);
  const zoomViewport = useStore((s) => s.zoomViewport);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [board, setBoard] = useState<Board | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [isDraggingText, setIsDraggingText] = useState(false);
  const [textDragStart, setTextDragStart] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [textDragEnd, setTextDragEnd] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    itemId: string;
  } | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<
    { x: number; y: number }[]
  >([]);
  const [isDraggingStroke, setIsDraggingStroke] = useState(false);
  const [draggedStrokeId, setDraggedStrokeId] = useState<string | null>(null);
  const [strokeDragStart, setStrokeDragStart] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const strokeColor = useStore((s) => s.strokeColor);
  const strokeWidth = useStore((s) => s.strokeWidth);
  const [user, setUser] = useState<any>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  // Marquee selection state
  const [isMarqueeSelecting, setIsMarqueeSelecting] = useState(false);
  const [marqueeStart, setMarqueeStart] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [marqueeEnd, setMarqueeEnd] = useState<{ x: number; y: number } | null>(
    null
  );

  // @dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required to start drag (prevents accidental drags)
      },
    })
  );

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, delta } = event;
    const noteId = active.id as string;
    const note = notes.find((n) => n.id === noteId);

    if (!note) return;

    // Calculate new position accounting for zoom
    const deltaX = delta.x / viewport.zoom;
    const deltaY = delta.y / viewport.zoom;
    const newX = note.x + deltaX;
    const newY = note.y + deltaY;

    // Check if this note is part of a multi-selection
    const state = useStore.getState();
    const isPartOfSelection =
      state.selectedItemIds.includes(noteId) || state.selectedItemId === noteId;
    const itemsToMove =
      isPartOfSelection && state.selectedItemIds.length > 0
        ? state.selectedItemIds
        : [noteId];

    // Move all selected items by the same delta
    const updatePromises: any[] = [];

    itemsToMove.forEach((id) => {
      const itemNote = notes.find((n) => n.id === id);
      if (itemNote) {
        const itemNewX = itemNote.x + deltaX;
        const itemNewY = itemNote.y + deltaY;

        // Update store
        updateNote(id, { x: itemNewX, y: itemNewY });

        // Update database
        updatePromises.push(
          supabase
            .from("board_objects")
            .update({ x: itemNewX, y: itemNewY })
            .eq("id", id)
        );
      }
    });

    // Wait for all updates to complete
    await Promise.all(updatePromises);
  };

  // Filter unique notes to avoid duplicate keys
  const uniqueNotes = notes.filter(
    (note, index, self) => index === self.findIndex((n) => n.id === note.id)
  );

  // Filter unique connections
  const uniqueConnections = connections.filter(
    (conn, index, self) => index === self.findIndex((c) => c.id === conn.id)
  );

  // Filter unique strokes
  const uniqueStrokes = strokes.filter(
    (stroke, index, self) => index === self.findIndex((s) => s.id === stroke.id)
  );

  // Check user authorization
  useEffect(() => {
    const checkAuthorization = async () => {
      // Get current user
      const { data: userData } = await supabase.auth.getUser();
      const currentUser = userData.user;
      setUser(currentUser);

      if (!currentUser) {
        setIsAuthorized(false);
        return;
      }

      // Check if user is a collaborator on this board
      const { data: collaborator } = await supabase
        .from("board_collaborators")
        .select("*")
        .eq("board_id", boardId)
        .eq("user_id", currentUser.id)
        .single();

      setIsAuthorized(!!collaborator);
    };

    checkAuthorization();
  }, [boardId]);

  // Clean up presence when boardId changes (navigating to different board/page)
  useEffect(() => {
    return () => {
      // Clean up presence when leaving this specific board
      if (user) {
        supabase
          .from("board_presence")
          .update({ is_active: false })
          .eq("user_id", user.id)
          .eq("board_id", boardId);
      }
    };
  }, [boardId, user]);

  // Clean up presence when navigating away from the page
  useEffect(() => {
    const cleanupCursor = () => {
      if (user) {
        console.log("🧹 Cleaning up cursor for navigation");
        supabase
          .from("board_presence")
          .update({ is_active: false })
          .eq("user_id", user.id)
          .eq("board_id", boardId)
          .then(({ error }) => {
            if (error) console.error("❌ Cursor cleanup error:", error);
            else console.log("✅ Cursor cleaned up successfully");
          });
      }
    };

    // Listen for browser navigation events
    const handleBeforeUnload = () => {
      cleanupCursor();
    };

    // Add event listeners
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      cleanupCursor(); // Final cleanup when component unmounts
    };
  }, [user, boardId]);

  // Clean up when pathname changes (navigation)
  useEffect(() => {
    return () => {
      if (user) {
        console.log("🔄 Pathname changed, cleaning up cursor");
        supabase
          .from("board_presence")
          .update({ is_active: false })
          .eq("user_id", user.id)
          .eq("board_id", boardId);
      }
    };
  }, [pathname, user, boardId]);

  // Generate consistent color for user based on their ID
  const getUserColor = (userId: string) => {
    const colors = [
      "#ef4444",
      "#f97316",
      "#f59e0b",
      "#eab308",
      "#84cc16",
      "#22c55e",
      "#10b981",
      "#14b8a6",
      "#06b6d4",
      "#0ea5e9",
      "#3b82f6",
      "#6366f1",
      "#8b5cf6",
      "#a855f7",
      "#d946ef",
      "#ec4899",
      "#f43f5e",
    ];
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = ((hash << 5) - hash + userId.charCodeAt(i)) & 0xffffffff;
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Handle mouse move for cursor tracking
  const handleCursorMove = async (e: React.MouseEvent) => {
    if (!user || !canvasRef.current) {
      console.log("Cursor move blocked:", {
        user: !!user,
        canvas: !!canvasRef.current,
      });
      return;
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - viewport.x) / viewport.zoom;
    const y = (e.clientY - rect.top - viewport.y) / viewport.zoom;

    // Throttle cursor updates (only every 100ms)
    const now = Date.now();
    if (
      !handleCursorMove.lastUpdate ||
      now - handleCursorMove.lastUpdate > 100
    ) {
      handleCursorMove.lastUpdate = now;

      const cursorData = {
        user_id: user.id,
        display_name:
          user.user_metadata?.display_name ||
          user.email?.split("@")[0] ||
          "Anonymous",
        cursor_x: x,
        cursor_y: y,
        color: getUserColor(user.id),
        board_id: boardId,
        is_active: true,
        updated_at: new Date().toISOString(),
      };

      console.log("Sending cursor data:", cursorData);

      // Update local state immediately
      updateCursor(cursorData);

      // Send to Supabase (don't await to not block UI)
      supabase
        .from("board_presence")
        .upsert(cursorData, { onConflict: "user_id,board_id" })
        .then((result) => console.log("Cursor update result:", result));
    }
  };
  handleCursorMove.lastUpdate = 0;

  // Redirect if not authorized
  useEffect(() => {
    if (isAuthorized === false) {
      router.push("/boards");
    }
  }, [isAuthorized, router]);

  useEffect(() => {
    // Only load data if user is authorized
    if (isAuthorized !== true) return;

    // Load board info
    supabase
      .from("boards")
      .select("*")
      .eq("id", boardId)
      .single()
      .then(({ data }) => setBoard(data));

    // Load notes
    supabase
      .from("board_objects")
      .select("*")
      .eq("board_id", boardId)
      .then(({ data }) => setNotes(data || []));

    // Load connections
    supabase
      .from("board_connections")
      .select("*")
      .eq("board_id", boardId)
      .then(({ data }) => setConnections(data || []));

    // Load strokes
    supabase
      .from("board_strokes")
      .select("*")
      .eq("board_id", boardId)
      .then(({ data }) => setStrokes(data || []));

    // Load cursor presence (only active cursors)
    supabase
      .from("board_presence")
      .select("*")
      .eq("board_id", boardId)
      .eq("is_active", true)
      .neq("user_id", user?.id || "")
      .then(({ data }) => setCursors(data || []));

    // Subscribe to real-time changes
    const channel = supabase
      .channel(`board:${boardId}`)
      // Notes
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "board_objects" },
        (payload) => addNote(payload.new as any)
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "board_objects" },
        (payload) => updateNote(payload.new.id, payload.new as any)
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "board_objects" },
        (payload) => deleteNote(payload.old.id)
      )
      // Connections
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "board_connections" },
        (payload) => addConnection(payload.new as any)
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "board_connections" },
        (payload) => deleteConnection(payload.old.id)
      )
      // Strokes
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "board_strokes" },
        (payload) => addStroke(payload.new as any)
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "board_strokes" },
        (payload) => deleteStroke(payload.old.id)
      )
      // Cursor presence
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "board_presence" },
        (payload) => {
          if (payload.new.user_id !== user?.id) {
            updateCursor(payload.new as any);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "board_presence" },
        (payload) => {
          if (payload.new.user_id !== user?.id) {
            // If cursor becomes inactive, remove it
            if (!payload.new.is_active) {
              removeCursor(payload.new.user_id);
            } else {
              // If cursor is active, update position
              updateCursor(payload.new as any);
            }
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "board_presence" },
        (payload) => {
          removeCursor(payload.old.user_id);
        }
      )
      .subscribe();

    return () => {
      // Clean up presence when leaving
      if (user) {
        supabase
          .from("board_presence")
          .delete()
          .eq("user_id", user.id)
          .eq("board_id", boardId);
      }
      supabase.removeChannel(channel);
    };
  }, [boardId, isAuthorized]);

  // Additional cleanup on page unload/refresh
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (user) {
        // Use navigator.sendBeacon for reliable cleanup on page unload
        const data = JSON.stringify({
          user_id: user.id,
          board_id: boardId,
        });

        // Fallback: try regular delete
        supabase
          .from("board_presence")
          .delete()
          .eq("user_id", user.id)
          .eq("board_id", boardId);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && user) {
        // User switched tabs or minimized - optional: could pause cursor updates
        // For now, keep cursor active even when tab is hidden
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      // Also clean up on component unmount
      if (user) {
        supabase
          .from("board_presence")
          .delete()
          .eq("user_id", user.id)
          .eq("board_id", boardId);
      }
    };
  }, [user, boardId]);

  // Delete item function
  const deleteItem = useCallback(
    async (id: string) => {
      // Check if it's a connection first
      const connection = connections.find((c) => c.id === id);
      if (connection) {
        await supabase.from("board_connections").delete().eq("id", id);
        deleteConnection(id);
        useStore.getState().setSelectedItemId(null);
        return;
      }

      // Check if it's a stroke
      const stroke = strokes.find((s) => s.id === id);
      if (stroke) {
        console.log("Deleting single stroke:", id, stroke);
        const result = await supabase
          .from("board_strokes")
          .delete()
          .eq("id", id);
        console.log("Single stroke delete result:", result);
        if (result.error) {
          console.error("Single stroke delete error:", result.error);
        } else {
          deleteStroke(id);
        }
        useStore.getState().setSelectedItemId(null);
        return;
      }

      // Otherwise it's a note/object
      await supabase.from("board_objects").delete().eq("id", id);
      deleteNote(id);
      useStore.getState().setSelectedItemId(null);
    },
    [connections, strokes, deleteConnection, deleteStroke, deleteNote]
  );

  // Delete multiple items function
  const deleteMultipleItems = useCallback(
    async (ids: string[]) => {
      console.log("Deleting multiple items:", ids);
      const noteIds: string[] = [];
      const connectionIds: string[] = [];
      const strokeIds: string[] = [];

      // Categorize items by type
      ids.forEach((id) => {
        if (connections.find((c) => c.id === id)) {
          connectionIds.push(id);
        } else if (strokes.find((s) => s.id === id)) {
          strokeIds.push(id);
        } else {
          noteIds.push(id);
        }
      });

      console.log("Categorized:", { noteIds, connectionIds, strokeIds });

      // Delete in batches by type (sequentially to avoid Promise issues)
      if (noteIds.length > 0) {
        console.log("Deleting notes:", noteIds);
        const result = await supabase
          .from("board_objects")
          .delete()
          .in("id", noteIds);
        console.log("Notes delete result:", result);
      }

      if (connectionIds.length > 0) {
        console.log("Deleting connections:", connectionIds);
        const result = await supabase
          .from("board_connections")
          .delete()
          .in("id", connectionIds);
        console.log("Connections delete result:", result);
      }

      if (strokeIds.length > 0) {
        console.log("Deleting strokes:", strokeIds);
        const result = await supabase
          .from("board_strokes")
          .delete()
          .in("id", strokeIds);
        console.log("Strokes delete result:", result);
      }

      // Update local state
      noteIds.forEach(deleteNote);
      connectionIds.forEach(deleteConnection);
      strokeIds.forEach(deleteStroke);

      // Clear selection
      clearSelection();
    },
    [
      connections,
      strokes,
      deleteNote,
      deleteConnection,
      deleteStroke,
      clearSelection,
    ]
  );

  // Delete key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete") {
        const state = useStore.getState();

        // Check if we have multiple items selected
        if (state.selectedItemIds.length > 0) {
          e.preventDefault();
          deleteMultipleItems(state.selectedItemIds);
        } else if (state.selectedItemId) {
          e.preventDefault();
          deleteItem(state.selectedItemId);
        }
      } else if (e.key === "Escape") {
        // Clear selection on Escape
        clearSelection();
      } else if (e.ctrlKey && e.key === "a") {
        // Select all items with Ctrl+A
        e.preventDefault();
        const allItemIds = [
          ...notes.map((note) => note.id),
          ...connections.map((conn) => conn.id),
          ...strokes.map((stroke) => stroke.id),
        ];
        setSelectedItemIds(allItemIds);
        setSelectedItemId(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    deleteItem,
    deleteMultipleItems,
    clearSelection,
    notes,
    connections,
    strokes,
    setSelectedItemIds,
    setSelectedItemId,
  ]);

  // Generate random note color
  const getRandomNoteColor = () => {
    const colors = [
      "#9ca3af", // Gray-400
      "#a1a1aa", // Zinc-400
      "#94a3b8", // Slate-400
      "#93c5fd", // Blue-300
      "#86efac", // Green-300
      "#fca5a5", // Red-300
      "#c4b5fd", // Violet-300
      "#fde047", // Yellow-300
      "#6ee7b7", // Emerald-300
      "#7dd3fc", // Sky-300
      "#a3a3a3", // Neutral-400
      "#fbbf24", // Amber-400
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const createObject = async (x: number, y: number, type: string) => {
    let objectData: any = {
      board_id: boardId,
      type,
      x,
      y,
    };

    // Configure based on type
    switch (type) {
      case "note":
        objectData = {
          ...objectData,
          content: "New note",
          width: 200,
          height: 150,
          color: getRandomNoteColor(),
        };
        break;
      case "text":
        objectData = {
          ...objectData,
          content: "Text",
          width: 200,
          height: 50,
          color: "transparent",
        };
        break;
      case "arrow":
        // Arrow tool doesn't create objects directly, it's for connecting notes
        return;
      default:
        return;
    }

    const { data } = await supabase
      .from("board_objects")
      .insert(objectData)
      .select()
      .single();

    if (data) {
      addNote(data);
      setSelectedTool("select"); // Return to select mode after creating
    }
  };

  // Handle canvas click for creating objects and deselection
  const handleCanvasClick = (e: React.MouseEvent) => {
    setContextMenu(null);
    const target = e.target as HTMLElement;
    const isCanvasBackground =
      target === canvasRef.current ||
      target.classList.contains("canvas-content") ||
      target.tagName === "svg";

    // Deselect when clicking on background in select mode
    if (selectedTool === "select" && isCanvasBackground) {
      if (!e.shiftKey) {
        clearSelection();
      }
      return;
    }

    if (selectedTool === "select") return;

    if (!isCanvasBackground) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Convert screen coordinates to canvas coordinates
    const x = (e.clientX - rect.left - viewport.x) / viewport.zoom;
    const y = (e.clientY - rect.top - viewport.y) / viewport.zoom;

    // For note tool, create immediately with fixed size
    if (selectedTool === "note") {
      createObject(x, y, selectedTool);
    }
    // For text tool, dragging will be handled by mouse events
  };

  // Handle text drag start
  const handleTextDragStart = (e: React.MouseEvent) => {
    if (selectedTool !== "text") return;

    const target = e.target as HTMLElement;
    const isCanvasBackground =
      target === canvasRef.current ||
      target.classList.contains("canvas-content") ||
      target.tagName === "svg";

    if (!isCanvasBackground) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left - viewport.x) / viewport.zoom;
    const y = (e.clientY - rect.top - viewport.y) / viewport.zoom;

    setIsDraggingText(true);
    setTextDragStart({ x, y });
    setTextDragEnd({ x, y });
  };

  // Handle text drag move
  const handleTextDragMove = (e: React.MouseEvent) => {
    if (!isDraggingText || !textDragStart) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left - viewport.x) / viewport.zoom;
    const y = (e.clientY - rect.top - viewport.y) / viewport.zoom;

    setTextDragEnd({ x, y });
  };

  // Handle text drag end
  const handleTextDragEnd = async () => {
    if (!isDraggingText || !textDragStart || !textDragEnd) return;

    const width = Math.abs(textDragEnd.x - textDragStart.x);
    const height = Math.abs(textDragEnd.y - textDragStart.y);

    // Only create if dragged at least 20px
    if (width > 20 && height > 20) {
      const x = Math.min(textDragStart.x, textDragEnd.x);
      const y = Math.min(textDragStart.y, textDragEnd.y);

      const { data } = await supabase
        .from("board_objects")
        .insert({
          board_id: boardId,
          type: "text",
          content: "Text",
          x,
          y,
          width,
          height,
          color: "transparent",
        })
        .select()
        .single();

      if (data) {
        addNote(data);
        setSelectedTool("select");
      }
    }

    setIsDraggingText(false);
    setTextDragStart(null);
    setTextDragEnd(null);
  };

  // Handle pen drawing start
  const handlePenDrawStart = (e: React.MouseEvent) => {
    if (selectedTool !== "pen") return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left - viewport.x) / viewport.zoom;
    const y = (e.clientY - rect.top - viewport.y) / viewport.zoom;

    setIsDrawing(true);
    setCurrentStroke([{ x, y }]);
  };

  // Handle pen drawing move
  const handlePenDrawMove = (e: React.MouseEvent) => {
    if (!isDrawing || selectedTool !== "pen") return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left - viewport.x) / viewport.zoom;
    const y = (e.clientY - rect.top - viewport.y) / viewport.zoom;

    setCurrentStroke((prev) => [...prev, { x, y }]);
  };

  // Handle pen drawing end
  const handlePenDrawEnd = async () => {
    if (!isDrawing || currentStroke.length < 2) {
      setIsDrawing(false);
      setCurrentStroke([]);
      return;
    }
    // Save stroke to database
    const { data } = await supabase
      .from("board_strokes")
      .insert({
        board_id: boardId,
        created_by: "user", // TODO: Replace with actual user ID
        color: strokeColor,
        stroke_width: strokeWidth,
        points: currentStroke,
      })
      .select()
      .single();

    if (data) {
      addStroke(data);
    }

    setIsDrawing(false);
    setCurrentStroke([]);
  };

  // Handle stroke dragging
  const handleStrokeMouseDown = (e: React.MouseEvent, stroke: any) => {
    if (selectedTool !== "select") return;

    e.stopPropagation();
    setIsDraggingStroke(true);
    setDraggedStrokeId(stroke.id);
    setSelectedItemId(stroke.id);

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const startX = (e.clientX - rect.left - viewport.x) / viewport.zoom;
    const startY = (e.clientY - rect.top - viewport.y) / viewport.zoom;
    setStrokeDragStart({ x: startX, y: startY });

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!strokeDragStart || !rect) return;

      const currentX =
        (moveEvent.clientX - rect.left - viewport.x) / viewport.zoom;
      const currentY =
        (moveEvent.clientY - rect.top - viewport.y) / viewport.zoom;

      const deltaX = currentX - strokeDragStart.x;
      const deltaY = currentY - strokeDragStart.y;

      // Update stroke points in real-time
      const originalStroke = strokes.find((s) => s.id === stroke.id);
      if (originalStroke) {
        const updatedPoints = originalStroke.points.map((point) => ({
          x: point.x + deltaX,
          y: point.y + deltaY,
        }));
        updateStroke(stroke.id, { points: updatedPoints });
      }
    };

    const handleMouseUp = async () => {
      if (!strokeDragStart || !draggedStrokeId) return;

      // Update in database
      const updatedStroke = strokes.find((s) => s.id === draggedStrokeId);
      if (updatedStroke) {
        await supabase
          .from("board_strokes")
          .update({ points: updatedStroke.points })
          .eq("id", draggedStrokeId);
      }

      setIsDraggingStroke(false);
      setDraggedStrokeId(null);
      setStrokeDragStart(null);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // Handle marquee selection start
  const handleMarqueeStart = (e: React.MouseEvent) => {
    if (!e.shiftKey || selectedTool !== "select") return false;

    const target = e.target as HTMLElement;
    const isCanvasBackground =
      target === canvasRef.current ||
      target.classList.contains("canvas-content") ||
      target.tagName === "svg";

    if (!isCanvasBackground) return false;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return false;

    const x = (e.clientX - rect.left - viewport.x) / viewport.zoom;
    const y = (e.clientY - rect.top - viewport.y) / viewport.zoom;

    setIsMarqueeSelecting(true);
    setMarqueeStart({ x, y });
    setMarqueeEnd({ x, y });

    return true;
  };

  // Handle marquee selection move
  const handleMarqueeMove = (e: React.MouseEvent) => {
    if (!isMarqueeSelecting || !marqueeStart) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left - viewport.x) / viewport.zoom;
    const y = (e.clientY - rect.top - viewport.y) / viewport.zoom;

    setMarqueeEnd({ x, y });
  };

  // Handle marquee selection end
  const handleMarqueeEnd = () => {
    if (!isMarqueeSelecting || !marqueeStart || !marqueeEnd) {
      setIsMarqueeSelecting(false);
      setMarqueeStart(null);
      setMarqueeEnd(null);
      return;
    }

    // Calculate selection rectangle
    const minX = Math.min(marqueeStart.x, marqueeEnd.x);
    const maxX = Math.max(marqueeStart.x, marqueeEnd.x);
    const minY = Math.min(marqueeStart.y, marqueeEnd.y);
    const maxY = Math.max(marqueeStart.y, marqueeEnd.y);

    // Find items within the selection rectangle
    const selectedIds: string[] = [];

    // Check notes
    notes.forEach((note) => {
      const noteLeft = note.x;
      const noteRight = note.x + note.width;
      const noteTop = note.y;
      const noteBottom = note.y + note.height;

      // Check if note intersects with selection rectangle
      if (
        noteLeft < maxX &&
        noteRight > minX &&
        noteTop < maxY &&
        noteBottom > minY
      ) {
        selectedIds.push(note.id);
      }
    });

    // Check connections (check if line intersects rectangle)
    connections.forEach((conn) => {
      const fromNote = notes.find((n) => n.id === conn.from_object_id);
      const toNote = notes.find((n) => n.id === conn.to_object_id);

      if (fromNote && toNote) {
        const x1 = fromNote.x + fromNote.width / 2;
        const y1 = fromNote.y + fromNote.height / 2;
        const x2 = toNote.x + toNote.width / 2;
        const y2 = toNote.y + toNote.height / 2;

        // Simple check: if either endpoint is in rectangle or line crosses rectangle
        if (
          (x1 >= minX && x1 <= maxX && y1 >= minY && y1 <= maxY) ||
          (x2 >= minX && x2 <= maxX && y2 >= minY && y2 <= maxY)
        ) {
          selectedIds.push(conn.id);
        }
      }
    });

    // Check strokes
    strokes.forEach((stroke) => {
      // Check if any point of the stroke is within the rectangle
      const hasPointInRect = stroke.points.some(
        (point) =>
          point.x >= minX &&
          point.x <= maxX &&
          point.y >= minY &&
          point.y <= maxY
      );

      if (hasPointInRect) {
        selectedIds.push(stroke.id);
      }
    });

    // Update selection
    if (selectedIds.length > 0) {
      setSelectedItemIds(selectedIds);
      setSelectedItemId(null);
    }

    // Clean up
    setIsMarqueeSelecting(false);
    setMarqueeStart(null);
    setMarqueeEnd(null);
  };
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // Try to start marquee selection first
    if (handleMarqueeStart(e)) {
      return;
    }

    const target = e.target as HTMLElement;
    const isCanvasBackground =
      target === canvasRef.current ||
      target.classList.contains("canvas-content") ||
      target.tagName === "svg";

    if (!isCanvasBackground || selectedTool !== "select") return;

    setIsPanning(true);
    let lastX = e.clientX;
    let lastY = e.clientY;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - lastX;
      const dy = moveEvent.clientY - lastY;
      panViewport(dx, dy);

      // Update last position for next frame
      lastX = moveEvent.clientX;
      lastY = moveEvent.clientY;
    };

    const handleMouseUp = () => {
      setIsPanning(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // Mouse handlers for cursor feedback and text dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    // Handle text tool drag start
    if (selectedTool === "text") {
      handleTextDragStart(e);
      return;
    }

    // Handle pen tool drawing start
    if (selectedTool === "pen") {
      handlePenDrawStart(e);
      return;
    }

    // Only show grab cursor in select mode
    if (selectedTool !== "select") return;

    const target = e.target as HTMLElement;
    const isCanvasBackground =
      target === canvasRef.current ||
      target.classList.contains("canvas-content") ||
      target.tagName === "svg";

    if (isCanvasBackground) {
      setIsMouseDown(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    handleTextDragMove(e);
    handlePenDrawMove(e);
    handleMarqueeMove(e);
    handleCursorMove(e);
  };

  const handleMouseUp = () => {
    handleTextDragEnd();
    handlePenDrawEnd();
    handleMarqueeEnd();
    setIsMouseDown(false);
    setIsPanning(false);
  };

  const handleMouseLeave = () => {
    handleTextDragEnd();
    handlePenDrawEnd();
    handleMarqueeEnd();
    setIsMouseDown(false);
    setIsPanning(false);
  };

  // Determine cursor style based on selected tool
  const getCursor = () => {
    if (selectedTool === "select") {
      if (isPanning) return "grabbing";
      if (isMouseDown) return "grab";
      return "default";
    }
    if (selectedTool === "pen") return "crosshair";
    if (selectedTool === "arrow") return "crosshair";
    // Default cursor for creation tools (hand will show on hover)
    return "default";
  };

  // Convert stroke points to SVG path
  const pointsToPath = (points: { x: number; y: number }[]) => {
    if (points.length === 0) return "";
    const [first, ...rest] = points;
    return `M ${first.x} ${first.y} ${rest
      .map((p) => `L ${p.x} ${p.y}`)
      .join(" ")}`;
  };

  // Show loading while checking authorization
  if (isAuthorized === null) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Checking access...</p>
      </div>
    );
  }

  // Show unauthorized message (though it should redirect)
  if (isAuthorized === false) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>You don't have access to this board.</p>
      </div>
    );
  }

  return (
    <div
      ref={canvasRef}
      className="relative w-full h-screen overflow-hidden"
      onClick={handleCanvasClick}
      onMouseDown={(e) => {
        handleMouseDown(e);
        handleCanvasMouseDown(e);
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      // Scroll Wheel handling
      onWheel={(e) => {
        e.preventDefault();

        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;

        const centerX = e.clientX - rect.left;
        const centerY = e.clientY - rect.top;
        const delta = -e.deltaY * 0.001;

        zoomViewport(delta, centerX, centerY);
      }}
      style={{
        touchAction: "none",
        cursor: getCursor(),
        background: "var(--bg-primary)",
      }}
    >
      {/* Left Toolbar */}
      <Toolbar />
      {/* Grid Background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, var(--border) 1px, transparent 1px),
            linear-gradient(to bottom, var(--border) 1px, transparent 1px)
          `,
          backgroundSize: `${40 * viewport.zoom}px ${40 * viewport.zoom}px`,
          backgroundPosition: `${viewport.x}px ${viewport.y}px`,
        }}
      />

      {/* Breadcrumb Navigation */}
      <div className="absolute top-4 left-20 z-50">
        <div
          className="px-4 py-2 rounded shadow text-sm flex items-center gap-2"
          style={{
            background: "var(--bg-surface)",
            color: "var(--text-primary)",
            border: "1px solid var(--border)",
          }}
        >
          <button
            onClick={() => router.push("/boards")}
            className="flex items-center gap-1.5 hover:text-primary transition-colors"
            style={{ color: "var(--text-secondary)" }}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </button>
          <span style={{ color: "var(--text-secondary)" }}>/</span>
          <span className="font-semibold">{board?.title || "Loading..."}</span>
        </div>
      </div>

      {/* Top Info Bar */}
      <div className="absolute top-16 left-20 z-50 flex gap-2">
        <div
          className="px-4 py-2 rounded shadow text-sm"
          style={{
            background: "var(--bg-surface)",
            color: "var(--text-primary)",
            border: "1px solid var(--border)",
          }}
        >
          Tool: <span className="font-semibold capitalize">{selectedTool}</span>
          {selectedTool === "arrow" && !selectedNoteId && (
            <span className="ml-2" style={{ color: "var(--text-secondary)" }}>
              Click first note to connect
            </span>
          )}
          {selectedTool !== "select" && selectedTool !== "arrow" && (
            <span className="ml-2" style={{ color: "var(--text-secondary)" }}>
              Click to place
            </span>
          )}
        </div>

        {/* Multi-selection indicator */}
        {(selectedItemIds.length > 0 ||
          (selectedItemId && selectedItemIds.length === 0)) && (
          <div
            className="px-4 py-2 rounded shadow text-sm"
            style={{
              background: "var(--accent-primary-bg)",
              color: "var(--accent-primary)",
              border: "1px solid var(--accent-primary)",
            }}
          >
            {selectedItemIds.length > 0 ? (
              <>
                {selectedItemIds.length} item
                {selectedItemIds.length > 1 ? "s" : ""} selected
                <span
                  className="ml-2"
                  style={{ color: "var(--text-secondary)" }}
                >
                  • Shift+Click: add/remove • Shift+Drag: select area • Ctrl+A:
                  select all • Esc: clear • Del: delete
                </span>
              </>
            ) : (
              <>
                1 item selected
                <span
                  className="ml-2"
                  style={{ color: "var(--text-secondary)" }}
                >
                  • Shift+Click: multi-select • Shift+Drag: select area • Del:
                  delete
                </span>
              </>
            )}
          </div>
        )}

        {selectedNoteId && (
          <span
            className="px-4 py-2 rounded text-sm"
            style={{
              background: "var(--accent-yellow)",
              color: "var(--text-primary)",
            }}
          >
            Connection mode: Click another note
          </span>
        )}
        <InviteModal boardId={boardId} />
      </div>

      {/* Zoom Controls & Theme Toggle */}
      <div className="absolute top-4 right-4 z-50 flex flex-col gap-2">
        <ThemeToggle />

        <div className="h-px bg-border my-1"></div>

        <button
          onClick={() => zoomViewport(0.1)}
          className="w-10 h-10 rounded shadow flex items-center justify-center text-xl font-bold transition-colors"
          style={{
            background: "var(--bg-surface)",
            color: "var(--text-primary)",
            border: "1px solid var(--border)",
          }}
        >
          +
        </button>
        <div
          className="w-10 h-10 rounded shadow flex items-center justify-center text-sm"
          style={{
            background: "var(--bg-surface)",
            color: "var(--text-primary)",
            border: "1px solid var(--border)",
          }}
        >
          {Math.round(viewport.zoom * 100)}%
        </div>
        <button
          onClick={() => zoomViewport(-0.1)}
          className="w-10 h-10 rounded shadow flex items-center justify-center text-xl font-bold transition-colors"
          style={{
            background: "var(--bg-surface)",
            color: "var(--text-primary)",
            border: "1px solid var(--border)",
          }}
        >
          −
        </button>
        <button
          onClick={() =>
            useStore.setState({ viewport: { x: 0, y: 0, zoom: 1 } })
          }
          className="w-10 h-10 rounded shadow flex items-center justify-center text-xs transition-colors"
          style={{
            background: "var(--bg-surface)",
            color: "var(--text-primary)",
            border: "1px solid var(--border)",
          }}
          title="Reset view"
        >
          ⟲
        </button>
      </div>

      {/* Canvas content with viewport transform */}
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div
          className="canvas-content"
          style={{
            transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
            transformOrigin: "0 0",
            width: "100%",
            height: "100%",
          }}
        >
          {/* Render connections */}
          {uniqueConnections.map((conn) => {
            const isSelected =
              selectedItemId === conn.id || selectedItemIds.includes(conn.id);
            return (
              <ConnectionLine
                key={conn.id}
                connection={conn}
                isSelected={isSelected}
                onClick={(e) => {
                  e.stopPropagation();
                  clearSelection();
                  setSelectedItemId(conn.id);
                  setContextMenu(null);
                }}
                onContextMenu={(e, id) => {
                  e.preventDefault();
                  // If right-clicking on unselected item, select it
                  if (!selectedItemIds.includes(id) && selectedItemId !== id) {
                    clearSelection();
                    setSelectedItemId(id);
                  }
                  setContextMenu({ x: e.clientX, y: e.clientY, itemId: id });
                }}
              />
            );
          })}

          {/* Render notes */}
          {uniqueNotes.map((note) => {
            const isSelected =
              selectedItemId === note.id || selectedItemIds.includes(note.id);
            return (
              <Note
                key={note.id}
                note={note}
                isSelected={isSelected}
                onClick={(e) => {
                  clearSelection();
                  setSelectedItemId(note.id);
                  setContextMenu(null);
                }}
                onContextMenu={(e, id) => {
                  e.preventDefault();
                  // If right-clicking on unselected item, select it
                  if (!selectedItemIds.includes(id) && selectedItemId !== id) {
                    clearSelection();
                    setSelectedItemId(id);
                  }
                  setContextMenu({ x: e.clientX, y: e.clientY, itemId: id });
                }}
              />
            );
          })}

          {/* Text drag preview */}
          {isDraggingText && textDragStart && textDragEnd && (
            <div
              className="absolute pointer-events-none"
              style={{
                left: Math.min(textDragStart.x, textDragEnd.x),
                top: Math.min(textDragStart.y, textDragEnd.y),
                width: Math.abs(textDragEnd.x - textDragStart.x),
                height: Math.abs(textDragEnd.y - textDragStart.y),
                border: "2px dashed var(--accent-primary)",
                background: "var(--accent-primary-bg)",
                borderRadius: "4px",
              }}
            />
          )}

          {/* Marquee selection rectangle */}
          {isMarqueeSelecting && marqueeStart && marqueeEnd && (
            <div
              className="absolute pointer-events-none"
              style={{
                left: Math.min(marqueeStart.x, marqueeEnd.x),
                top: Math.min(marqueeStart.y, marqueeEnd.y),
                width: Math.abs(marqueeEnd.x - marqueeStart.x),
                height: Math.abs(marqueeEnd.y - marqueeStart.y),
                border: "2px dashed var(--accent-primary)",
                background: "var(--accent-primary-bg)",
                borderRadius: "4px",
                opacity: 0.3,
                zIndex: 1000,
              }}
            />
          )}

          {/* Render other users' cursors */}
          {cursors
            .filter((cursor) => cursor.user_id !== user?.id)
            .map((cursor) => (
              <div
                key={cursor.user_id}
                className="absolute pointer-events-none z-[1001]"
                style={{
                  left: cursor.cursor_x,
                  top: cursor.cursor_y,
                  transform: "translate(-2px, -2px)",
                }}
              >
                {/* Cursor */}
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  className="drop-shadow-lg"
                >
                  <path
                    d="M0 0L0 16L5 12L8 18L11 16L8 10L16 8L0 0Z"
                    fill={cursor.color}
                    stroke="white"
                    strokeWidth="1"
                  />
                </svg>
                {/* User name */}
                <div
                  className="absolute top-5 left-3 px-2 py-1 rounded text-xs font-medium text-white shadow-lg"
                  style={{
                    backgroundColor: cursor.color,
                    fontSize: "11px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {cursor.display_name}
                </div>
              </div>
            ))}

          {/* Render pen strokes */}
          <svg
            className="absolute inset-0"
            style={{
              width: "100%",
              height: "100%",
              overflow: "visible",
              pointerEvents: selectedTool === "select" ? "auto" : "none",
            }}
          >
            {/* Render saved strokes */}
            {uniqueStrokes.map((stroke) => {
              const isSelected =
                selectedItemId === stroke.id ||
                selectedItemIds.includes(stroke.id);
              return (
                <g key={stroke.id}>
                  {/* Invisible wider path for easier clicking */}
                  <path
                    d={pointsToPath(stroke.points)}
                    stroke="transparent"
                    strokeWidth={stroke.stroke_width + 10}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      cursor:
                        selectedTool === "select"
                          ? isDraggingStroke && draggedStrokeId === stroke.id
                            ? "grabbing"
                            : "grab"
                          : "pointer",
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      clearSelection();
                      setSelectedItemId(stroke.id);
                      setContextMenu(null);
                    }}
                    onMouseDown={(e) => handleStrokeMouseDown(e, stroke)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      // If right-clicking on unselected item, select it
                      if (
                        !selectedItemIds.includes(stroke.id) &&
                        selectedItemId !== stroke.id
                      ) {
                        clearSelection();
                        setSelectedItemId(stroke.id);
                      }
                      setContextMenu({
                        x: e.clientX,
                        y: e.clientY,
                        itemId: stroke.id,
                      });
                    }}
                  />
                  {/* Selection highlight */}
                  {isSelected && (
                    <path
                      d={pointsToPath(stroke.points)}
                      stroke="var(--accent-primary)"
                      strokeWidth={stroke.stroke_width + 4}
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ pointerEvents: "none", opacity: 0.5 }}
                    />
                  )}
                  {/* Actual stroke */}
                  <path
                    d={pointsToPath(stroke.points)}
                    stroke={stroke.color}
                    strokeWidth={stroke.stroke_width}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ pointerEvents: "none" }}
                  />
                </g>
              );
            })}

            {/* Render current stroke being drawn */}
            {isDrawing && currentStroke.length > 0 && (
              <path
                d={pointsToPath(currentStroke)}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ pointerEvents: "none" }}
              />
            )}
          </svg>
        </div>
      </DndContext>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          selectedItemsCount={selectedItemIds.length + (selectedItemId ? 1 : 0)}
          onClose={() => setContextMenu(null)}
          onDelete={() => {
            if (selectedItemIds.length > 0) {
              // Include the right-clicked item if it's not already in the selection
              const itemsToDelete = selectedItemIds.includes(contextMenu.itemId)
                ? selectedItemIds
                : [...selectedItemIds, contextMenu.itemId];
              deleteMultipleItems(itemsToDelete);
            } else {
              deleteItem(contextMenu.itemId);
            }
          }}
        />
      )}
    </div>
  );
}
