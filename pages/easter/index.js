import { useState, useRef } from "react";
import Link from "next/link";
import Navbar from "../../components/Navbar";
// This is the main user interface, built as a React Component.
// It manages all the visual elements and user interactions.
export default function HomePage() {
  // 'useState' hooks are used to manage the component's data and state.
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [geminiResponse, setGeminiResponse] = useState("");
  const [geminiLoading, setGeminiLoading] = useState(false);

  // useRef holds references that don't trigger re-renders, perfect for audio context.
  const audioContextRef = useRef(null);
  const audioSourceRef = useRef(null);

  // --- Audio Helper Functions ---

  // Decodes a base64 string into an ArrayBuffer for the Web Audio API.
  const base64ToArrayBuffer = (base64) => {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  };

  // Plays raw PCM audio data using the browser's Web Audio API.
  const playAudio = async (pcmData) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext ||
        window.webkitAudioContext)();
    }
    // Stop any audio that is currently playing.
    if (audioSourceRef.current) {
      audioSourceRef.current.stop();
    }

    const sampleRate = 24000; // Gemini TTS standard sample rate
    const audioBuffer = audioContextRef.current.createBuffer(
      1,
      pcmData.byteLength / 2,
      sampleRate
    );
    const pcm16 = new Int16Array(pcmData);
    const channelData = audioBuffer.getChannelData(0);

    // Convert 16-bit PCM to Float32, the format Web Audio API expects.
    for (let i = 0; i < pcm16.length; i++) {
      channelData[i] = pcm16[i] / 32768.0;
    }

    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);
    source.start();
    audioSourceRef.current = source;
    source.onended = () => {
      audioSourceRef.current = null;
    };
  };

  // --- API Call Handlers ---

  // Function to handle the main search action.
  const handleSearch = async () => {
    if (!query) return;

    setLoading(true);
    setResult(null);
    setError(null);
    setGeminiResponse("");

    try {
      const response = await fetch("/api/generate-egg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "find", query }),
      });

      if (!response.ok) throw new Error("The server responded with an error.");
      const data = await response.json();
      if (data.error) setError(data.error);
      else setResult(data);
    } catch (err) {
      setError("Failed to fetch Easter egg. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  // Handles 'explain' and 'whatif' features.
  const handleGeminiFeature = async (action) => {
    if (!result) return;

    setGeminiLoading(true);
    setGeminiResponse("");

    try {
      const response = await fetch("/api/generate-egg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          context: `${result.title}: ${result.description}`,
        }),
      });

      if (!response.ok) throw new Error("The server responded with an error.");
      const data = await response.json();
      setGeminiResponse(data.text.replace(/\n/g, "<br />"));
    } catch (err) {
      setGeminiResponse("Failed to get a response from the AI.");
    } finally {
      setGeminiLoading(false);
    }
  };

  // NEW: Handles the 'listen' feature.
  const handleListenFeature = async () => {
    if (!result) return;

    setGeminiLoading(true);
    setGeminiResponse("");

    try {
      const response = await fetch("/api/generate-egg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "listen",
          context: `${result.title}: ${result.description}`,
        }),
      });

      if (!response.ok) throw new Error("The server responded with an error.");
      const data = await response.json();

      if (data.audio) {
        const pcmData = base64ToArrayBuffer(data.audio);
        playAudio(pcmData);
        setGeminiResponse("🔊 Playing audio archive...");
      } else {
        throw new Error("No audio data received.");
      }
    } catch (err) {
      setGeminiResponse("Failed to retrieve audio.");
    } finally {
      setGeminiLoading(false);
    }
  };

  // Resets the UI to its initial state.
  const resetState = () => {
    setQuery("");
    setResult(null);
    setError(null);
    setLoading(false);
    setGeminiResponse("");
    if (audioSourceRef.current) {
      audioSourceRef.current.stop();
    }
  };

  // The JSX for rendering the page UI.
  return (
    <div className="easter-bg">
      <Navbar />
      <div className="backdrop-blur-md min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md mx-auto">
          <header className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-wide">
              MARVEL
            </h1>
            <h2 className="text-2xl md:text-3xl font-bold text-blue-300">
              Easter Eggs Finder
            </h2>
            <p className="text-blue-200 mt-2">
              Enter a movie, character, or keyword from the MCU
            </p>
          </header>

          <div className="flex rounded-lg shadow-lg mb-6">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="e.g., Captain America, Stark, Thanos..."
              className="w-full p-4 rounded-l-lg border-0 text-gray-800 focus:ring-4 focus:ring-blue-400 focus:outline-none transition"
              disabled={loading}
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-r-lg btn-glow disabled:opacity-50"
            >
              {loading ? "..." : "Find"}
            </button>
          </div>

          <div className="relative">
            {loading && (
              <div className="text-center p-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-300 mx-auto"></div>
                <p className="text-blue-200 mt-4 text-lg">
                  Searching the S.H.I.E.L.D. Archives...
                </p>
              </div>
            )}

            {!loading && !result && !error && (
              <div className="text-center bg-black bg-opacity-20 p-8 rounded-xl backdrop-blur-sm border border-gray-700">
                <svg
                  className="mx-auto h-12 w-12 text-blue-400"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <p className="mt-4 text-lg text-blue-200">
                  Your Easter egg will appear here.
                </p>
              </div>
            )}

            {error && (
              <div className="fade-in text-center bg-red-900 bg-opacity-50 p-8 rounded-xl backdrop-blur-sm border border-red-700">
                <svg
                  className="mx-auto h-12 w-12 text-red-400"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                  />
                </svg>
                <h3 className="mt-4 text-xl font-bold text-white">
                  Search Error
                </h3>
                <p className="mt-2 text-red-200">{error}</p>
                <button
                  onClick={resetState}
                  className="mt-4 bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded-lg w-full btn-glow"
                >
                  Try Again
                </button>
              </div>
            )}

            {result && (
              <div className="bg-gray-800 text-white p-6 rounded-xl shadow-2xl flex flex-col fade-in">
                <h3 className="text-2xl font-bold text-blue-300 mb-3 text-center">
                  {result.title}
                </h3>
                <div className="flex-grow text-lg leading-relaxed text-gray-300 mb-4">
                  <p>{result.description}</p>
                </div>

                <div className="pt-4 border-t border-gray-600">
                  <div className="flex space-x-2">
                    <button
                      onClick={handleListenFeature}
                      disabled={geminiLoading}
                      className="gemini-btn"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        fill="currentColor"
                        viewBox="0 0 16 16"
                      >
                        <path d="M11.536 14.01A8.47 8.47 0 0 0 14.026 8a8.47 8.47 0 0 0-2.49-6.01l-1.414 1.414A6.47 6.47 0 0 1 12.025 8a6.47 6.47 0 0 1-1.903 4.596z" />
                        <path d="M10.121 12.596A6.47 6.47 0 0 0 12.025 8a6.47 6.47 0 0 0-1.904-4.596l-1.414 1.414A4.47 4.47 0 0 1 10.025 8a4.47 4.47 0 0 1-1.317 3.182z" />
                        <path d="M8.707 11.182A4.47 4.47 0 0 0 10.025 8a4.47 4.47 0 0 0-1.318-3.182L8.707 3.404a2.47 2.47 0 0 1 0 4.242L2.424 2.053a.5.5 0 0 0-.707.707L8.707 11.182z" />
                        <path d="M4.293 2.707A.5.5 0 0 1 4 2.5v11a.5.5 0 0 1-.854.354L.146 8.354a.5.5 0 0 1 0-.708L3.146 2.146a.5.5 0 0 1 .147-.146" />
                      </svg>
                      Listen
                    </button>
                    <button
                      onClick={() => handleGeminiFeature("explain")}
                      disabled={geminiLoading}
                      className="gemini-btn"
                    >
                      ✨ Explain
                    </button>
                    <button
                      onClick={() => handleGeminiFeature("whatif")}
                      disabled={geminiLoading}
                      className="gemini-btn"
                    >
                      ✨ What If?
                    </button>
                  </div>

                  {geminiLoading && (
                    <div className="text-center p-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-300 mx-auto"></div>
                      <p className="text-blue-200 mt-2 text-sm">
                        A.N.V.I.L. is thinking...
                      </p>
                    </div>
                  )}

                  {geminiResponse && (
                    <div
                      className="mt-4 bg-black bg-opacity-20 p-3 rounded-lg text-blue-100 text-base max-h-40 overflow-y-auto"
                      dangerouslySetInnerHTML={{ __html: geminiResponse }}
                    />
                  )}
                </div>
                <button
                  onClick={resetState}
                  className="mt-4 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-lg w-full btn-glow"
                >
                  Find Another
                </button>
              </div>
            )}
          </div>
          <div className="mt-8 text-center">
            <Link
              href="/"
              className="text-blue-300 hover:text-white underline text-lg"
            >
              Go to Marvel Quiz Arena
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
