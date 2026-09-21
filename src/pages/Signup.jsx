import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FaArrowLeft, FaUser, FaEnvelope, FaPhone, FaLock } from 'react-icons/fa6';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const Signup = () => {
  const navigate = useNavigate();
  // Grab the ?type=passenger or ?type=driver from the URL
  const [searchParams] = useSearchParams();
  const userType = searchParams.get('type') || 'Passenger';

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignup = async (e) => {
  e.preventDefault();
  
  if (formData.password !== formData.confirmPassword) {
    alert("Passwords don't match!");
    return;
  }

  try {
    // 1. Create the user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      formData.email, 
      formData.password
    );
    const user = userCredential.user;

    // 2. Save the user profile in Firestore (Johannesburg DB!)
    await setDoc(doc(db, "users", user.uid), {
      fullName: formData.fullName,
      email: formData.email,
      phone: formData.phone,
      userType: userType, // "Passenger" or "Driver"
      verified: false,    // We'll flip this after OTP
      createdAt: new Date().toISOString(),
    });

    console.log("User created:", user.uid);
    alert(`Account created! Welcome, ${formData.fullName}.`);
    
  } catch (error) {
    console.error("Signup error:", error.message);
    alert(`Error: ${error.message}`);
  }
};

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto bg-white">
      {/* Header */}
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

      {/* Form */}
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

        {/* Legal Checkbox */}
        <div className="flex items-start gap-2 mt-2">
          <input type="checkbox" id="terms" className="mt-1 accent-[#0A7B44]" required />
          <label htmlFor="terms" className="text-xs text-gray-500 leading-tight">
            I agree to the <a href="#" className="text-[#0A7B44] underline">Terms of Service</a> and <a href="#" className="text-[#0A7B44] underline">Privacy Policy</a>. I understand RideMatch SA is a marketplace platform.
          </label>
        </div>

        <button type="submit" className="w-full py-4 mt-2 rounded-xl font-semibold text-white bg-[#0A7B44] hover:bg-[#065F33] transition-colors">
          Create Account
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