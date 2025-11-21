// pages/quiz/index.js
import { useState, useEffect } from "react";
import { db, auth } from "../firebase";
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
import QuizPlayer from "../components/QuizPlayer";
import Navbar from "../components/Navbar";
import { toast } from "sonner";
import { getMarvelName } from "../utils/getMarvelName";

const LOADING_MESSAGES = [
  "Thanos is snapping... quiz incoming!",
  "Activating the Infinity Stones of Knowledge...",
  "Wong is opening a portal to new questions...",
  "Charging the Stark Reactor...",
  "Doctor Strange is browsing timelines for the best quiz...",
  "Hulk is smashing the generate button...",
  "Web-slinging fresh questions your way!",
  "Assembling the Avengers of Trivia...",
];
export default function QuizArena() {
  const [user, setUser] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [quizId, setQuizId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [globalLeaderboard, setGlobalLeaderboard] = useState([]);
  const [quizLeaderboard, setQuizLeaderboard] = useState([]);
  const [loadingMessage, setLoadingMessage] = useState(
    Math.floor(Math.random() * LOADING_MESSAGES.length)
  );
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

  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setLoadingMessage((prev) =>
          prev + 1 < LOADING_MESSAGES.length ? prev + 1 : 0
        );
      }, 1500);

      return () => clearInterval(interval);
    }
  }, [loading]);

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

  // pages/quiz/index.js (update generateQuiz function)
  const generateQuiz = async () => {
    if (!user) {
      toast.error("Please log in to play");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({  
          userId: user.uid,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setQuizId(data.quizId);
      setQuiz(data.quiz);
      // if (!data.reused) {
      //   toast.success("Fresh quiz generated!");
      // }
    } catch (e) {
      toast.error("Failed to load quiz");
      console.error(e);
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
      <div className="quiz-bg">
        <div className="min-h-screen p-4 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto pt-20">
            <header className="text-center mb-8">
              <h1 className="text-5xl font-black text-white">
                Marvel Quiz Arena
              </h1>
              <p className="text-blue-200 mt-2">Test your MCU knowledge!</p>
            </header>

            {(!quiz || !user) ? (
              <div className="text-center">
                <button
                  onClick={generateQuiz}
                  disabled={loading}
                  className="bg-gradient-to-r from-red-600 to-blue-600 hover:from-red-500 hover:to-blue-500 text-white font-bold py-4 px-8 rounded-xl text-xl btn-glow shadow-lg transition-all duration-300 transform hover:scale-105"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>

                      {LOADING_MESSAGES[loadingMessage]}
                    </span>
                  ) : (
                    "Summon a New Quiz!"
                  )}
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
      </div>
    </>
  );
}
