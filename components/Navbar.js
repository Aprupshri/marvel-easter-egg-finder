import { useState, useEffect } from "react";
import { auth } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import Link from "next/link";
import AuthModal from "./AuthModal";

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser);
    return () => unsub();
  }, []);

  const handleLogout = () => {
    signOut(auth);
    setShowLogout(false);
  };

  const openAuthModal = () => {
    setShowAuth(true);
  };

  return (
    <nav className="bg-gray-900 border-b border-gray-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-black text-xl">M</span>
              </div>
              <span className="text-white font-black text-xl hidden sm:block">
                Marvel Quiz Arena
              </span>
            </Link>

            {/* Easter Egg Finder link */}
            <Link
              href="/easter"
              className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition hidden sm:block"
            >
              Easter Egg Finder
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Link
                  href="/profile"
                  className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition"
                >
                  History
                </Link>
                <div className="flex items-center space-x-3">
                  <span className="text-gray-300 text-sm">
                    {user.displayName || "Guest"}
                  </span>
                  {user.isAnonymous && (
                    <button
                      onClick={openAuthModal}
                      className="bg-yellow-600 hover:bg-yellow-500 text-white text-sm font-medium px-3 py-1.5 rounded-md transition"
                    >
                      Save Progress
                    </button>
                  )}
                  <button
                    onClick={() => setShowLogout(true)}
                    className="text-red-400 hover:text-red-300 text-sm font-medium transition"
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={openAuthModal}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md text-sm font-medium transition"
              >
                Login
              </button>
            )}
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
    </nav>
  );
}