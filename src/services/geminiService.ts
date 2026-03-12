import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function analyzeRoomImage(base64Image: string, mimeType: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: {
      parts: [
        {
          inlineData: {
            data: base64Image,
            mimeType: mimeType,
          },
        },
        {
          text: "Analyze this room. Provide specific, actionable organization and decluttering suggestions. Break it down into: 1. Quick Wins (takes < 15 mins), 2. Weekend Projects, 3. Storage Solutions, and 4. General Observations.",
        },
      ],
    },
  });

  return response.text || "Could not generate analysis.";
}

export async function chatWithGemini(history: { role: 'user' | 'model', text: string }[], message: string, base64Image?: string, mimeType?: string): Promise<string> {
  const parts: any[] = [];
  
  if (base64Image && mimeType) {
    parts.push({
      inlineData: {
        data: base64Image,
        mimeType: mimeType,
      },
    });
  }
  
  parts.push({ text: message });

  // Convert history to the format expected by the API if needed, 
  // but for simplicity, we can just pass the whole context as a new prompt 
  // or use the chat session. Let's use chat session.

  const chat = ai.chats.create({
    model: "gemini-3.1-pro-preview",
    config: {
      systemInstruction: "You are an expert home organizer and interior designer. Help the user declutter and organize their space. Be encouraging, practical, and specific.",
    },
    // We need to pass history if we want to maintain context.
    // The @google/genai SDK chat creation doesn't take history directly in create() in the same way, 
    // actually it might, but let's just send the message. Wait, to maintain history, we should keep the chat instance.
  });

  // If we can't keep the chat instance easily in React state without re-creating it,
  // we can just send the history as part of the prompt for a single generateContent call,
  // OR we can create a chat instance and send the history.
  // Let's use generateContent with history formatted as text for simplicity, or just use the chat API properly.
  
  // Actually, let's just use generateContent and pass the history as a formatted string for simplicity,
  // or use the chat API if we can instantiate it.
  
  const formattedHistory = history.map(msg => `${msg.role === 'user' ? 'User' : 'Organizer'}: ${msg.text}`).join('\n\n');
  const fullPrompt = `Previous conversation:\n${formattedHistory}\n\nUser: ${message}\nOrganizer:`;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: {
      parts: [
        ...(base64Image && mimeType ? [{ inlineData: { data: base64Image, mimeType } }] : []),
        { text: fullPrompt }
      ]
    },
    config: {
      systemInstruction: "You are an expert home organizer and interior designer. Help the user declutter and organize their space. Be encouraging, practical, and specific. Respond directly to the user's latest message.",
    }
  });

  return response.text || "Could not generate response.";
}
