"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useStore } from "@/store";
import { supabase } from "@/lib/supabase/client";

interface NoteProps {
  note: any;
  onContextMenu: (e: React.MouseEvent, id: string) => void;
  onClick?: (e: React.MouseEvent) => void;
  isSelected?: boolean;
}

export function Note({
  note,
  onContextMenu,
  onClick,
  isSelected: propIsSelected,
}: NoteProps) {
  const updateNote = useStore((s) => s.updateNote);
  const selectedNoteId = useStore((s) => s.selectedNoteId);
  const setSelectedNoteId = useStore((s) => s.setSelectedNoteId);
  const selectedItemId = useStore((s) => s.selectedItemId);
  const setSelectedItemId = useStore((s) => s.setSelectedItemId);
  const addConnection = useStore((s) => s.addConnection);
  const viewport = useStore((s) => s.viewport);

  // Local state for text editing
  const [localContent, setLocalContent] = useState(note.content);
  const [isEditing, setIsEditing] = useState(false);

  // Debounced save ref
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Update local content when note content changes (for real-time updates)
  useEffect(() => {
    if (!isEditing) {
      setLocalContent(note.content);
    }
  }, [note.content, isEditing]);

  // Debounced save function
  const debouncedSave = useCallback(
    async (content: string) => {
      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Set new timeout to save after 100ms of no typing (much faster!)
      saveTimeoutRef.current = setTimeout(async () => {
        updateNote(note.id, { content });
        await supabase
          .from("board_objects")
          .update({ content })
          .eq("id", note.id);
      }, 100);
    },
    [note.id, updateNote]
  );

  // Local state for smooth resizing
  const [localSize, setLocalSize] = useState({
    width: note.width,
    height: note.height,
  });
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartSize = useRef({ width: 0, height: 0 });
  const currentSize = useRef({ width: 0, height: 0 });

  // Sync local size with note size when not resizing
  useEffect(() => {
    if (!isResizing) {
      setLocalSize({ width: note.width, height: note.height });
    }
  }, [note.width, note.height, isResizing]);

  // @dnd-kit draggable
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: note.id,
      disabled: isResizing, // Don't drag while resizing
    });

  // Resize handlers using mouse events
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeStartSize.current = { width: note.width, height: note.height };
    currentSize.current = { width: note.width, height: note.height };

    const startX = e.clientX;
    const startY = e.clientY;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault();
      const dx = (moveEvent.clientX - startX) / viewport.zoom;
      const dy = (moveEvent.clientY - startY) / viewport.zoom;

      const newWidth = Math.max(100, resizeStartSize.current.width + dx);
      const newHeight = Math.max(50, resizeStartSize.current.height + dy);

      currentSize.current = { width: newWidth, height: newHeight };
      setLocalSize({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = async (upEvent: MouseEvent) => {
      upEvent.preventDefault();

      // Update store and database with the current size from ref
      updateNote(note.id, {
        width: currentSize.current.width,
        height: currentSize.current.height,
      });
      await supabase
        .from("board_objects")
        .update({
          width: currentSize.current.width,
          height: currentSize.current.height,
        })
        .eq("id", note.id);

      setIsResizing(false);

      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleClick = async (e: React.MouseEvent) => {
    const selectedTool = useStore.getState().selectedTool;

    // Only handle connection logic when arrow tool is selected OR when shift+click in select mode
    if (selectedTool === "arrow" || (e.shiftKey && selectedTool === "select")) {
      // Arrow tool mode: Click to connect notes
      if (selectedTool === "arrow") {
        // Always select the item when clicked
        setSelectedItemId(note.id);

        if (!selectedNoteId) {
          // First note selected
          setSelectedNoteId(note.id);
        } else if (selectedNoteId !== note.id) {
          // Second note selected - create connection
          const { data } = await supabase
            .from("board_connections")
            .insert({
              board_id: note.board_id,
              from_object_id: selectedNoteId,
              to_object_id: note.id,
              color: "#6366f1", // Miro-inspired indigo color
              stroke_width: 2,
            })
            .select()
            .single();

          if (data) addConnection(data);
          setSelectedNoteId(null);

          // Switch back to select after creating connection
          useStore.getState().setSelectedTool("select");
        }
        return; // Don't continue with normal selection logic
      }
    } else {
      // Normal click - just select the item
      setSelectedItemId(note.id);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    // Focus textarea on double-click
    const textarea = e.currentTarget.querySelector("textarea");
    if (textarea) {
      setIsEditing(true);
      textarea.style.pointerEvents = "auto";
      textarea.focus();
    }
  };

  const isConnectionMode = selectedNoteId === note.id;
  const isSelected = propIsSelected ?? selectedItemId === note.id;

  // Calculate transform style
  const style = {
    left: note.x,
    top: note.y,
    width: localSize.width,
    height: localSize.height,
    backgroundColor: note.color,
    touchAction: "none" as const,
    cursor: "default", // Default cursor for the note container
    zIndex: isDragging || isResizing ? 30 : isSelected ? 20 : 10,
    outline: isSelected ? "3px solid var(--accent-primary)" : "none",
    outlineOffset: "2px",
    boxShadow: isConnectionMode
      ? "0 0 0 4px var(--accent-yellow)"
      : isSelected
      ? "var(--hover-shadow)"
      : "var(--shadow)",
    transform: CSS.Transform.toString(transform),
    transition:
      isDragging || isResizing
        ? "none"
        : "box-shadow 0.2s, outline 0.2s, width 0.1s, height 0.1s",
  };

  return (
    <div
      ref={setNodeRef}
      className="note-container absolute p-4 rounded shadow-lg"
      data-note-id={note.id}
      onClick={(e) => {
        handleClick(e);
        if (onClick) onClick(e);
      }}
      onDoubleClick={handleDoubleClick}
      onContextMenu={(e) => onContextMenu(e, note.id)}
      onWheel={(e) => {
        // Allow wheel events to propagate for zooming
        // Don't stop propagation so Canvas can handle zoom
      }}
      style={style}
    >
      {/* Render content based on note type */}
      {note.type === "image" ? (
        <>
          {/* Drag handle for images - covers the entire image */}
          <div
            {...(isResizing ? {} : listeners)}
            {...attributes}
            className="absolute inset-0"
            style={{
              right: isSelected ? 20 : 0,
              bottom: isSelected ? 20 : 0,
              cursor: isDragging ? "grabbing" : isResizing ? "default" : "grab",
              zIndex: 1,
            }}
          />
          <img
            src={note.content}
            alt="Pasted screenshot"
            className="w-full h-full object-contain rounded pointer-events-none"
            style={{
              userSelect: "none",
              imageRendering: "auto",
            }}
            onError={(e) => {
              console.error("Failed to load image:", e);
              e.currentTarget.style.display = "none";
            }}
          />
        </>
      ) : (
        <>
          {/* Drag handle for text notes - only covers border area when editing */}
          {!isEditing && (
            <div
              {...listeners}
              {...attributes}
              className="absolute inset-0"
              style={{
                right: isSelected ? 20 : 0,
                bottom: isSelected ? 20 : 0,
                cursor: isDragging ? "grabbing" : "grab",
                zIndex: 1,
              }}
            />
          )}

          {/* Drag border for text notes when editing - thin border for dragging */}
          {isEditing && (
            <>
              {/* Top border */}
              <div
                {...listeners}
                {...attributes}
                className="absolute top-0 left-0 right-0 h-2"
                style={{
                  cursor: isDragging ? "grabbing" : "grab",
                  zIndex: 1,
                }}
              />
              {/* Left border */}
              <div
                {...listeners}
                {...attributes}
                className="absolute top-0 left-0 bottom-0 w-2"
                style={{
                  cursor: isDragging ? "grabbing" : "grab",
                  zIndex: 1,
                }}
              />
              {/* Right border */}
              <div
                {...listeners}
                {...attributes}
                className="absolute top-0 right-0 bottom-0 w-2"
                style={{
                  right: isSelected ? 18 : 0,
                  cursor: isDragging ? "grabbing" : "grab",
                  zIndex: 1,
                }}
              />
              {/* Bottom border */}
              <div
                {...listeners}
                {...attributes}
                className="absolute bottom-0 left-0 right-0 h-2"
                style={{
                  bottom: isSelected ? 18 : 0,
                  cursor: isDragging ? "grabbing" : "grab",
                  zIndex: 1,
                }}
              />
            </>
          )}

          <textarea
            className="w-full h-full bg-transparent border-none outline-none resize-none"
            value={localContent}
            onChange={(e) => {
              const newContent = e.target.value;
              setLocalContent(newContent);

              // Save immediately on word boundaries (space, enter, punctuation)
              const shouldSaveImmediately = /[ \n.,!?;:()[\]{}"']$/.test(
                newContent.slice(-1)
              );

              if (shouldSaveImmediately) {
                // Clear any pending debounced save
                if (saveTimeoutRef.current) {
                  clearTimeout(saveTimeoutRef.current);
                  saveTimeoutRef.current = null;
                }
                // Save immediately
                updateNote(note.id, { content: newContent });
                supabase
                  .from("board_objects")
                  .update({ content: newContent })
                  .eq("id", note.id);
              } else {
                // Use very short debounce for other characters
                debouncedSave(newContent);
              }
            }}
            onFocus={(e) => {
              setIsEditing(true);
            }}
            onBlur={async (e) => {
              setIsEditing(false);
              // Clear any pending debounced save
              if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
                saveTimeoutRef.current = null;
              }
              // Save immediately on blur
              updateNote(note.id, { content: localContent });
              await supabase
                .from("board_objects")
                .update({ content: localContent })
                .eq("id", note.id);
            }}
            style={{
              color: "var(--text-primary)",
              cursor: "text", // Show text cursor for textarea
              pointerEvents: "auto", // Always allow text interaction
            }}
          />
        </>
      )}

      {/* Resize Handle - Only show when selected */}
      {isSelected && (
        <div
          onMouseDown={handleResizeStart}
          className="absolute resize-handle"
          style={{
            right: -8,
            bottom: -8,
            width: 16,
            height: 16,
            background: "var(--accent-primary)",
            border: "2px solid white",
            borderRadius: "50%",
            cursor: "nwse-resize",
            touchAction: "none",
            zIndex: 1000, // Higher z-index to ensure it's above the drag handle
            boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
          }}
          onMouseOver={(e) => e.stopPropagation()}
          onMouseEnter={(e) => e.stopPropagation()}
        />
      )}
    </div>
  );
}
