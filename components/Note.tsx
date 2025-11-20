"use client";

import { useState } from "react";
import { useDrag } from "@use-gesture/react";
import { useStore } from "@/store";
import { supabase } from "@/lib/supabase";

interface NoteProps {
  note: any;
  onContextMenu: (e: React.MouseEvent, id: string) => void;
}

export function Note({ note, onContextMenu }: NoteProps) {
  const updateNote = useStore((s) => s.updateNote);
  const selectedNoteId = useStore((s) => s.selectedNoteId);
  const setSelectedNoteId = useStore((s) => s.setSelectedNoteId);
  const selectedItemId = useStore((s) => s.selectedItemId);
  const setSelectedItemId = useStore((s) => s.setSelectedItemId);
  const addConnection = useStore((s) => s.addConnection);
  const viewport = useStore((s) => s.viewport);

  // Local state for smooth dragging
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  // Local state for smooth resizing
  const [resizeOffset, setResizeOffset] = useState({ width: 0, height: 0 });
  const [isResizing, setIsResizing] = useState(false);

  const bind = useDrag(
    ({ offset: [x, y], last, active, event }) => {
      // Don't drag if clicking on resize handle
      const target = event?.target as HTMLElement;
      if (target?.classList.contains('resize-handle')) {
        return;
      }

      if (active && !isResizing) {
        // During drag: only update local transform (fast!)
        setIsDragging(true);
        setDragOffset({ x: x - note.x, y: y - note.y });
      }

      if (last) {
        // On drag end: update store and database
        setIsDragging(false);
        setDragOffset({ x: 0, y: 0 });
        updateNote(note.id, { x, y });

        supabase
          .from("board_objects")
          .update({ x, y })
          .eq("id", note.id)
          .then();
      }
    },
    {
      from: () => [note.x, note.y],
      filterTaps: true,
    }
  );

  // Resize handler
  const bindResize = useDrag(
    ({ offset: [x, y], last, active }) => {
      if (active) {
        // During resize: only update local size (fast!)
        setIsResizing(true);
        const newWidth = Math.max(100, note.width + x);
        const newHeight = Math.max(50, note.height + y);
        setResizeOffset({
          width: newWidth - note.width,
          height: newHeight - note.height,
        });
      }

      if (last) {
        // On resize end: update store and database
        setIsResizing(false);
        const newWidth = Math.max(100, note.width + resizeOffset.width);
        const newHeight = Math.max(50, note.height + resizeOffset.height);
        setResizeOffset({ width: 0, height: 0 });

        updateNote(note.id, { width: newWidth, height: newHeight });

        supabase
          .from("board_objects")
          .update({ width: newWidth, height: newHeight })
          .eq("id", note.id)
          .then();
      }
    },
    {
      from: () => [0, 0],
      filterTaps: true,
    }
  );

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

  return (
    <div
      {...bind()}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={(e) => onContextMenu(e, note.id)}
      className="absolute p-4 rounded shadow-lg"
      style={{
        left: note.x,
        top: note.y,
        width: isResizing
          ? note.width + resizeOffset.width
          : note.width,
        height: isResizing
          ? note.height + resizeOffset.height
          : note.height,
        backgroundColor: note.color,
        touchAction: "none",
        cursor: isDragging ? "grabbing" : "grab",
        zIndex: isDragging || isResizing ? 30 : isSelected ? 20 : 10,
        outline: isSelected ? "3px solid var(--accent-primary)" : "none",
        outlineOffset: "2px",
        boxShadow: isConnectionMode
          ? "0 0 0 4px var(--accent-yellow)"
          : isSelected
          ? "var(--hover-shadow)"
          : "var(--shadow)",
        transform: isDragging
          ? `translate(${dragOffset.x}px, ${dragOffset.y}px)`
          : "none",
        transition: isDragging || isResizing ? "none" : "box-shadow 0.2s, outline 0.2s, width 0.1s, height 0.1s",
      }}
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
          {...bindResize()}
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
