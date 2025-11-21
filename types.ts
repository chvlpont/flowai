export interface Profile {
  id: string;
  display_name?: string;
  created_at: string;
  username: string;
  email: string;
}

export interface Note {
  id: string;
  board_id: string;
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

export interface Connection {
  id: string;
  board_id: string;
  from_object_id: string;
  to_object_id: string;
  color: string;
  stroke_width: number;
}

export interface Collaborator {
  board_id: string;
  user_id: string;
  role: "viewer" | "editor";
  joined_at: string;
}

export interface Invite {
  id: string;
  board_id: string;
  invite_code: string;
  expires_at?: string;
  max_uses?: number;
  current_uses: number;
}

export interface Cursor {
  user_id: string;
  display_name: string;
  cursor_x: number;
  cursor_y: number;
  color: string;
}

export interface Stroke {
  id: string;
  board_id: string;
  created_by: string;
  color: string;
  stroke_width: number;
  points: { x: number; y: number }[];
  created_at: string;
}
