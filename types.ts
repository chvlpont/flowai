export interface Profile {
  id: string;
  display_name?: string;
  created_at: string;
  username: string;
  email: string;
}

export interface Board {
  id: string;
  title: string;
  owner_id: string;
  created_at: string;
}

export interface BoardObject {
  id: string;
  board_id: string;
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

export interface BoardConnection {
  id: string;
  board_id: string;
  from_object_id: string;
  to_object_id: string;
  color: string;
  stroke_width: number;
}

export interface BoardCollaborator {
  board_id: string;
  user_id: string;
  role: "viewer" | "editor";
  joined_at: string;
}

export interface BoardInvite {
  id: string;
  board_id: string;
  invite_code: string;
  expires_at?: string;
  max_uses?: number;
  current_uses: number;
}

export interface BoardPresence {
  user_id: string;
  display_name: string;
  cursor_x: number;
  cursor_y: number;
  color: string;
}

export interface BoardStroke {
  id: string;
  board_id: string;
  created_by: string;
  color: string;
  stroke_width: number;
  points: { x: number; y: number }[];
  created_at: string;
}

// Backward compatibility aliases for existing code
export type Note = BoardObject;
export type Connection = BoardConnection;
export type Collaborator = BoardCollaborator;
export type Invite = BoardInvite;
export type Cursor = BoardPresence;
export type Stroke = BoardStroke;
