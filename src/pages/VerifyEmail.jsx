import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { sendEmailVerification, signOut } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { FaEnvelopeCircleCheck, FaArrowRotateRight, FaRightFromBracket } from 'react-icons/fa6';

const VerifyEmail = () => {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleCheckVerified = async () => {
    setChecking(true);
    setError('');
    setMessage('');

    try {
      // Force-refresh user from Firebase to get the latest emailVerified value
      await auth.currentUser.reload();
      const user = auth.currentUser;

      if (user.emailVerified) {
        // Flip Firestore verified to true
        await updateDoc(doc(db, 'users', user.uid), { verified: true });

        setMessage('Verified! Taking you to your dashboard…');
        setTimeout(() => navigate('/home', { replace: true }), 800);
      } else {
        setError("Not verified yet. Click the link in your email, then try again.");
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setChecking(false);
    }
  };

  const handleResend = async () => {
    try {
      await sendEmailVerification(auth.currentUser);
      setMessage('Verification email sent again. Check your inbox.');
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const email = auth.currentUser?.email || 'your email';

  return (
    <div className="flex-1 flex flex-col p-6 bg-white">
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
        <div className="w-20 h-20 rounded-full bg-[#0A7B44]/10 flex items-center justify-center">
          <FaEnvelopeCircleCheck className="text-4xl text-[#0A7B44]" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900">Check your inbox</h1>
        <p className="text-sm text-gray-500 max-w-xs">
          We sent a verification link to <span className="font-semibold text-gray-800">{email}</span>.
          Click the link, then come back and tap the button below.
        </p>

        {message && (
          <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3 max-w-xs">
            {message}
          </div>
        )}
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 max-w-xs">
            {error}
          </div>
        )}

        <button
          onClick={handleCheckVerified}
          disabled={checking}
          className="w-full max-w-xs py-4 rounded-xl font-semibold text-white bg-[#0A7B44] hover:bg-[#065F33] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        >
          <FaArrowRotateRight />
          {checking ? 'Checking…' : "I've verified my email"}
        </button>

        <button
          onClick={handleResend}
          className="text-sm text-[#0A7B44] font-semibold hover:underline"
        >
          Resend verification email
        </button>
      </div>

      <div className="mt-auto text-center text-sm text-gray-500 pb-4">
        <button onClick={handleLogout} className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-800">
          <FaRightFromBracket /> Log out
        </button>
      </div>
    </div>
  );
};

export default VerifyEmail;