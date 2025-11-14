// pages/api/generate-quiz.js
import { GoogleGenerativeAI } from "@google/generative-ai";

const allowedOrigins = [
  "http://localhost:3000",
  process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`,
  "https://marvel-easter-egg-finder.vercel.app",
].filter(Boolean);

async function callGeminiAPI(payload, model) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in environment variables.");
  }

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(`Gemini API Error (${model}):`, await response.text());
      throw new Error(`Failed to fetch from Gemini API model: ${model}.`);
    }

    return await response.json();
  } catch (error) {
    console.error(`callGeminiAPI Error (${model}):`, error);
    throw error;
  }
}

export default async function handler(req, res) {
  const origin = req.headers.origin;
  if (origin && !allowedOrigins.includes(origin)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const model = "gemini-2.5-flash-preview-05-20";
    const payload = {
      contents: [
        {
          parts: [
            {
              text: `Generate a 5-question Marvel Cinematic Universe quiz in JSON format.
Each question must have:
- question (string)
- options (array of 4 strings)
- correct (index 0-3)

Return ONLY the JSON array of 5 questions, no markdown, no extra text.`,
            },
          ],
        },
      ],
      systemInstruction: {
        parts: [
          {
            text: `You are a Marvel Cinematic Universe trivia expert. Create exactly 5 multiple-choice questions about MCU movies, characters, scenes, or Easter eggs. Each question must have exactly 4 options and exactly one correct answer. Output must be a valid JSON array of objects with keys: question, options, correct. No explanations, no markdown, no additional text.`,
          },
        ],
      },
    };

    const result = await callGeminiAPI(payload, model);
    const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    const cleanedText = responseText.replace(/```json\n?|```/g, "").trim();
    const quiz = JSON.parse(cleanedText);

    return res.status(200).json({ quiz });
  } catch (error) {
    console.error("Error in generate-quiz:", error);
    return res.status(500).json({ error: "Failed to generate quiz." });
  }
}