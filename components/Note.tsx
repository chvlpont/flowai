"use client";

import { useState, useRef } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useStore } from "@/store";
import { supabase } from "@/lib/supabase";

interface NoteProps {
  note: any;
  onContextMenu: (e: React.MouseEvent, id: string) => void;
  onClick?: () => void;
}

export function Note({ note, onContextMenu, onClick }: NoteProps) {
  const updateNote = useStore((s) => s.updateNote);
  const selectedNoteId = useStore((s) => s.selectedNoteId);
  const setSelectedNoteId = useStore((s) => s.setSelectedNoteId);
  const selectedItemId = useStore((s) => s.selectedItemId);
  const setSelectedItemId = useStore((s) => s.setSelectedItemId);
  const addConnection = useStore((s) => s.addConnection);
  const viewport = useStore((s) => s.viewport);

  // Local state for smooth resizing
  const [resizeOffset, setResizeOffset] = useState({ width: 0, height: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartSize = useRef({ width: 0, height: 0 });

  // @dnd-kit draggable
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: note.id,
      disabled: isResizing, // Don't drag while resizing
    });

  // Resize handlers using mouse events
  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    resizeStartSize.current = { width: note.width, height: note.height };

    const startX = e.clientX;
    const startY = e.clientY;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = (moveEvent.clientX - startX) / viewport.zoom;
      const dy = (moveEvent.clientY - startY) / viewport.zoom;

      const newWidth = Math.max(100, resizeStartSize.current.width + dx);
      const newHeight = Math.max(50, resizeStartSize.current.height + dy);

      setResizeOffset({
        width: newWidth - note.width,
        height: newHeight - note.height,
      });
    };

    const handleMouseUp = async () => {
      const newWidth = Math.max(100, note.width + resizeOffset.width);
      const newHeight = Math.max(50, note.height + resizeOffset.height);

      // Update store and database
      updateNote(note.id, { width: newWidth, height: newHeight });
      await supabase
        .from("board_objects")
        .update({ width: newWidth, height: newHeight })
        .eq("id", note.id);

      setResizeOffset({ width: 0, height: 0 });
      setIsResizing(false);

      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleClick = async (e: React.MouseEvent) => {
    // Always select the item when clicked
    setSelectedItemId(note.id);

    if (e.shiftKey) {
      // Connection mode: Shift + Click
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
            color: "#000000",
            stroke_width: 2,
          })
          .select()
          .single();

        if (data) addConnection(data);
        setSelectedNoteId(null);
      }
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    // Focus textarea on double-click
    const textarea = e.currentTarget.querySelector("textarea");
    if (textarea) {
      textarea.style.pointerEvents = "auto";
      textarea.focus();
    }
  };

  const isConnectionMode = selectedNoteId === note.id;
  const isSelected = selectedItemId === note.id;

  // Calculate transform style
  const style = {
    left: note.x,
    top: note.y,
    width: isResizing ? note.width + resizeOffset.width : note.width,
    height: isResizing ? note.height + resizeOffset.height : note.height,
    backgroundColor: note.color,
    touchAction: "none" as const,
    cursor: isDragging ? "grabbing" : "grab",
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
      {...listeners}
      {...attributes}
      onClick={(e) => {
        handleClick(e);
        if (onClick) onClick();
      }}
      onDoubleClick={handleDoubleClick}
      onContextMenu={(e) => onContextMenu(e, note.id)}
      className="absolute p-4 rounded shadow-lg"
      style={style}
    >
      <textarea
        className="w-full h-full bg-transparent border-none outline-none resize-none"
        defaultValue={note.content}
        onFocus={(e) => {
          // When focused, allow text selection
          e.currentTarget.style.pointerEvents = "auto";
        }}
        onBlur={(e) => {
          updateNote(note.id, { content: e.target.value });
          supabase
            .from("board_objects")
            .update({ content: e.target.value })
            .eq("id", note.id)
            .then();
          // When not focused, allow dragging through
          e.currentTarget.style.pointerEvents = "none";
        }}
        style={{
          color: "var(--text-primary)",
          pointerEvents: "none", // Start with none to allow dragging
        }}
      />

      {/* Resize Handle - Only show when selected */}
      {isSelected && (
        <div
          onMouseDown={handleResizeStart}
          className="absolute resize-handle"
          style={{
            right: -4,
            bottom: -4,
            width: 16,
            height: 16,
            background: "var(--accent-primary)",
            border: "2px solid white",
            borderRadius: "50%",
            cursor: "nwse-resize",
            touchAction: "none",
            zIndex: 100,
            boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
          }}
        />
      )}
    </div>
  );
}
