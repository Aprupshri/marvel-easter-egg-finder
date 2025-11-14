// pages/quiz/[id].js
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import Link from "next/link";

export default function SharedQuiz() {
  const router = useRouter();
  const { id } = router.query;
  const [quizData, setQuizData] = useState(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    if (id) {
      const fetchQuiz = async () => {
        const docRef = doc(db, "quizzes", id);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          setQuizData(data);
          setAnswers(new Array(data.quiz.length).fill(undefined));
        } else {
          alert("Quiz not found");
          router.push("/quiz");
        }
      };
      fetchQuiz();
    }
  }, [id, router]);

  const selectAnswer = (idx) => {
    if (showResult) return;
    const newAnswers = [...answers];
    newAnswers[current] = idx;
    setAnswers(newAnswers);
  };

  const nextQuestion = () => {
    if (current < quizData.quiz.length - 1) {
      setCurrent(current + 1);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = () => {
    let correct = 0;
    quizData.quiz.forEach((q, i) => {
      if (answers[i] === q.correct) correct++;
    });
    setScore(correct);
    setShowResult(true);
  };

  if (!quizData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 to-blue-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading quiz...</div>
      </div>
    );
  }

  if (!showResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 to-blue-900 p-4">
        <div className="max-w-2xl mx-auto">
          <header className="text-center mb-8">
            <h1 className="text-4xl font-black text-white">Shared Quiz Challenge</h1>
            <p className="text-blue-200 mt-2">Best score: {quizData.score}/{quizData.quiz.length}</p>
          </header>

          <div className="bg-gray-800 rounded-xl p-6 shadow-2xl">
            <div className="flex justify-between text-white mb-4">
              <span>Question {current + 1}/{quizData.quiz.length}</span>
              {/* <span>Score: {answers.filter((a, i) => a === quizData.quiz[i].correct).length}</span> */}
            </div>
            <h3 className="text-xl font-bold text-blue-300 mb-6">
              {quizData.quiz[current].question}
            </h3>
            <div className="grid gap-3">
              {quizData.quiz[current].options.map((opt, idx) => (
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
              {current === quizData.quiz.length - 1 ? "Finish" : "Next"}
            </button>
          </div>

          <div className="mt-6 text-center">
            <Link href="/quiz" className="text-blue-300 hover:text-white underline">
              Back to Quiz Arena
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-blue-900 p-8">
      <div className="max-w-2xl mx-auto text-center">
        <div className="bg-gray-800 rounded-xl p-8">
          <h2 className="text-3xl font-bold text-green-400 mb-4">Quiz Complete!</h2>
          <p className="text-2xl text-white mb-6">
            Your score: <strong>{score}/{quizData.quiz.length}</strong>
          </p>
          <p className="text-yellow-400 mb-6">
            Best score: {quizData.score}/{quizData.quiz.length}
          </p>
          <button
            onClick={() => router.push("/quiz")}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-lg"
          >
            Back to Quiz Arena
          </button>
        </div>
      </div>
    </div>
  );
}