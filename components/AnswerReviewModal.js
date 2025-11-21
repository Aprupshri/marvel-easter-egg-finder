import { Drawer } from "vaul";
import { X } from "lucide-react";

export default function AnswerReviewModal({ quiz, answers, score, open, onOpenChange }) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>

      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 flex flex-col bg-gray-900 rounded-t-3xl max-h-[96vh] border border-gray-700">
          {/* Drag handle */}
          <div className="mx-auto w-12 h-1.5 bg-gray-600 rounded-full mt-3" />

          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <Drawer.Title className="text-2xl font-bold text-white">
              Answer Review — Score: {score}/{quiz.length}
            </Drawer.Title>
            <Drawer.Close className="text-gray-400 hover:text-white">
              <X className="w-7 h-7" />
            </Drawer.Close>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {quiz.map((q, i) => {
              const userAnswer = answers[i];
              const correctAnswer = q.correct;
              const isCorrect = userAnswer === correctAnswer;

              return (
                <div
                  key={i}
                  className={`p-5 rounded-lg border-2 ${
                    isCorrect
                      ? "bg-green-900/30 border-green-500"
                      : "bg-red-900/30 border-red-500"
                  }`}
                >
                  <p className="font-semibold text-white mb-3">
                    {i + 1}. {q.question}
                  </p>
                  <div className="space-y-2">
                    {q.options.map((opt, idx) => {
                      const isUserAnswer = idx === userAnswer;
                      const isCorrectAnswer = idx === correctAnswer;

                      return (
                        <div
                          key={idx}
                          className={`p-2 rounded text-sm ${
                            isCorrectAnswer
                              ? "bg-green-600 text-white font-bold"
                              : isUserAnswer && !isCorrect
                              ? "bg-red-600 text-white line-through"
                              : "text-gray-300"
                          }`}
                        >
                          {isCorrectAnswer && "Correct Answer: "}
                          {isUserAnswer && !isCorrect && "Your Answer: "}
                          {opt}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}