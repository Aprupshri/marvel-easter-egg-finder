// pages/quiz/index.js
import { useState, useEffect } from "react";
import { auth, db } from "../../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";
import Link from "next/link";
import AuthModal from "../../components/AuthModal";

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
    console.log(user);
    return () => unsub();
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    const q = query(
      collection(db, "users"),
      orderBy("totalScore", "desc"),
      limit(10)
    );
    const snap = await getDocs(q);
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
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
              <button
                onClick={() => setShowLogout(true)}
                className="ml-4 text-sm text-red-400 hover:text-red-300 underline"
              >
                Logout
              </button>
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
              <span>
                Question {current + 1}/{quiz.length}
              </span>
              {/* <span>
                Score: {answers.filter((a, i) => a === quiz[i].correct).length}
              </span> */}
            </div>
            <h3 className="text-xl font-bold text-blue-300 mb-6">
              {quiz[current].question}
            </h3>
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
            <h2 className="text-3xl font-bold text-green-400 mb-4">
              Quiz Complete!
            </h2>
            <p className="text-2xl text-white mb-6">
              Your score:{" "}
              <strong>
                {score}/{quiz.length}
              </strong>
            </p>
            {quizId && (
              <p className="text-blue-300 mb-4">
                Share:{" "}
                <Link href={`/quiz/${quizId}`} className="underline">
                  marvel-quiz.com/quiz/{quizId}
                </Link>
              </p>
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
                <span>
                  {i + 1}. {u.name || "Anonymous"}
                </span>
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
