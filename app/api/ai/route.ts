import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { AI_PROMPTS } from "@/lib/ai-prompts";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { prompt, boardData, selectedNotes } = await req.json();

    // Build context from board data (limit to prevent token overflow)
    let context = "";
    if (selectedNotes && selectedNotes.length > 0) {
      // Limit selected notes to 20 items and 200 chars each
      const limitedNotes = selectedNotes
        .slice(0, 20)
        .map((note: any) => note.content.substring(0, 200));
      context = `Selected notes:\n${limitedNotes
        .map((content: string, i: number) => `${i + 1}. ${content}`)
        .join("\n")}`;
    } else if (boardData && boardData.length > 0) {
      // Limit board data to 30 items and 150 chars each
      const limitedData = boardData
        .slice(0, 30)
        .map((note: any) => note.content.substring(0, 150));
      context = `All board notes (showing first ${
        limitedData.length
      }):\n${limitedData
        .map((content: string, i: number) => `${i + 1}. ${content}`)
        .join("\n")}`;
    }

    // Determine if the user wants to modify the board
    const shouldModifyBoard = AI_PROMPTS.modifyKeywords.some((keyword) =>
      prompt.toLowerCase().includes(keyword)
    );

    // Build system prompt using the prompts file
    const systemPrompt = shouldModifyBoard
      ? AI_PROMPTS.createNotes(context)
      : AI_PROMPTS.analyze(context);

    // Call Groq API with Llama 3.3
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 1024, // Reduced to save tokens
    });

    const response = completion.choices[0]?.message?.content || "";

    // Try to parse as JSON if it looks like board modifications
    if (shouldModifyBoard) {
      try {
        // Extract JSON from markdown code blocks if present
        let jsonStr = response;
        const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          jsonStr = jsonMatch[1];
        }

        const parsed = JSON.parse(jsonStr);
        if (parsed.action === "create_notes" && Array.isArray(parsed.notes)) {
          return NextResponse.json({
            action: "create_notes",
            notes: parsed.notes,
          });
        }
      } catch (e) {
        // If parsing fails, treat as regular text response
        console.log("Failed to parse as JSON, treating as text response");
      }
    }

    // Return as text response
    return NextResponse.json({
      action: "text",
      content: response,
    });
  } catch (error: any) {
    console.error("AI API Error:", error);

    // Handle rate limit errors specifically
    if (
      error.message?.includes("rate_limit_exceeded") ||
      error.status === 429
    ) {
      return NextResponse.json(
        {
          error:
            "AI rate limit reached. Please try again later or use a shorter prompt.",
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to process AI request" },
      { status: 500 }
    );
  }
}
