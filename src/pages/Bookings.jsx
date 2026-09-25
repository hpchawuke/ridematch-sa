import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaCalendarDays } from 'react-icons/fa6';

const Bookings = () => {
  const navigate = useNavigate();
  return (
    <div className="flex-1 flex flex-col bg-gray-50 h-screen">
      <div className="bg-[#0A7B44] text-white px-6 py-5 flex items-center gap-3">
        <button onClick={() => navigate('/home')} className="p-1">
          <FaArrowLeft />
        </button>
        <h1 className="text-lg font-bold">My Bookings</h1>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-6 text-center">
        <FaCalendarDays className="text-4xl mb-3" />
        <p className="text-sm">Your booked trips will appear here.</p>
      </div>
    </div>
  );
};

export default Bookings;