// pages/api/save-quiz.js
import { db } from "../../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { getMarvelName } from "../../utils/getMarvelName";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  let { quizId, score, userId, userName } = req.body;
  if (!quizId || score === undefined || !userId) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // Update user's total score and quiz count
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.exists()
      ? userSnap.data()
      : { userName: "", totalScore: 0, quizzes: [] };

    // Check previous play
    const playRef = doc(db, "quizzes", quizId, "plays", userId);
    const playSnap = await getDoc(playRef);
    let scoreToAdd = score;

    if (playSnap.exists()) {
      const previousScore = playSnap.data().score;
      scoreToAdd = score - previousScore; // Only add difference
    }

    if (scoreToAdd > 0) {
      await setDoc(
        userRef,
        {
          userName: getMarvelName(userData.userName || userName),
          totalScore: userData.totalScore + scoreToAdd,
          quizzes: Array.isArray(userData.quizzes) ? [...userData.quizzes, quizId] : [quizId],
        },
        { merge: true }
      );
    }

    // Save/update quiz play
    await setDoc(playRef, { score, timestamp: new Date() }, { merge: true });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Save quiz error:", error);
    return res.status(500).json({ error: "Failed to save quiz" });
  }
}