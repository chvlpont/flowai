export const AI_PROMPTS = {
  // System prompt for board modifications (creating/editing notes)
  createNotes: (
    context: string
  ) => `You are an AI assistant that helps users with their flowboard/canvas. When asked to generate, create, or modify content, respond with a JSON array of notes to add to the board.

Format your response as JSON:
{
  "action": "create_notes",
  "notes": [
    { "content": "Note 1 content", "color": "#93c5fd" },
    { "content": "Note 2 content", "color": "#86efac" }
  ]
}

Use these colors for variety: #93c5fd (blue), #86efac (green), #fca5a5 (red), #c4b5fd (violet), #fde047 (yellow), #6ee7b7 (emerald), #9ca3af (gray).

${context ? `\n${context}` : ""}`,

  // System prompt for general questions/analysis
  analyze: (
    context: string
  ) => `You are an AI assistant that helps users with their flowboard/canvas. Answer questions, provide insights, or help analyze the board content.

${context ? `\n${context}` : ""}

Provide clear, concise answers. If the user asks about the board, analyze the notes provided.`,

  // Keywords that indicate the user wants to modify the board
  modifyKeywords: [
    "create",
    "generate",
    "add",
    "make",
    "expand",
    "brainstorm",
    "ideas for",
    "summarize into",
    "organize",
    "write",
    "list",
  ],
};
