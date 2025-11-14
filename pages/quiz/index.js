// pages/quiz/index.js
import { useState, useEffect } from "react";
import { db } from "../../firebase";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import QuizPlayer from "../../components/QuizPlayer";
import Navbar from "../../components/Navbar";
import Link from "next/link";

export default function QuizArena() {
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(false);
  const [quizId, setQuizId] = useState(null);
  const [globalLeaderboard, setGlobalLeaderboard] = useState([]);
  const [quizLeaderboard, setQuizLeaderboard] = useState([]);

  useEffect(() => {
    fetchGlobalLeaderboard();
  }, []);

  useEffect(() => {
    if (quizId) fetchQuizLeaderboard();
  }, [quizId]);

  const fetchGlobalLeaderboard = async () => {
    const q = query(collection(db, "users"), orderBy("totalScore", "desc"), limit(10));
    const snap = await getDocs(q);
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    setGlobalLeaderboard(data);
  };

  const fetchQuizLeaderboard = async () => {
    const q = query(collection(db, "quizzes", quizId, "plays"), orderBy("score", "desc"), limit(10));
    const snap = await getDocs(q);
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const enriched = await Promise.all(data.map(async (entry) => {
      if (entry.id === "anonymous") return { ...entry, name: "Anonymous" };
      const userDoc = await getDoc(doc(db, "users", entry.id));
      return { ...entry, name: userDoc.data()?.name || "Unknown" };
    }));
    setQuizLeaderboard(enriched);
  };

  const generateQuiz = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/generate-quiz", { method: "POST" });
      const { quiz } = await res.json();
      const id = Date.now().toString();
      setQuizId(id);
      setQuiz(quiz);
    } catch (e) {
      alert("Failed to generate quiz");
    } finally {
      setLoading(false);
    }
  };

  const handleQuizComplete = async (score) => {
    if (quizId) {
      await fetch("/api/save-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizId, score }),
      });
      fetchQuizLeaderboard();
      fetchGlobalLeaderboard();
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-purple-900 to-blue-900 p-4">
        <div className="max-w-4xl mx-auto pt-20">
          <header className="text-center mb-8">
            <h1 className="text-5xl font-black text-white">Marvel Quiz Arena</h1>
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
              <QuizPlayer quiz={quiz} onComplete={handleQuizComplete} />

              {quizLeaderboard.length > 0 && (
                <div className="mt-12 bg-gray-800 rounded-xl p-6">
                  <h3 className="text-2xl font-bold text-white mb-4">This Quiz Leaderboard</h3>
                  <div className="space-y-2">
                    {quizLeaderboard.map((u, i) => (
                      <div key={u.id} className="flex justify-between text-white">
                        <span>{i + 1}. {u.name}</span>
                        <span className="font-bold">{u.score} pts</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          <div className="mt-12 bg-gray-800 rounded-xl p-6">
            <h3 className="text-2xl font-bold text-white mb-4">Global Leaderboard</h3>
            <div className="space-y-2">
              {globalLeaderboard.map((u, i) => (
                <div key={u.id} className="flex justify-between text-white">
                  <span>{i + 1}. {u.name || "Anonymous"}</span>
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