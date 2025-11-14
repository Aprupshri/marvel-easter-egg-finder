// pages/quiz/[id].js
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { db } from "../../firebase";
import { doc, getDoc, collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import QuizPlayer from "../../components/QuizPlayer";
import Navbar from "../../components/Navbar";

export default function SharedQuiz() {
  const router = useRouter();
  const { id } = router.query;
  const [quizData, setQuizData] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    if (id) {
      const fetchQuiz = async () => {
        const docRef = doc(db, "quizzes", id);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setQuizData(snap.data());
        } else {
          alert("Quiz not found");
          router.push("/quiz");
        }
      };
      fetchQuiz();
    }
  }, [id, router]);

  useEffect(() => {
    if (id) fetchLeaderboard();
  }, [id]);

  const fetchLeaderboard = async () => {
    const q = query(collection(db, "quizzes", id, "plays"), orderBy("score", "desc"), limit(10));
    const snap = await getDocs(q);
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const enriched = await Promise.all(data.map(async (entry) => {
      if (entry.id === "anonymous") return { ...entry, name: "Anonymous" };
      const userDoc = await getDoc(doc(db, "users", entry.id));
      return { ...entry, name: userDoc.data()?.name || "Unknown" };
    }));
    setLeaderboard(enriched);
  };

  if (!quizData) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-purple-900 to-blue-900 flex items-center justify-center">
          <div className="text-white text-xl">Loading quiz...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-purple-900 to-blue-900 p-4">
        <div className="max-w-2xl mx-auto pt-20">
          <header className="text-center mb-8">
            <h1 className="text-4xl font-black text-white">Shared Quiz Challenge</h1>
            <p className="text-blue-200 mt-2">Best score: {quizData.score}/{quizData.quiz.length}</p>
          </header>

          <QuizPlayer
            quiz={quizData.quiz}
            initialScore={quizData.score}
            isShared={true}
          />

          <div className="mt-12 bg-gray-800 rounded-xl p-6">
            <h3 className="text-2xl font-bold text-white mb-4">Quiz Leaderboard</h3>
            <div className="space-y-2">
              {leaderboard.length === 0 ? (
                <p className="text-gray-400 text-center">No scores yet. Be the first!</p>
              ) : (
                leaderboard.map((u, i) => (
                  <div key={u.id} className="flex justify-between text-white">
                    <span>{i + 1}. {u.name}</span>
                    <span className="font-bold">{u.score} pts</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}