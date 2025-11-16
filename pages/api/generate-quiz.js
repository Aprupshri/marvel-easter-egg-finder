// pages/api/generate-quiz.js
import { db } from "../../firebase";
import { doc, setDoc, collection, query, where, getDocs, limit } from "firebase/firestore";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

async function callGeminiAPI(payload) {
  const response = await fetch(GEMINI_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Gemini API error: ${response.status}`);
  return response.json();
}

async function getUsedQuestions() {
  const q = query(collection(db, "quizzes"));
  const snap = await getDocs(q);
  const questions = new Set();
  snap.docs.forEach((d) => {
    const quiz = d.data().quiz || [];
    quiz.forEach((q) => {
      const normalized = q.question.toLowerCase().trim();
      questions.add(normalized);
    });
  });
  return questions;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const usedQuestions = await getUsedQuestions();
    const excludeList = Array.from(usedQuestions).slice(0, 50); // Limit context size

    const model = "gemini-2.0-flash";
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

Return ONLY the JSON array of 5 questions, no markdown, no extra text.

IMPORTANT: NONE of these questions can be similar to or repeat any of the following used questions:
${excludeList.map((q, i) => `${i + 1}. "${q}"`).join("\n") || "None yet."}

Make questions moderately difficult — avoid overly easy ones like "Who played Iron Man?" or "What color is Hulk?"`,
            },
          ],
        },
      ],
      systemInstruction: {
        parts: [
          {
            text: `You are a Marvel Cinematic Universe trivia expert. Create exactly 5 unique, moderately difficult multiple-choice questions about MCU movies, characters, scenes, Easter eggs, or plot details. Each question must have exactly 4 options and exactly one correct answer. 

CRITICAL: Do NOT repeat or closely rephrase any question from the user's "used questions" list. Generate fresh, original questions only.

Output must be a valid JSON array of objects with keys: question, options, correct. No explanations, no markdown, no additional text.`,
          },
        ],
      },
    };

    let quiz;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      const result = await callGeminiAPI(payload);
      const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!responseText) throw new Error("Empty response from Gemini");

      const cleanedText = responseText.replace(/```json\n?|```/g, "").trim();
      try {
        quiz = JSON.parse(cleanedText);
        if (!Array.isArray(quiz) || quiz.length !== 5) throw new Error("Invalid format");

        // Validate uniqueness
        const hasDuplicate = quiz.some((q) => {
          const norm = q.question.toLowerCase().trim();
          return usedQuestions.has(norm);
        });

        if (!hasDuplicate) break;
      } catch (e) {
        console.warn("Parse/validation failed, retrying...", e);
      }
      attempts++;
    }

    if (!quiz || quiz.length !== 5) {
      return res.status(500).json({ error: "Failed to generate unique quiz after retries." });
    }

    const quizId = Date.now().toString();
    await setDoc(doc(db, "quizzes", quizId), {
      quiz,
      createdAt: new Date(),
    });

    return res.status(200).json({ quiz, quizId });
  } catch (error) {
    console.error("Error in generate-quiz:", error);
    return res.status(500).json({ error: "Failed to generate quiz." });
  }
}