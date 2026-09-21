import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaUser, FaCar, FaChevronRight } from 'react-icons/fa6';

const UserType = () => {
  const navigate = useNavigate();

  return (
    <div className="flex-1 flex flex-col p-6 bg-white">
      {/* Header */}
      <div className="relative mb-8 pt-2">
        <button 
          onClick={() => navigate('/')} 
          className="absolute left-0 top-0 p-2 text-gray-700 hover:text-black transition-colors"
        >
          <FaArrowLeft className="text-xl" />
        </button>
        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-1">Create Account</h2>
        <p className="text-sm text-gray-500">Choose how you want to use RideMatch SA</p>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-4">
        {/* Passenger Card */}
        <div 
          onClick={() => navigate('/signup?type=Passenger')}
          className="group flex items-center p-5 border border-gray-200 rounded-2xl cursor-pointer hover:border-[#0A7B44] hover:bg-[#E8F5EE] hover:-translate-y-1 transition-all shadow-sm"
        >
          <div className="w-12 h-12 rounded-full bg-[#E8F5EE] text-[#0A7B44] flex justify-center items-center text-xl mr-4 group-hover:bg-[#0A7B44] group-hover:text-white transition-colors">
            <FaUser />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">Passenger</h3>
            <p className="text-xs text-gray-500">Find a seat and travel with verified drivers</p>
          </div>
          <FaChevronRight className="text-gray-400 group-hover:text-[#0A7B44]" />
        </div>

        {/* Driver Card */}
        <div 
          onClick={() => navigate('/signup?type=Driver')}
          className="group flex items-center p-5 border border-gray-200 rounded-2xl cursor-pointer hover:border-[#0A7B44] hover:bg-[#E8F5EE] hover:-translate-y-1 transition-all shadow-sm"
        >
          <div className="w-12 h-12 rounded-full bg-[#E8F5EE] text-[#0A7B44] flex justify-center items-center text-xl mr-4 group-hover:bg-[#0A7B44] group-hover:text-white transition-colors">
            <FaCar />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">Driver</h3>
            <p className="text-xs text-gray-500">Offer available trips and earn</p>
          </div>
          <FaChevronRight className="text-gray-400 group-hover:text-[#0A7B44]" />
        </div>
      </div>

      <div className="mt-auto text-center text-sm text-gray-500 pb-4">
        Already have an account?{' '}
        <button className="text-[#0A7B44] font-semibold hover:underline">
          Login
        </button>
      </div>
    </div>
  );
};

export default UserType;