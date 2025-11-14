// components/AuthModal.js
import { useState } from "react";
import { auth, googleProvider, signInAnon } from "../firebase";
import { signInWithPopup, signOut } from "firebase/auth";

export default function AuthModal({ onClose, showLogout = false, onLogout }) {
  const [loading, setLoading] = useState(false);

  const loginGoogle = async () => {
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      onClose();
    } catch (e) {
      alert("Login failed");
    } finally {
      setLoading(false);
    }
  };

  const loginAnon = async () => {
    setLoading(true);
    try {
      await signInAnon();
      onClose();
    } catch (e) {
      alert("Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      onLogout?.();
      onClose();
    } catch (e) {
      alert("Logout failed");
    } finally {
      setLoading(false);
    }
  };

  if (showLogout) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 rounded-xl p-6 max-w-sm w-full text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Logout</h2>
          <p className="text-gray-300 mb-6">Are you sure you want to log out?</p>
          <button
            onClick={handleLogout}
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-lg mb-3"
          >
            {loading ? "Logging out..." : "Logout"}
          </button>
          <button
            onClick={onClose}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl p-6 max-w-sm w-full text-center">
        <h2 className="text-2xl font-bold text-white mb-4">Play Quiz</h2>
        <button
          onClick={loginGoogle}
          disabled={loading}
          className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-lg mb-3"
        >
          Login with Google
        </button>
        <button
          onClick={loginAnon}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg"
        >
          Play as Guest
        </button>
        <button
          onClick={onClose}
          className="mt-4 text-gray-400 hover:text-white"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}