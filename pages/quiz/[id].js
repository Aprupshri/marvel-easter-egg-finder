// pages/quiz/[id].js
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { db, auth } from "../../firebase";
import { doc, getDoc, setDoc, collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import QuizPlayer from "../../components/QuizPlayer";

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
          alert("Quiz not found");
          router.push("/quiz");
        }
      };
      fetchQuiz();
    }
  }, [id, user, router]);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    const q = query(collection(db, "users"), orderBy("totalScore", "desc"), limit(10));
    const snap = await getDocs(q);
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    setLeaderboard(data);
  };

  const handleQuizComplete = async (score) => {
    if (!user || user.isAnonymous || hasPlayed) return;

    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);
    const data = snap.data() || { totalScore: 0, quizzes: 0 };

    await setDoc(userRef, {
      name: user.displayName || "Player",
      totalScore: data.totalScore + score,
      quizzes: data.quizzes + 1,
    }, { merge: true });

    const playRef = doc(db, "quizzes", id, "plays", user.uid);
    await setDoc(playRef, { score, timestamp: new Date() });

    fetchLeaderboard();
  };

  if (!quizData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 to-blue-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading quiz...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-blue-900 p-4">
      <div className="max-w-2xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-black text-white">Shared Quiz Challenge</h1>
          <p className="text-blue-200 mt-2">Best score: {quizData.score}/{quizData.quiz.length}</p>
          {user && !user.isAnonymous && hasPlayed && (
            <p className="text-yellow-400 mt-2">You've already played this quiz!</p>
          )}
        </header>

        <QuizPlayer
          quiz={quizData.quiz}
          initialScore={quizData.score}
          isShared={true}
          onComplete={handleQuizComplete}
        />

        <div className="mt-12 bg-gray-800 rounded-xl p-6">
          <h3 className="text-2xl font-bold text-white mb-4">Leaderboard</h3>
          <div className="space-y-2">
            {leaderboard.map((u, i) => (
              <div key={u.id} className="flex justify-between text-white">
                <span>{i + 1}. {u.name || "Anonymous"}</span>
                <span className="font-bold">{u.totalScore} pts</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}