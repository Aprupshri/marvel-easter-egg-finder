// pages/quiz/index.js (add share buttons after quiz completion)
import { useState, useEffect } from "react";
import { auth, db } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, getDoc, collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import AuthModal from "../../components/AuthModal";
import Link from "next/link";

export default function QuizArena() {
  const [user, setUser] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const [quizId, setQuizId] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser);
    return () => unsub();
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    const q = query(collection(db, "users"), orderBy("totalScore", "desc"), limit(10));
    const snap = await getDocs(q);
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    setLeaderboard(data);
  };

  const generateQuiz = async () => {
    if (!user) {
      setShowAuth(true);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/generate-quiz", { method: "POST" });
      const { quiz } = await res.json();
      const id = Date.now().toString();
      setQuizId(id);
      setQuiz(quiz);
      setCurrent(0);
      setAnswers([]);
      setShowResult(false);
      setScore(0);
    } catch (e) {
      alert("Failed to generate quiz");
    } finally {
      setLoading(false);
    }
  };

  const selectAnswer = (idx) => {
    if (showResult) return;
    const newAnswers = [...answers];
    newAnswers[current] = idx;
    setAnswers(newAnswers);
  };

  const nextQuestion = () => {
    if (current < quiz.length - 1) {
      setCurrent(current + 1);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = async () => {
    let correct = 0;
    quiz.forEach((q, i) => {
      if (answers[i] === q.correct) correct++;
    });
    setScore(correct);
    setShowResult(true);

    if (user && !user.isAnonymous) {
      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);
      const data = snap.data() || { totalScore: 0, quizzes: 0 };
      await setDoc(userRef, {
        name: user.displayName || "Player",
        totalScore: data.totalScore + correct,
        quizzes: data.quizzes + 1,
      });
      fetchLeaderboard();
    }

    if (quizId) {
      await setDoc(doc(db, "quizzes", quizId), {
        quiz,
        score: correct,
        userId: user?.uid || "anonymous",
        timestamp: new Date(),
      });
    }
  };

  const handleLogout = () => {
    setShowLogout(false);
    setUser(null);
  };

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/quiz/${quizId}` : "";

  const shareOnTwitter = () => {
    const text = `I just scored ${score}/${quiz.length} on a Marvel Quiz! Can you beat me?`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, "_blank", "width=600,height=400");
  };

  const shareOnFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(url, "_blank", "width=600,height=400");
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    alert("Link copied to clipboard!");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-blue-900 p-4">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-5xl font-black text-white">Marvel Quiz Arena</h1>
          <p className="text-blue-200 mt-2">Test your MCU knowledge!</p>
        </header>

        <div className="flex justify-between items-center mb-6">
          {user ? (
            <div className="text-white">
              Logged in as: <strong>{user.displayName || "Guest"}</strong>
              {user.isAnonymous ? null : (
                <button
                  onClick={() => setShowLogout(true)}
                  className="ml-4 text-sm text-red-400 hover:text-red-300 underline"
                >
                  Logout
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={() => setShowAuth(true)}
              className="text-blue-300 hover:text-white underline"
            >
              Login to save score
            </button>
          )}
        </div>

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
        ) : !showResult ? (
          <div className="bg-gray-800 rounded-xl p-6 shadow-2xl">
            <div className="flex justify-between text-white mb-4">
              <span>Question {current + 1}/{quiz.length}</span>
              {/* <span>Score: {answers.filter((a, i) => a === quiz[i].correct).length}</span> */}
            </div>
            <h3 className="text-xl font-bold text-blue-300 mb-6">{quiz[current].question}</h3>
            <div className="grid gap-3">
              {quiz[current].options.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => selectAnswer(idx)}
                  className={`p-4 rounded-lg text-left font-medium transition ${
                    answers[current] === idx
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 text-gray-200 hover:bg-gray-600"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
            <button
              onClick={nextQuestion}
              disabled={answers[current] === undefined}
              className="mt-6 w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-bold py-3 rounded-lg"
            >
              {current === quiz.length - 1 ? "Finish" : "Next"}
            </button>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-xl p-8 text-center">
            <h2 className="text-3xl font-bold text-green-400 mb-4">Quiz Complete!</h2>
            <p className="text-2xl text-white mb-6">
              Your score: <strong>{score}/{quiz.length}</strong>
            </p>
            {quizId && (
              <>
                <p className="text-blue-300 mb-4">
                  Share your quiz: <Link href={`/quiz/${quizId}`} className="underline">marvel-quiz.com/quiz/{quizId}</Link>
                </p>
                <div className="flex justify-center gap-4 mb-6">
                  <button
                    onClick={shareOnTwitter}
                    className="bg-blue-500 hover:bg-blue-400 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    Share on X
                  </button>
                  <button
                    onClick={shareOnFacebook}
                    className="bg-blue-700 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    Share on Facebook
                  </button>
                  <button
                    onClick={copyLink}
                    className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy Link
                  </button>
                </div>
              </>
            )}
            <button
              onClick={() => setQuiz(null)}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-lg"
            >
              New Quiz
            </button>
          </div>
        )}

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

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      {showLogout && (
        <AuthModal
          showLogout
          onClose={() => setShowLogout(false)}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}