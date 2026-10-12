import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  FaArrowLeft, FaCircleCheck, FaStar, FaCarSide, FaLocationDot, FaClock
} from 'react-icons/fa6';
import { supabase } from '../supabaseClient';

const DriverProfile = () => {
  const navigate = useNavigate();
  const { driverId } = useParams();
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchDriver = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, user_type, verified, created_at, avatar_url, vehicle, route, rating, trips, about_me')
        .eq('id', driverId)
        .eq('user_type', 'Driver')
        .maybeSingle();

      if (error) {
        console.error(error);
      }
      if (!data) {
        setNotFound(true);
      } else {
        setDriver(data);
      }
      setLoading(false);
    };

    fetchDriver();
  }, [driverId]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white h-screen">
        <p className="text-gray-500">Loading…</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-white h-screen text-center p-6">
        <p className="text-gray-500 mb-4">This driver profile isn't available.</p>
        <button
          onClick={() => navigate(-1)}
          className="text-sm font-semibold text-[#0A7B44] hover:underline"
        >
          Go back
        </button>
      </div>
    );
  }

  const displayName = driver.full_name || 'Driver';
  const vehicle = driver.vehicle || 'Toyota Corolla';
  const route = driver.route || 'Gauteng → Limpopo';
  const rating = driver.rating || '4.8';
  const trips = driver.trips || '0';
  const aboutMe = driver.about_me ||
    'Safe, friendly and punctual. Travelling regularly between Johannesburg and Polokwane.';
  const memberSince = driver.created_at
    ? new Date(driver.created_at).getFullYear()
    : new Date().getFullYear();

  return (
    <div className="flex-1 flex flex-col bg-gray-50 h-screen">
      <div className="bg-white px-6 pt-6 pb-6 border-b border-gray-100">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 mb-4 rounded-full hover:bg-gray-100 transition-colors text-[#0A7B44]"
        >
          <FaArrowLeft className="text-xl" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="w-24 h-24 rounded-full bg-gray-200 mb-3 overflow-hidden border-4 border-white shadow-sm">
            {driver.avatar_url ? (
              <img src={driver.avatar_url} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[#0A7B44] text-white text-3xl font-bold">
                {displayName.charAt(0)}
              </div>
            )}
          </div>

          <h2 className="text-xl font-bold text-gray-900">{displayName}</h2>

          {driver.verified && (
            <div className="flex items-center gap-1 bg-[#0A7B44] text-white text-xs px-3 py-1 rounded-full mt-2">
              <FaCircleCheck />
              <span>Verified</span>
            </div>
          )}

          <div className="flex items-center gap-1 text-sm text-gray-600 mt-3">
            <FaStar className="text-yellow-400" />
            <span className="font-semibold text-gray-900">{rating}</span>
            <span>({trips} trips)</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-6 mt-4">
          <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
            <DetailRow icon={<FaCarSide />} text={vehicle} />
            <DetailRow icon={<FaLocationDot />} text={route} />
            <DetailRow icon={<FaClock />} text={`Member since ${memberSince}`} />
          </div>
        </div>

        <div className="px-6 mt-6 mb-8">
          <h3 className="text-sm font-semibold text-gray-500 mb-3">About</h3>
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <p className="text-sm text-gray-600 leading-relaxed">{aboutMe}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

function DetailRow({ icon, text }) {
  return (
    <div className="flex items-center gap-3 text-gray-700">
      <span className="text-[#0A7B44] w-5 flex justify-center">{icon}</span>
      <span className="text-sm font-medium">{text}</span>
    </div>
  );
}

export default DriverProfile;
