// pages/quiz/index.js
import { useState, useEffect } from "react";
import { db, auth } from "../../firebase";
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  getDoc,
  doc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import QuizPlayer from "../../components/QuizPlayer";
import Navbar from "../../components/Navbar";

export default function QuizArena() {
  const [user, setUser] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [quizId, setQuizId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [globalLeaderboard, setGlobalLeaderboard] = useState([]);
  const [quizLeaderboard, setQuizLeaderboard] = useState([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser);
    return () => unsub();
  }, []);

  useEffect(() => {
    fetchGlobalLeaderboard();
  }, []);

  useEffect(() => {
    if (quizId) fetchQuizLeaderboard();
  }, [quizId]);

  const fetchGlobalLeaderboard = async () => {
    const q = query(
      collection(db, "users"),
      orderBy("totalScore", "desc"),
      limit(10)
    );
    const snap = await getDocs(q);
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    setGlobalLeaderboard(data);
  };

  const fetchQuizLeaderboard = async () => {
    const q = query(
      collection(db, "quizzes", quizId, "plays"),
      orderBy("score", "desc"),
      limit(10)
    );
    const snap = await getDocs(q);
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const enriched = await Promise.all(
      data.map(async (entry) => {
        if (entry.id === "anonymous") return { ...entry, name: "Anonymous" };
        const userDoc = await getDoc(doc(db, "users", entry.id));
        const rawName = userDoc.data()?.userName || "Unknown";
        return { ...entry, name: getMarvelName(rawName) };
      })
    );
    setQuizLeaderboard(enriched);
  };

  const generateQuiz = async () => {
    if (!user) {
      alert("Please log in to play");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/generate-quiz", { method: "POST" });
      const { quiz, quizId } = await res.json();
      setQuizId(quizId);
      setQuiz(quiz);
    } catch (e) {
      alert("Failed to generate quiz");
    } finally {
      setLoading(false);
    }
  };

  const handleQuizComplete = async (score) => {
    if (!user || !quizId) return;

    try {
      await fetch("/api/save-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quizId,
          score,
          userId: user.uid,
          userName: user.displayName || "Guest",
        }),
      });
      fetchQuizLeaderboard();
      fetchGlobalLeaderboard();
    } catch (error) {
      console.error("Failed to save quiz:", error);
    }
  };

  const clearQuiz = () => {
    setQuiz(null);
    setQuizId(null);
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-purple-900 to-blue-900 p-4">
        <div className="max-w-4xl mx-auto pt-20">
          <header className="text-center mb-8">
            <h1 className="text-5xl font-black text-white">
              Marvel Quiz Arena
            </h1>
            <p className="text-blue-200 mt-2">Test your MCU knowledge!</p>
          </header>

          {!quiz ? (
            <div className="text-center">
              <button
                onClick={generateQuiz}
                disabled={loading}
                className="bg-green-600 hover:bg-green-500 text-white font-bold py-4 px-8 rounded-xl text-xl btn-glow"
              >
                {loading ? "Generating..." : "Generate Quiz"}
              </button>
            </div>
          ) : (
            <>
              <QuizPlayer
                quiz={quiz}
                onComplete={handleQuizComplete}
                clearQuiz={clearQuiz}
                shareUrl={`/quiz/${quizId}`}
              />

              {quizLeaderboard.length > 0 && (
                <div className="mt-12 bg-gray-800 rounded-xl p-6">
                  <h3 className="text-2xl font-bold text-white mb-4">
                    This Quiz Leaderboard
                  </h3>
                  <div className="space-y-2">
                    {quizLeaderboard.map((u, i) => (
                      <div
                        key={u.id}
                        className="flex justify-between text-white"
                      >
                        <span>
                          {i + 1}. {u.name}
                        </span>
                        <span className="font-bold">{u.score} pts</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          <div className="mt-12 bg-gray-800 rounded-xl p-6">
            <h3 className="text-2xl font-bold text-white mb-4">
              Global Leaderboard
            </h3>
            <div className="space-y-2">
              {globalLeaderboard.map((u, i) => (
                <div key={u.id} className="flex justify-between text-white">
                  <span>
                    {i + 1}. {u.userName}
                  </span>
                  <span className="font-bold">{u.totalScore} pts</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}