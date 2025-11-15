// components/QuizPlayer.js
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

export default function QuizPlayer({
  quiz,
  initialScore = null,
  isShared = false,
  onComplete,
  clearQuiz,
  shareUrl = "",
}) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState(
    new Array(quiz.length).fill(undefined)
  );
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);

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

  const finishQuiz = () => {
    let correct = 0;
    quiz.forEach((q, i) => {
      if (answers[i] === q.correct) correct++;
    });
    setScore(correct);
    setShowResult(true);
    if (onComplete) onComplete(correct);
  };

  const shareOnTwitter = () => {
    const text = `I just scored ${score}/${quiz.length} on a Marvel Quiz! Can you beat me?`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      text
    )}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, "_blank", "width=600,height=400");
  };

  const shareOnFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
      shareUrl
    )}`;
    window.open(url, "_blank", "width=600,height=400");
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success("Link copied to clipboard!");
  };

  if (!showResult) {
    return (
      <div className="bg-gray-800 rounded-xl p-6 shadow-2xl">
        <div className="flex justify-between text-white mb-4">
          <span>
            Question {current + 1}/{quiz.length}
          </span>
          <span>
            Score: {answers.filter((a, i) => a === quiz[i].correct).length}
          </span>
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
    );
  }

  return (
    <div className="bg-gray-800 rounded-xl p-8 text-center">
      <h2 className="text-3xl font-bold text-green-400 mb-4">Quiz Complete!</h2>
      <p className="text-2xl text-white mb-6">
        Your score:{" "}
        <strong>
          {score}/{quiz.length}
        </strong>
      </p>
      {initialScore !== null && (
        <p className="text-yellow-400 mb-6">
          Best score: {initialScore}/{quiz.length}
        </p>
      )}
      <div className="flex justify-center gap-4 mb-6">
        <button
          onClick={shareOnTwitter}
          className="bg-blue-500 hover:bg-blue-400 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          Share on X
        </button>
        <button
          onClick={shareOnFacebook}
          className="bg-blue-700 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
          Share on Facebook
        </button>
        <button
          onClick={copyLink}
          className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          Copy Link
        </button>
      </div>

      <Link
        onClick={clearQuiz}
        href="/quiz"
        className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-lg inline-block"
      >
        Back to Quiz Arena
      </Link>
    </div>
  );
}
