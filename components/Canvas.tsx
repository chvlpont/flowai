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
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

export function Canvas({ boardId }: { boardId: string }) {
  const router = useRouter();
  const { notes, setNotes, addNote, updateNote, deleteNote } = useStore();
  const { connections, setConnections, addConnection, deleteConnection } =
    useStore();
  const { strokes, setStrokes, addStroke } = useStore();
  const updateStroke = useStore((s) => s.updateStroke);
  const deleteStroke = useStore((s) => s.deleteStroke);
  const selectedNoteId = useStore((s) => s.selectedNoteId);
  const selectedItemId = useStore((s) => s.selectedItemId);
  const setSelectedItemId = useStore((s) => s.setSelectedItemId);
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [boardId, isAuthorized]);

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
        await supabase.from("board_strokes").delete().eq("id", id);
        deleteStroke(id);
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

  // Delete key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete") {
        const selectedItemId = useStore.getState().selectedItemId;
        if (selectedItemId) {
          e.preventDefault();
          deleteItem(selectedItemId);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteItem]);

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
  };

  const handleMouseUp = () => {
    handleTextDragEnd();
    handlePenDrawEnd();
    setIsMouseDown(false);
    setIsPanning(false);
  };

  const handleMouseLeave = () => {
    handleTextDragEnd();
    handlePenDrawEnd();
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
          {uniqueConnections.map((conn) => (
            <ConnectionLine
              key={conn.id}
              connection={conn}
              onContextMenu={(e, id) => {
                e.preventDefault();
                setContextMenu({ x: e.clientX, y: e.clientY, itemId: id });
              }}
            />
          ))}

          {/* Render notes */}
          {uniqueNotes.map((note) => (
            <Note
              key={note.id}
              note={note}
              onClick={() => {
                setSelectedItemId(note.id);
                setContextMenu(null);
              }}
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
              const isSelected = selectedItemId === stroke.id;
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
                      setSelectedItemId(stroke.id);
                      setContextMenu(null);
                    }}
                    onMouseDown={(e) => handleStrokeMouseDown(e, stroke)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
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
          onClose={() => setContextMenu(null)}
          onDelete={() => deleteItem(contextMenu.itemId)}
        />
      )}
    </div>
  );
}
