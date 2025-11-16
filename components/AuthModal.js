// components/AuthModal.js
import { useState, useEffect } from "react";
import { auth } from "../firebase";
import {
  signInWithPopup,
  GoogleAuthProvider,
  signInAnonymously,
  linkWithPopup,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { toast } from "sonner";

const googleProvider = new GoogleAuthProvider();

export default function AuthModal({ onClose, showLogout, onLogout }) {
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return () => unsub();
  }, []);

  const signInWithGoogle = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      await setDoc(doc(db, "users", user.uid), {
        userName: user.displayName,
        email: user.email,
        totalScore: 0,
        quizzes: [],
      }, { merge: true });
    } catch (error) {
      console.error("Google sign-in error:", error);
    } finally {
      setLoading(false);
      onClose();
    }
  };

  const signInAnonymouslyHandler = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await signInAnonymously(auth);
    } catch (error) {
      console.error("Anonymous sign-in error:", error);
    } finally {
      setLoading(false);
      onClose();
    }
  };

  const linkAnonymousAccount = async () => {
    if (loading || !currentUser?.isAnonymous) return;
    setLoading(true);
    try {
      const result = await linkWithPopup(currentUser, googleProvider);
      const linkedUser = result.user;
      const anonDoc = await getDoc(doc(db, "users", currentUser.uid));
      const anonData = anonDoc.exists() ? anonDoc.data() : { totalScore: 0, quizzes: [] };

      await setDoc(doc(db, "users", linkedUser.uid), {
        userName: linkedUser.displayName,
        email: linkedUser.email,
        totalScore: anonData.totalScore || 0,
        quizzes: anonData.quizzes || [],
      }, { merge: true });

      // Optionally delete old anonymous user doc
      // await deleteDoc(doc(db, "users", currentUser.uid));

      toast.success("Progress saved! You're now signed in with Google.");
    } catch (error) {
      if (error.code === "auth/credential-already-in-use") {
        toast.error("This Google account is already in use.");
      } else {
        console.error("Link error:", error);
      }
    } finally {
      setLoading(false);
      onClose();
    }
  };

  const handleLogout = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await onLogout();
    } finally {
      setLoading(false);
    }
  };

  if (showLogout) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-xl p-6 max-w-sm w-full">
          <h3 className="text-xl font-bold text-white mb-4">Confirm Logout</h3>
          <p className="text-gray-300 mb-6">
            Are you sure you want to log out?
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleLogout}
              disabled={loading}
              className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold py-2 px-4 rounded-lg transition"
            >
              {loading ? "Logging out..." : "Logout"}
            </button>
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white font-bold py-2 px-4 rounded-lg transition"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl p-6 max-w-sm w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">Account</h3>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-white disabled:opacity-50"
          >
            X
          </button>
        </div>

        {currentUser?.isAnonymous ? (
          <>
            <div className="bg-yellow-900 bg-opacity-50 border border-yellow-600 rounded-lg p-4 mb-6">
              <p className="text-yellow-200 text-sm">
                Guest mode: Your progress will be lost when you leave.
              </p>
            </div>
            <button
              onClick={linkAnonymousAccount}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-lg mb-3 transition flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/>
              </svg>
              {loading ? "Saving..." : "Save Progress with Google"}
            </button>
            <button
              onClick={onClose}
              disabled={loading}
              className="w-full bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-lg transition"
            >
              Continue as Guest
            </button>
          </>
        ) : currentUser ? (
          // Logged in with Google
          <div className="text-center">
            <p className="text-green-400 mb-4">
              Signed in as <strong>{currentUser.displayName}</strong>
            </p>
            <button
              onClick={onClose}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition"
            >
              Close
            </button>
          </div>
        ) : (
          // Not signed in
          <>
            <button
              onClick={signInWithGoogle}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-lg mb-3 transition flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/>
              </svg>
              {loading ? "Signing in..." : "Sign in with Google"}
            </button>
            <button
              onClick={signInAnonymouslyHandler}
              disabled={loading}
              className="w-full bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-lg transition"
            >
              Play as Guest
            </button>
          </>
        )}
      </div>
    </div>
  );
}