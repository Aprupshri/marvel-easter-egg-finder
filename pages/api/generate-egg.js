// pages/api/generate-egg.js
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

  const { action, query, context } = req.body;

  try {
    let payload;
    let result;
    const textModel = "gemini-2.5-flash-preview-05-20";
    const audioModel = "gemini-2.5-flash-preview-tts";

    switch (action) {
      case "find":
        payload = {
          contents: [
            {
              parts: [
                { text: `Find an MCU easter egg related to: "${query}"` },
              ],
            },
          ],
          systemInstruction: {
            parts: [
              {
                text: `You are a Marvel Cinematic Universe expert. Your task is to find a single, specific, and verifiable Easter egg based on a user's query. You must respond ONLY with a JSON object in the format \`{"title": "A short, catchy title for the Easter egg", "description": "A detailed paragraph describing the Easter egg, the scene it appears in, and its significance."}\`. Do not include any other text, greetings, or explanations outside of the JSON object. If you cannot find a specific Easter egg for the query, respond with the JSON object \`{"error": "I could not find a specific Easter egg for that term in my database. Try being more specific or using a different keyword."}\`.`,
              },
            ],
          },
        };
        result = await callGeminiAPI(payload, textModel);
        const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;
        const cleanedText = responseText.replace(/```json\n?|```/g, "").trim();
        return res.status(200).json(JSON.parse(cleanedText));

      case "explain":
        payload = {
          contents: [{ parts: [{ text: `The Easter egg is: ${context}` }] }],
          systemInstruction: {
            parts: [
              {
                text: "You are a friendly comic book expert. Explain the following movie Easter egg in a simple and fun way. Keep it to one short paragraph.",
              },
            ],
          },
        };
        result = await callGeminiAPI(payload, textModel);
        return res
          .status(200)
          .json({ text: result.candidates?.[0]?.content?.parts?.[0]?.text });

      case "whatif":
        payload = {
          contents: [{ parts: [{ text: `The Easter egg is: ${context}` }] }],
          systemInstruction: {
            parts: [
              {
                text: "You are a creative writer for Marvel's 'What If...?' series. Based on the following movie Easter egg, write a short, exciting 'What If...?' scenario in a single paragraph, keep it concise. Start your response with 'What If...?' and be creative and dramatic.",
              },
            ],
          },
        };
        result = await callGeminiAPI(payload, textModel);
        return res
          .status(200)
          .json({ text: result.candidates?.[0]?.content?.parts?.[0]?.text });

      case "listen":
        payload = {
          contents: [
            {
              parts: [
                {
                  text: `Say in a knowledgeable, slightly proper and a neutral but enthusiastic way: ${context}`,
                },
              ],
            },
          ],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } },
            },
          },
        };
        result = await callGeminiAPI(payload, audioModel);
        const audioData =
          result.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (audioData) {
          return res.status(200).json({ audio: audioData });
        } else {
          throw new Error("No audio data in TTS response.");
        }

      default:
        return res.status(400).json({ error: "Invalid action specified." });
    }
  } catch (error) {
    console.error(`Error in action '${action}':`, error);
    return res
      .status(500)
      .json({ error: "An internal server error occurred." });
  }
}