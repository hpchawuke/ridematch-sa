import React from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

const Home = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-white text-center">
      <h1 className="text-3xl font-bold text-[#0A7B44] mb-2">Welcome Home 🏠</h1>
      <p className="text-sm text-gray-500 mb-8">You are logged in to RideMatch SA.</p>
      
      <button
        onClick={handleLogout}
        className="px-6 py-3 rounded-xl font-semibold text-white bg-[#0A7B44] hover:bg-[#065F33] transition-colors"
      >
        Log Out
      </button>
    </div>
  );
};

export default Home;