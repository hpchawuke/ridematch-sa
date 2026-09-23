import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaEnvelope, FaLock } from 'react-icons/fa6';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("Logged in:", userCredential.user.email);
      navigate('/home');
    } catch (err) {
      console.error("Login error:", err.code, err.message);

      // Map Firebase error codes to friendly messages
      let message = "Login failed. Please try again.";
      switch (err.code) {
        case 'auth/invalid-email':
          message = "That email address doesn't look right.";
          break;
        case 'auth/user-disabled':
          message = "This account has been disabled.";
          break;
        case 'auth/user-not-found':
          message = "No account found with that email.";
          break;
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          message = "Invalid email or password.";
          break;
        case 'auth/too-many-requests':
          message = "Too many attempts. Try again in a few minutes.";
          break;
        case 'auth/network-request-failed':
          message = "Network error. Check your connection.";
          break;
        case 'auth/operation-not-allowed':
          message = "Email/password login is disabled. Enable it in Firebase Console.";
          break;
        default:
          message = err.message;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 bg-white">
      <div className="relative mb-8 pt-2">
        <button onClick={() => navigate('/')} className="absolute left-0 top-0 p-2 text-gray-700">
          <FaArrowLeft className="text-xl" />
        </button>
        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-1">Welcome Back</h2>
        <p className="text-sm text-gray-500">Login to your RideMatch SA account</p>
      </div>

      <form className="flex flex-col gap-4" onSubmit={handleLogin}>
        <div className="flex items-center border border-gray-200 rounded-xl px-4 focus-within:border-[#0A7B44] bg-white">
          <FaEnvelope className="text-gray-400 mr-3" />
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full py-4 outline-none text-sm"
            required
          />
        </div>

        <div className="flex items-center border border-gray-200 rounded-xl px-4 focus-within:border-[#0A7B44] bg-white">
          <FaLock className="text-gray-400 mr-3" />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full py-4 outline-none text-sm"
            required
          />
        </div>

        {/* Inline error — replaces the alert() */}
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 rounded-xl font-semibold text-white bg-[#0A7B44] hover:bg-[#065F33] transition-colors mt-2 disabled:opacity-60"
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <div className="mt-auto text-center text-sm text-gray-500 pb-4">
        Don't have an account?{' '}
        <button onClick={() => navigate('/user-type')} className="text-[#0A7B44] font-semibold hover:underline">
          Sign Up
        </button>
      </div>
    </div>
  );
};

export default Login;