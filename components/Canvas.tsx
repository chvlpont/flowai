"use client";

import { useEffect, useRef, useState } from "react";
import { useStore } from "@/store";
import { supabase } from "@/lib/supabase";
import { Note } from "./Note";
import { ConnectionLine } from "./Connection";
import { Toolbar } from "./Toolbar";
import { ThemeToggle } from "./ThemeToggle";
import { ContextMenu } from "./ContextMenu";
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";

export function Canvas({ boardId }: { boardId: string }) {
  const { notes, setNotes, addNote, updateNote, deleteNote } = useStore();
  const { connections, setConnections, addConnection, deleteConnection } =
    useStore();
  const selectedNoteId = useStore((s) => s.selectedNoteId);
  const selectedTool = useStore((s) => s.selectedTool);
  const setSelectedTool = useStore((s) => s.setSelectedTool);
  const viewport = useStore((s) => s.viewport);
  const panViewport = useStore((s) => s.panViewport);
  const zoomViewport = useStore((s) => s.zoomViewport);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [isDraggingText, setIsDraggingText] = useState(false);
  const [textDragStart, setTextDragStart] = useState<{ x: number; y: number } | null>(null);
  const [textDragEnd, setTextDragEnd] = useState<{ x: number; y: number } | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    itemId: string;
  } | null>(null);

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
    const newX = note.x + delta.x / viewport.zoom;
    const newY = note.y + delta.y / viewport.zoom;

    // Update store
    updateNote(noteId, { x: newX, y: newY });

    // Update database
    await supabase
      .from("board_objects")
      .update({ x: newX, y: newY })
      .eq("id", noteId);
  };

  // Filter unique notes to avoid duplicate keys
  const uniqueNotes = notes.filter(
    (note, index, self) => index === self.findIndex((n) => n.id === note.id)
  );

  // Filter unique connections
  const uniqueConnections = connections.filter(
    (conn, index, self) => index === self.findIndex((c) => c.id === conn.id)
  );

  useEffect(() => {
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [boardId]);

  // Delete key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        const selectedItemId = useStore.getState().selectedItemId;
        if (selectedItemId) {
          e.preventDefault();
          deleteItem(selectedItemId);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Delete item function
  const deleteItem = async (id: string) => {
    await supabase.from("board_objects").delete().eq("id", id);
    deleteNote(id);
    useStore.getState().setSelectedItemId(null);
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
          color: "#fef3c7",
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
    const target = e.target as HTMLElement;
    const isCanvasBackground =
      target === canvasRef.current ||
      target.classList.contains("canvas-content") ||
      target.tagName === "svg";

    // Deselect when clicking on background in select mode
    if (selectedTool === "select" && isCanvasBackground) {
      useStore.getState().setSelectedItemId(null);
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

  // Pan with mouse drag on background
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
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

  // Zoom on wheel
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const centerX = e.clientX - rect.left;
    const centerY = e.clientY - rect.top;
    const delta = -e.deltaY * 0.001;

    zoomViewport(delta, centerX, centerY);
  };

  // Mouse handlers for cursor feedback and text dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    // Handle text tool drag start
    if (selectedTool === "text") {
      handleTextDragStart(e);
      return;
    }

    // Only show grab cursor in select mode
    if (selectedTool !== "select") return;

    const target = e.target as HTMLElement;
    const isCanvasBackground =
      target === canvasRef.current ||
      target.classList.contains('canvas-content') ||
      target.tagName === 'svg';

    if (isCanvasBackground) {
      setIsMouseDown(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    handleTextDragMove(e);
  };

  const handleMouseUp = () => {
    handleTextDragEnd();
    setIsMouseDown(false);
    setIsPanning(false);
  };

  const handleMouseLeave = () => {
    handleTextDragEnd();
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
    // Default cursor for creation tools (hand will show on hover)
    return "default";
  };

  return (
    <div
      ref={canvasRef}
      className="relative w-full h-screen overflow-hidden"
      onWheel={handleWheel}
      onClick={handleCanvasClick}
      onMouseDown={(e) => {
        handleMouseDown(e);
        handleCanvasMouseDown(e);
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
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

      {/* Top Info Bar */}
      <div className="absolute top-4 left-20 z-50 flex gap-2">
        <div
          className="px-4 py-2 rounded shadow text-sm"
          style={{
            background: "var(--bg-surface)",
            color: "var(--text-primary)",
            border: "1px solid var(--border)",
          }}
        >
          Tool: <span className="font-semibold capitalize">{selectedTool}</span>
          {selectedTool !== "select" && (
            <span className="ml-2" style={{ color: "var(--text-secondary)" }}>
              Click to place
            </span>
          )}
        </div>

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
          onClick={() => useStore.setState({ viewport: { x: 0, y: 0, zoom: 1 } })}
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
          {uniqueConnections.map((conn) => (
            <ConnectionLine key={conn.id} connection={conn} />
          ))}

          {/* Render notes */}
          {uniqueNotes.map((note) => (
            <Note
              key={note.id}
              note={note}
              onContextMenu={(e, id) => {
                e.preventDefault();
                setContextMenu({ x: e.clientX, y: e.clientY, itemId: id });
              }}
            />
          ))}

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
        </div>
      </DndContext>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onDelete={() => deleteItem(contextMenu.itemId)}
        />
      )}
    </div>
  );
}
