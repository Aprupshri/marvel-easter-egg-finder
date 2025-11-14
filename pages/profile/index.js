// pages/profile/index.js
import { useState, useEffect } from "react";
import { auth, db } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import Link from "next/link";
import Navbar from "../../components/Navbar";

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ totalScore: 0, quizzes: 0 });
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u && !u.isAnonymous) {
        fetchProfileData(u.uid);
      } else {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const fetchProfileData = async (uid) => {
    setLoading(true);
    try {
      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        setStats({ totalScore: data.totalScore || 0, quizzes: data.quizzes || 0 });
      }

      const playsQuery = query(
        collection(db, "quizzes"),
        where("userId", "==", uid),
        orderBy("timestamp", "desc"),
        limit(20)
      );
      const playsSnap = await getDocs(playsQuery);
      const historyData = await Promise.all(
        playsSnap.docs.map(async (playDoc) => {
          const playData = playDoc.data();
          const quizId = playDoc.id;

          const playRef = doc(db, "quizzes", quizId, "plays", uid);
          const playSnap = await getDoc(playRef);
          const score = playSnap.exists() ? playSnap.data().score : playData.score;

          return {
            id: quizId,
            score,
            total: playData.quiz.length,
            timestamp: playData.timestamp.toDate(),
          };
        })
      );
      setHistory(historyData);
    } catch (e) {
      console.error("Failed to load profile:", e);
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.isAnonymous) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-purple-900 to-blue-900 p-4 flex items-center justify-center pt-20">
          <div className="text-center">
            <h1 className="text-4xl font-black text-white mb-6">My Quiz History</h1>
            <p className="text-gray-300 mb-6">Login to view your quiz history and stats.</p>
            <Link
              href="/quiz"
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-xl text-lg inline-block"
            >
              Go to Quiz Arena
            </Link>
          </div>
        </div>
      </>
    );
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-purple-900 to-blue-900 p-4 flex items-center justify-center pt-20">
          <div className="text-white text-xl">Loading your history...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-purple-900 to-blue-900 p-4">
        <div className="max-w-4xl mx-auto pt-20">
          <header className="text-center mb-8">
            <h1 className="text-5xl font-black text-white">My Quiz History</h1>
            <p className="text-blue-200 mt-2">Welcome back, {user.displayName || "Player"}!</p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-gray-800 rounded-xl p-6 text-center">
              <h3 className="text-xl font-bold text-blue-300 mb-2">Total Score</h3>
              <p className="text-4xl font-black text-white">{stats.totalScore}</p>
            </div>
            <div className="391 bg-gray-800 rounded-xl p-6 text-center">
              <h3 className="text-xl font-bold text-blue-300 mb-2">Quizzes Played</h3>
              <p className="text-4xl font-black text-white">{stats.quizzes}</p>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6">
            <h3 className="text-2xl font-bold text-white mb-4">Recent Quizzes</h3>
            {history.length === 0 ? (
              <p className="text-gray-400 text-center py-8">
                No quiz history yet. <Link href="/quiz" className="text-blue-400 hover:underline">Play one now!</Link>
              </p>
            ) : (
              <div className="space-y-3">
                {history.map((entry) => (
                  <div
                    key={entry.id}
                    className="bg-gray-700 rounded-lg p-4 flex justify-between items-center"
                  >
                    <div>
                      <Link
                        href={`/quiz/${entry.id}`}
                        className="text-blue-300 hover:text-white font-medium"
                      >
                        Quiz #{entry.id.slice(-6)}
                      </Link>
                      <p className="text-sm text-gray-400">
                        {entry.timestamp.toLocaleDateString()} at {entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-green-400">
                        {entry.score}/{entry.total}
                      </p>
                      <p className="text-xs text-gray-400">
                        {Math.round((entry.score / entry.total) * 100)}% correct
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/quiz"
              className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-8 rounded-xl text-lg inline-block"
            >
              Play Another Quiz
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}