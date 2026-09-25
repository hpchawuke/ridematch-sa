import React from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import {
  FaArrowLeft, FaCircleCheck, FaStar, FaCarSide, 
  FaLocationDot, FaClock, FaUser, FaPhone, FaEnvelope,
  FaRightFromBracket, FaHouse, FaMagnifyingGlass, 
  FaCalendarDays, FaPenToSquare
} from 'react-icons/fa6';
import { auth } from '../firebase';
import { useAuth } from '../context/AuthContext';

const Profile = () => {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <p className="text-gray-500">Loading…</p>
      </div>
    );
  }

  const isDriver = profile?.userType === 'Driver';
  const isVerified = user?.emailVerified === true;

  // Fallbacks for data not yet in the profile object
  const displayName = profile?.fullName || 'User Name';
  const displayPhone = profile?.phone || '—';
  const displayEmail = user?.email || '—';
  const vehicle = profile?.vehicle || 'Toyota Corolla'; // Placeholder
  const route = profile?.route || 'Gauteng → Limpopo'; // Placeholder
  const memberSince = profile?.createdAt ? new Date(profile.createdAt).getFullYear() : '2024';
  const rating = profile?.rating || '4.8';
  const trips = profile?.trips || '24';
  const aboutMe = profile?.aboutMe || 'Safe, friendly and punctual. Travelling regularly between Johannesburg and Polokwane.';

  return (
    <div className="flex-1 flex flex-col bg-gray-50 h-screen relative">
      
      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto pb-20">
        
        {/* Header */}
        <div className="bg-white px-6 pt-6 pb-6 border-b border-gray-100">
          <div className="flex items-center justify-between mb-6">
            {/* Back Button (Left) */}
            <button 
              onClick={() => navigate('/')} 
              className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors text-[#0A7B44]"
            >
              <FaArrowLeft className="text-xl" />
            </button>

            {/* Logo / Title (Center) */}
            <div className="text-center flex-1">
              <h1 className="text-lg font-bold text-gray-900">
                {isDriver ? 'Driver Profile' : 'Passenger Profile'}
              </h1>
            </div>

            {/* Logout (Right) */}
            <button
              onClick={handleLogout}
              className="p-2 -mr-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-gray-600"
              title="Log out"
            >
              <FaRightFromBracket />
            </button>
          </div>

          {/* Profile Header Info (Avatar + Name + Rating) */}
          <div className="flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-full bg-gray-200 mb-3 overflow-hidden border-4 border-white shadow-sm">
              {/* Replace with actual image: <img src={profile?.photoURL} alt="Profile" className="w-full h-full object-cover" /> */}
              <div className="w-full h-full flex items-center justify-center bg-[#0A7B44] text-white text-3xl font-bold">
                {displayName.charAt(0)}
              </div>
            </div>
            
            <h2 className="text-xl font-bold text-gray-900">{displayName}</h2>
            
            {/* Verified Badge */}
            {isVerified && (
              <div className="flex items-center gap-1 bg-[#0A7B44] text-white text-xs px-3 py-1 rounded-full mt-2">
                <FaCircleCheck />
                <span>Verified</span>
              </div>
            )}

            {/* Rating (Only for Drivers) */}
            {isDriver && (
              <div className="flex items-center gap-1 text-sm text-gray-600 mt-3">
                <FaStar className="text-yellow-400" />
                <span className="font-semibold text-gray-900">{rating}</span>
                <span>({trips} trips)</span>
              </div>
            )}
          </div>
        </div>

        {/* Details Section */}
        <div className="px-6 mt-4">
          <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
            
            {/* Driver-specific details */}
            {isDriver && (
              <>
                <DetailRow icon={<FaCarSide />} text={vehicle} />
                <DetailRow icon={<FaLocationDot />} text={route} />
              </>
            )}

            {/* Common details */}
            <DetailRow icon={<FaClock />} text={`Member since ${memberSince}`} />
            
            {/* Passenger-specific details (Phone/Email) */}
            {!isDriver && (
              <>
                <DetailRow icon={<FaPhone />} text={displayPhone} />
                <DetailRow icon={<FaEnvelope />} text={displayEmail} />
              </>
            )}
          </div>
        </div>

        {/* About Me Section */}
        <div className="px-6 mt-6 mb-8">
          <h3 className="text-sm font-semibold text-gray-500 mb-3">About me</h3>
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <p className="text-sm text-gray-600 leading-relaxed">
              {aboutMe}
            </p>
          </div>
        </div>

        {/* Edit Profile Button */}
        <div className="px-6 mb-8">
          <button 
            onClick={() => navigate('/edit-profile')}
            className="w-full py-4 rounded-xl font-semibold text-white bg-[#0A7B44] hover:bg-[#065F33] transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <FaPenToSquare />
            Edit Profile
          </button>
        </div>

      </div>

      {/* --- BOTTOM NAVIGATION BAR --- */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-between items-center px-6 py-2 pb-safe">
        
        {/* Home */}
        <button 
          onClick={() => navigate('/')}
          className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600"
        >
          <FaHouse className="text-xl" />
          <span className="text-[10px]">Home</span>
        </button>

        {/* Search */}
        <button className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600">
          <FaMagnifyingGlass className="text-xl" />
          <span className="text-[10px]">Search</span>
        </button>

        {/* Post Ride */}
        <button className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600">
          <FaCarSide className="text-xl" />
          <span className="text-[10px]">Post Ride</span>
        </button>

        {/* Bookings */}
        <button className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600">
          <FaCalendarDays className="text-xl" />
          <span className="text-[10px]">Bookings</span>
        </button>

        {/* Profile (Active) */}
        <button className="flex flex-col items-center gap-1 text-[#0A7B44]">
          <FaUser className="text-xl" />
          <span className="text-[10px] font-medium">Profile</span>
        </button>

      </div>
    </div>
  );
};

/* ---------- Helper Component for Detail Rows ---------- */
function DetailRow({ icon, text }) {
  return (
    <div className="flex items-center gap-3 text-gray-700">
      <span className="text-[#0A7B44] w-5 flex justify-center">{icon}</span>
      <span className="text-sm font-medium">{text}</span>
    </div>
  );
}

export default Profile;