// components/AuthModal.js
import { useState, useEffect } from "react";
import { auth, getActionCodeSettings } from "../firebase";
import {
  signInWithPopup,
  GoogleAuthProvider,
  signInAnonymously,
  linkWithPopup,
  linkWithCredential,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  reload,
  EmailAuthProvider,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

const googleProvider = new GoogleAuthProvider();

export default function AuthModal({ onClose, showLogout, onLogout }) {
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [verificationSent, setVerificationSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      if (user && isSignUp && !user.emailVerified) {
        setVerificationSent(true);
      }
    });
    return () => unsub();
  }, [isSignUp]);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const sendVerificationEmail = async (user) => {
    const settings = getActionCodeSettings();
    if (!settings) return; // Safety check

    try {
      await sendEmailVerification(user, settings);
      setVerificationSent(true);
      setResendTimer(60);
    } catch (error) {
      console.error("Verification email error:", error);
      setError("Failed to send verification email.");
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in both email and password");
      return;
    }
    setLoading(true);
    setError("");
    setVerificationSent(false);
    try {
      let user;
      if (isSignUp) {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        user = result.user;
        await setDoc(doc(db, "users", user.uid), {
          userName: email.split("@")[0],
          email: user.email,
          totalScore: 0,
          quizzes: [],
        }, { merge: true });
        await sendVerificationEmail(user);
      } else {
        const result = await signInWithEmailAndPassword(auth, email, password);
        user = result.user;
        if (!user.emailVerified) {
          setError("Please verify your email. Check your inbox.");
          await sendVerificationEmail(user);
        }
      }
      onClose();
    } catch (error) {
      if (error.code === "auth/email-already-in-use") {
        setError("Email already in use. Try signing in.");
      } else if (error.code === "auth/weak-password") {
        setError("Password should be at least 6 characters.");
      } else if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password") {
        setError("Invalid email or password.");
      } else {
        setError("Authentication failed. Please try again.");
      }
      console.error("Email auth error:", error);
    } finally {
      setLoading(false);
    }
  };

  const linkAnonymousWithEmail = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in both email and password");
      return;
    }
    if (!currentUser?.isAnonymous) return;

    setLoading(true);
    setError("");
    try {
      const credential = EmailAuthProvider.credential(email, password);
      const result = await linkWithCredential(currentUser, credential);
      const linkedUser = result.user;

      const anonDoc = await getDoc(doc(db, "users", currentUser.uid));
      const anonData = anonDoc.exists() ? anonDoc.data() : { totalScore: 0, quizzes: [] };

      await setDoc(doc(db, "users", linkedUser.uid), {
        userName: email.split("@")[0],
        email: linkedUser.email,
        totalScore: anonData.totalScore || 0,
        quizzes: anonData.quizzes || [],
      }, { merge: true });

      if (!linkedUser.emailVerified) {
        await sendVerificationEmail(linkedUser);
      }

      alert("Progress saved! You're now signed in with email.");
      onClose();
    } catch (error) {
      if (error.code === "auth/email-already-in-use") {
        setError("This email is already linked to another account.");
      } else if (error.code === "auth/weak-password") {
        setError("Password should be at least 6 characters.");
      } else {
        setError("Failed to link account. Try again.");
        console.error("Link email error:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  const resendVerification = async () => {
    if (!currentUser || resendTimer > 0) return;
    setLoading(true);
    await sendVerificationEmail(currentUser);
    setLoading(false);
  };

  const checkEmailVerified = async () => {
    if (!currentUser) return;
    await reload(currentUser);
    if (currentUser.emailVerified) {
      onClose();
    } else {
      setError("Email not verified yet. Please check your inbox.");
    }
  };

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

      alert("Progress saved! You're now signed in with Google.");
      onClose();
    } catch (error) {
      if (error.code === "auth/credential-already-in-use") {
        alert("This Google account is already in use.");
      } else {
        console.error("Link error:", error);
      }
    } finally {
      setLoading(false);
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
          <h3 className="text-xl font-bold text-white">
            {currentUser?.isAnonymous ? "Save Progress" : "Account"}
          </h3>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-white disabled:opacity-50"
          >
            X
          </button>
        </div>

        {error && (
          <div className="bg-red-900 bg-opacity-50 border border-red-600 rounded-lg p-3 mb-4">
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}

        {verificationSent && !currentUser?.emailVerified && (
          <div className="bg-yellow-900 bg-opacity-50 border border-yellow-600 rounded-lg p-4 mb-4">
            <p className="text-yellow-200 text-sm">
              Verification email sent! Check your inbox.
            </p>
            <button
              onClick={resendVerification}
              disabled={loading || resendTimer > 0}
              className="mt-2 text-xs text-blue-400 hover:underline disabled:opacity-50"
            >
              {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend email"}
            </button>
            <button
              onClick={checkEmailVerified}
              disabled={loading}
              className="mt-2 ml-3 text-xs text-blue-400 hover:underline"
            >
              I verified
            </button>
          </div>
        )}

        {currentUser?.isAnonymous ? (
          <>
            <div className="bg-yellow-900 bg-opacity-50 border border-yellow-600 rounded-lg p-4 mb-6">
              <p className="text-yellow-200 text-sm">
                Guest mode: Your progress will be lost when you leave.
              </p>
            </div>

            <form onSubmit={linkAnonymousWithEmail} className="mb-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                disabled={loading}
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (6+ chars)"
                className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-lg transition"
              >
                {loading ? "Saving..." : "Save with Email"}
              </button>
            </form>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-800 text-gray-400">or</span>
              </div>
            </div>

            <button
              onClick={linkAnonymousAccount}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-lg mb-3 transition flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/>
              </svg>
              {loading ? "Saving..." : "Save with Google"}
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
          <div className="text-center">
            <p className="text-green-400 mb-4">
              Signed in as <strong>{currentUser.displayName || currentUser.email}</strong>
            </p>
            {!currentUser.emailVerified && currentUser.providerData.some(p => p.providerId === "password") && (
              <button
                onClick={resendVerification}
                disabled={loading || resendTimer > 0}
                className="text-sm text-blue-400 hover:underline mb-3 block"
              >
                {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend verification email"}
              </button>
            )}
            <button
              onClick={onClose}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <form onSubmit={handleEmailAuth} className="mb-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                disabled={loading}
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-lg transition"
              >
                {loading ? "Processing..." : isSignUp ? "Sign Up" : "Sign In"}
              </button>
            </form>

            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="w-full text-sm text-blue-400 hover:text-blue-300 mb-4"
            >
              {isSignUp ? "Already have an account? Sign In" : "New here? Sign Up"}
            </button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-800 text-gray-400">or</span>
              </div>
            </div>

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