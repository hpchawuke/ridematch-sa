import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCarSide, FaShieldHalved, FaCircleCheck, FaStar } from 'react-icons/fa6';

const Splash = () => {
  const navigate = useNavigate();

  return (
    <div 
      className="flex-1 flex flex-col justify-end relative"
      style={{
        backgroundImage: "url('https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?q=80&w=1000&auto=format&fit=crop')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>

      <div className="relative z-10 flex-1 flex flex-col justify-center items-center text-white px-6 text-center">
        <div className="flex items-center gap-3 mb-2">
          <FaCarSide className="text-4xl text-green-400" />
          <h1 className="text-3xl font-bold tracking-tight">RideMatch <span className="text-green-400">SA</span></h1>
        </div>
        <p className="text-sm opacity-90 mb-6 font-medium">Travel Together • Share the Journey</p>
        
        <div className="flex gap-4 text-xs bg-white/10 px-5 py-2.5 rounded-full backdrop-blur-md border border-white/20">
          <span className="flex items-center gap-1.5"><FaShieldHalved className="text-green-400" /> Safe</span>
          <span className="flex items-center gap-1.5"><FaCircleCheck className="text-green-400" /> Verified</span>
          <span className="flex items-center gap-1.5"><FaStar className="text-green-400" /> Reliable</span>
        </div>
      </div>

      <div className="relative z-10 bg-white p-6 rounded-t-[2rem] flex flex-col gap-3">
        <button 
          onClick={() => navigate('/user-type')}
          className="w-full py-4 rounded-xl font-semibold text-white bg-[#0A7B44] hover:bg-[#065F33] transition-colors shadow-lg shadow-green-900/20"
        >
          Get Started
        </button>
        <button 
          onClick={() => navigate('/login')}
          className="w-full py-4 rounded-xl font-semibold text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          I already have an account
        </button>
      </div>
    </div>
  );
};

export default Splash;