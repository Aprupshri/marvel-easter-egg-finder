// pages/api/generate-quiz.js
import { db } from "../../firebase";
import {
  doc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  limit,
  orderBy,
  getDoc,
} from "firebase/firestore";
// import { adminAuth } from "../../firebaseAdmin";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

async function callGeminiAPI(payload) {
  const response = await fetch(GEMINI_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }
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

async function getUserPlayedQuizIds(userId) {
  // CORRECT: Use your actual subcollection name
  const snap = await getDoc(doc(db, "users", userId));
  return snap.exists() ? snap.data().quizzes : [];
}

async function getAvailableQuiz(userId) {
  const playedIds = await getUserPlayedQuizIds(userId);
  const playedSet = new Set(playedIds);

  if (playedSet.size === 0) {
    // console.log("[DEBUG] User has no played quizzes. Returning oldest.");
    const oldestQuery = query(
      collection(db, "quizzes"),
      orderBy("createdAt", "asc"),
      limit(1)
    );
    const snap = await getDocs(oldestQuery);
    if (!snap.empty) {
      const doc = snap.docs[0];
      // console.log(`[DEBUG] Returning oldest quiz: ${doc.id}`);
      return { id: doc.id, ...doc.data() };
    }
  }

  // console.log(
  //   `[DEBUG] User has played ${playedSet.size} quizzes. Finding unplayed...`
  // );
  const allQuizzesQuery = query(
    collection(db, "quizzes"),
    orderBy("createdAt", "asc")
  );
  const allSnap = await getDocs(allQuizzesQuery);
  for (const doc of allSnap.docs) {
    if (!playedSet.has(doc.id)) {
      // console.log(`[DEBUG] Found unplayed quiz: ${doc.id}`);
      return { id: doc.id, ...doc.data() };
    }
  }

  // console.log("[DEBUG] No unplayed quizzes found. Generating new one.");
  return null;
}

async function generateNewQuiz() {
  const usedQuestions = await getUsedQuestions();
  const excludeList = Array.from(usedQuestions).slice(0, 50);

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

Make questions moderate — avoid overly easy ones, The answers must be verifiable. `,
          },
        ],
      },
    ],
    systemInstruction: {
      parts: [
        {
          text: `You are a Marvel Cinematic Universe trivia expert. Create exactly 5 unique, multiple-choice questions. Each must have exactly 4 options and one correct answer.

CRITICAL: Do NOT repeat or rephrase any question from the used list.

Output: valid JSON array of objects with keys: question, options, correct. No extra text.`,
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
    if (!responseText) throw new Error("Empty response");

    const cleanedText = responseText.replace(/```json\n?|```/g, "").trim();
    try {
      quiz = JSON.parse(cleanedText);
      if (!Array.isArray(quiz) || quiz.length !== 5)
        throw new Error("Invalid format");

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
    throw new Error("Failed to generate unique quiz after retries.");
  }

  const quizId = Date.now().toString();
  await setDoc(doc(db, "quizzes", quizId), {
    quiz,
    createdAt: new Date(),
  });

  return { quiz, quizId };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // const authHeader = req.headers.authorization;
  // if (!authHeader?.startsWith("Bearer ")) {
  //   return res.status(401).json({ error: "Unauthorized" });
  // }

  // const idToken = authHeader.split("Bearer ")[1];

  let { userId } = req.body;
  // try {
  //   const decoded = await adminAuth.verifyIdToken(idToken);
  //   userId = decoded.uid;
  // } catch (error) {
  //   console.error("Token verification failed:", error);
  //   return res.status(401).json({ error: "Invalid token" });
  // }

  try {
    const existing = await getAvailableQuiz(userId);
    if (existing) {
      return res.status(200).json({
        quiz: existing.quiz,
        quizId: existing.id,
        reused: true,
      });
    }

    const { quiz, quizId } = await generateNewQuiz();

    return res.status(200).json({
      quiz,
      quizId,
      reused: false,
    });
  } catch (error) {
    console.error("Error in generate-quiz:", error);
    return res.status(500).json({
      error: "Failed to get quiz.",
      details: error.message,
    });
  }
}
