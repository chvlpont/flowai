"use client";

import { useEffect, useRef } from "react";
import { Trash2, Copy, Palette } from "lucide-react";

interface ContextMenuProps {
  x: number;
  y: number;
  selectedItemsCount?: number;
  onClose: () => void;
  onDelete: () => void;
  onDuplicate?: () => void;
  onChangeColor?: () => void;
}

export function ContextMenu({
  x,
  y,
  selectedItemsCount = 1,
  onClose,
  onDelete,
  onDuplicate,
  onChangeColor,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  const menuItems = [
    {
      icon: Trash2,
      label:
        selectedItemsCount > 1
          ? `Delete ${selectedItemsCount} items`
          : "Delete",
      shortcut: "Del",
      onClick: () => {
        onDelete();
        onClose();
      },
      danger: true,
    },
    ...(onDuplicate
      ? [
          {
            icon: Copy,
            label: "Duplicate",
            shortcut: "Ctrl+D",
            onClick: () => {
              onDuplicate();
              onClose();
            },
            danger: false,
          },
        ]
      : []),
    ...(onChangeColor
      ? [
          {
            icon: Palette,
            label: "Change Color",
            shortcut: "",
            onClick: () => {
              onChangeColor();
              onClose();
            },
            danger: false,
          },
        ]
      : []),
  ];

  return (
    <div
      ref={menuRef}
      className="fixed z-[100] rounded-lg shadow-lg py-1 min-w-[180px]"
      style={{
        left: x,
        top: y,
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      }}
    >
      {menuItems.map((item, index) => {
        const Icon = item.icon;
        return (
          <button
            key={index}
            onClick={item.onClick}
            className="w-full px-3 py-2 flex items-center gap-3 text-sm transition-colors"
            style={{
              color: item.danger ? "var(--accent-red)" : "var(--text-primary)",
              background: "transparent",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--bg-muted)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            <Icon size={16} />
            <span className="flex-1 text-left">{item.label}</span>
            {item.shortcut && (
              <span
                className="text-xs"
                style={{ color: "var(--text-secondary)" }}
              >
                {item.shortcut}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
