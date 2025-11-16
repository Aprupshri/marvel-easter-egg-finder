// pages/quiz/[id].js
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { db, auth } from "../../firebase";
import {
  doc,
  getDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import QuizPlayer from "../../components/QuizPlayer";
import Navbar from "../../components/Navbar";
import { toast } from "sonner";

export default function SharedQuiz() {
  const router = useRouter();
  const { id } = router.query;
  const [quizData, setQuizData] = useState(null);
  const [user, setUser] = useState(null);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser);
    return () => unsub();
  }, []);

  useEffect(() => {
    if (id) {
      const fetchQuiz = async () => {
        const docRef = doc(db, "quizzes", id);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          setQuizData(data);

          if (user && !user.isAnonymous) {
            const playRef = doc(db, "quizzes", id, "plays", user.uid);
            const playSnap = await getDoc(playRef);
            setHasPlayed(playSnap.exists());
          }
        } else {
          toast.error("Quiz not found");
          router.push("/quiz");
        }
      };
      fetchQuiz();
    }
  }, [id, user, router]);

  useEffect(() => {
    if (id) fetchLeaderboard();
  }, [id]);

  const fetchLeaderboard = async () => {
    const q = query(
      collection(db, "quizzes", id, "plays"),
      orderBy("score", "desc"),
      limit(10)
    );
    const snap = await getDocs(q);

    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    console.log(data);
    const enriched = await Promise.all(
      data.map(async (entry) => {
        if (entry.id === "anonymous") return { ...entry, name: "Anonymous" };
        const userDoc = await getDoc(doc(db, "users", entry.id));
        return { ...entry, name: userDoc.data()?.userName || "Unknown" };
      })
    );
    setLeaderboard(enriched);
  };

  const handleQuizComplete = async (score) => {
    if (!user || user.isAnonymous || hasPlayed) return;

    try {
      await fetch("/api/save-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quizId: id,
          score,
          userId: user.uid,
          userName: user.displayName || "Guest",
        }),
      });
      fetchLeaderboard();
    } catch (error) {
      console.error("Failed to save shared quiz:", error);
    }
  };

  if (!quizData) {
    return (
      <>
        <Navbar />
        <div className="quiz-bg">
          <div className="min-h-screen p-4 backdrop-blur-sm">
            <div className="text-white text-xl">Loading quiz...</div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="quiz-bg">
        <div className="min-h-screen p-4 backdrop-blur-sm">
          <div className="max-w-2xl mx-auto pt-20">
            <header className="text-center mb-8">
              <h1 className="text-4xl font-black text-white">
                Shared Quiz Challenge
              </h1>
              <p className="text-blue-200 mt-2">
                Best score: {quizData.score || 0}/{quizData.quiz.length}
              </p>
              {user && !user.isAnonymous && hasPlayed && (
                <p className="text-yellow-400 mt-2">
                  You've already played this quiz!
                </p>
              )}
            </header>

            <QuizPlayer
              quiz={quizData.quiz}
              initialScore={quizData.score || 0}
              isShared={true}
              onComplete={handleQuizComplete}
              shareUrl={"/quiz/" + id}
            />

            <div className="mt-12 bg-gray-800 rounded-xl p-6">
              <h3 className="text-2xl font-bold text-white mb-4">
                Quiz Leaderboard
              </h3>
              <div className="space-y-2">
                {leaderboard.length === 0 ? (
                  <p className="text-gray-400 text-center">
                    No scores yet. Be the first!
                  </p>
                ) : (
                  leaderboard.map((u, i) => (
                    <div key={u.id} className="flex justify-between text-white">
                      <span>
                        {i + 1}. {u.name}
                      </span>
                      <span className="font-bold">{u.score} pts</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
