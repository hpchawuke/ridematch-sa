import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FaArrowLeft, FaUser, FaEnvelope, FaPhone, FaLock, FaCircleCheck } from 'react-icons/fa6';
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const Signup = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const userType = searchParams.get('type') || 'Passenger';

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [showVerifyScreen, setShowVerifyScreen] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignup = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      alert("Passwords don't match!");
      return;
    }

    setLoading(true);

    try {
      // 1. Create the user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      const user = userCredential.user;

      // 2. Set the display name on the auth user
      await updateProfile(user, { displayName: formData.fullName });

      // 3. Send the verification email
      await sendEmailVerification(user);

      // 4. Save the user profile in Firestore
      await setDoc(doc(db, "users", user.uid), {
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        userType: userType,
        verified: false,
        createdAt: new Date().toISOString(),
      });

      console.log("User created:", user.uid);

      // 5. Show the verification screen instead of redirecting
      setShowVerifyScreen(true);

    } catch (error) {
      console.error("Signup error:", error.code, error.message);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    setResending(true);
    setResendMessage('');
    try {
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        setResendMessage("Verification email resent!");
      }
    } catch (error) {
      setResendMessage(`Error: ${error.message}`);
    } finally {
      setResending(false);
    }
  };

  const handleCheckVerification = async () => {
    try {
      if (!auth.currentUser) return;
      await auth.currentUser.reload();
      if (auth.currentUser.emailVerified) {
        // Email is verified — let them in
        navigate('/home');
      } else {
        alert("Email not verified yet. Please check your inbox and click the link.");
      }
    } catch (error) {
      console.error("Error checking verification:", error);
      alert("Could not check verification status. Try again.");
    }
  };

  // ============================================
  // VERIFICATION SCREEN
  // ============================================
  if (showVerifyScreen) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-white text-center">
        <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mb-6">
          <FaCircleCheck className="text-4xl text-[#0A7B44]" />
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Verify Your Email
        </h2>
        <p className="text-sm text-gray-500 mb-2">
          We've sent a verification link to:
        </p>
        <p className="text-sm font-semibold text-gray-800 mb-6">
          {formData.email}
        </p>

        <p className="text-xs text-gray-500 mb-8 max-w-xs">
          Click the link in the email to verify your account. Once verified,
          press the button below to continue.
        </p>

        <button
          onClick={handleCheckVerification}
          className="w-full max-w-xs py-4 rounded-xl font-semibold text-white bg-[#0A7B44] hover:bg-[#065F33] transition-colors mb-3"
        >
          I've Verified My Email
        </button>

        <button
          onClick={handleResendEmail}
          disabled={resending}
          className="w-full max-w-xs py-3 rounded-xl font-medium text-[#0A7B44] border border-[#0A7B44] hover:bg-green-50 transition-colors disabled:opacity-60"
        >
          {resending ? 'Resending...' : 'Resend Email'}
        </button>

        {resendMessage && (
          <p className="text-xs text-gray-600 mt-4">{resendMessage}</p>
        )}

        <p className="text-xs text-gray-400 mt-8">
          Didn't get the email? Check your spam folder.
        </p>
      </div>
    );
  }

  // ============================================
  // SIGN-UP FORM
  // ============================================
  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto bg-white">
      <div className="relative mb-6 pt-2">
        <button
          onClick={() => navigate('/user-type')}
          className="absolute left-0 top-0 p-2 text-gray-700 hover:text-black"
        >
          <FaArrowLeft className="text-xl" />
        </button>
        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-1">
          {userType} Sign Up
        </h2>
        <p className="text-sm text-gray-500">Create your RideMatch SA account</p>
      </div>

      <form onSubmit={handleSignup} className="flex flex-col gap-4">
        <div className="flex items-center border border-gray-200 rounded-xl px-4 focus-within:border-[#0A7B44] bg-white">
          <FaUser className="text-gray-400 mr-3" />
          <input type="text" name="fullName" placeholder="Full Name" onChange={handleChange} className="w-full py-4 outline-none text-sm" required />
        </div>

        <div className="flex items-center border border-gray-200 rounded-xl px-4 focus-within:border-[#0A7B44] bg-white">
          <FaEnvelope className="text-gray-400 mr-3" />
          <input type="email" name="email" placeholder="Email Address" onChange={handleChange} className="w-full py-4 outline-none text-sm" required />
        </div>

        <div className="flex items-center border border-gray-200 rounded-xl px-4 focus-within:border-[#0A7B44] bg-white">
          <FaPhone className="text-gray-400 mr-3" />
          <input type="tel" name="phone" placeholder="Phone Number" onChange={handleChange} className="w-full py-4 outline-none text-sm" required />
        </div>

        <div className="flex items-center border border-gray-200 rounded-xl px-4 focus-within:border-[#0A7B44] bg-white">
          <FaLock className="text-gray-400 mr-3" />
          <input type="password" name="password" placeholder="Create Password" onChange={handleChange} className="w-full py-4 outline-none text-sm" required />
        </div>

        <div className="flex items-center border border-gray-200 rounded-xl px-4 focus-within:border-[#0A7B44] bg-white">
          <FaLock className="text-gray-400 mr-3" />
          <input type="password" name="confirmPassword" placeholder="Confirm Password" onChange={handleChange} className="w-full py-4 outline-none text-sm" required />
        </div>

        <div className="flex items-start gap-2 mt-2">
          <input type="checkbox" id="terms" className="mt-1 accent-[#0A7B44]" required />
          <label htmlFor="terms" className="text-xs text-gray-500 leading-tight">
            I agree to the <a href="#" className="text-[#0A7B44] underline">Terms of Service</a> and <a href="#" className="text-[#0A7B44] underline">Privacy Policy</a>. I understand RideMatch SA is a marketplace platform.
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 mt-2 rounded-xl font-semibold text-white bg-[#0A7B44] hover:bg-[#065F33] transition-colors disabled:opacity-60"
        >
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      <div className="mt-auto text-center text-sm text-gray-500 pb-4 pt-6">
        Already have an account?{' '}
        <button onClick={() => navigate('/login')} className="text-[#0A7B44] font-semibold hover:underline">
          Login
        </button>
      </div>
    </div>
  );
};

export default Signup;