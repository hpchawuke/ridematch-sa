import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaRightFromBracket, FaUser, FaPhone, FaCircleCheck, FaTriangleExclamation,
  FaLocationDot, FaMagnifyingGlassLocation, FaCar, FaWallet, FaClockRotateLeft
} from 'react-icons/fa6';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

const PassengerHome = () => {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [booking, setBooking] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleBookRide = async () => {
    console.log("BUTTON CLICKED!", pickup, dropoff);

    if (!pickup || !dropoff) {
      alert('Please enter both pickup and drop-off locations.');
      return;
    }

    try {
      setBooking(true);
      const { error } = await supabase.from('ride_requests').insert({
        passenger_id: user.id,
        passenger_name: profile?.full_name || user.email,
        passenger_phone: profile?.phone || 'N/A',
        pickup,
        dropoff,
        status: 'pending',
        driver_id: null,
      });

      if (error) throw error;

      alert('Ride request sent!');
      setPickup('');
      setDropoff('');
    } catch (error) {
      console.error('Error booking ride:', error);
      alert('Failed to book ride. Please try again.');
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading…</p>
      </div>
    );
  }

  const firstName = profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'there';
  const isVerified = profile?.verified === true;

  return (
    <div className="flex-1 flex flex-col bg-gray-50 overflow-y-auto">
      <div className="bg-[#0A7B44] text-white px-6 pt-6 pb-8 rounded-b-3xl">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-sm text-green-100">Welcome back, passenger</p>
            <h1 className="text-2xl font-bold">{firstName} 👋</h1>
          </div>
          <button onClick={handleLogout} className="p-2 rounded-full bg-white/15 hover:bg-white/25 transition-colors" title="Log out">
            <FaRightFromBracket />
          </button>
        </div>
      </div>

      {!isVerified && (
        <div className="px-6 -mt-2 mb-2">
          <div className="flex items-start gap-2 bg-yellow-100 border border-yellow-300 rounded-xl px-3 py-2 text-xs text-yellow-800">
            <FaTriangleExclamation className="mt-0.5 flex-shrink-0" />
            <span>Your account isn't verified yet. Verify to start booking rides.</span>
          </div>
        </div>
      )}

      <div className="px-6 -mt-4">
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Where to?</h2>
          <p className="text-sm text-gray-500 mb-4">Book a ride in seconds</p>

          <div className="flex items-center border border-gray-200 rounded-xl px-4 mb-3">
            <FaLocationDot className="text-[#0A7B44] mr-3" />
            <input
              type="text"
              placeholder="Pickup location"
              value={pickup}
              onChange={(e) => setPickup(e.target.value)}
              className="w-full py-3 outline-none text-sm"
            />
          </div>
          <div className="flex items-center border border-gray-200 rounded-xl px-4 mb-4">
            <FaMagnifyingGlassLocation className="text-[#0A7B44] mr-3" />
            <input
              type="text"
              placeholder="Drop-off location"
              value={dropoff}
              onChange={(e) => setDropoff(e.target.value)}
              className="w-full py-3 outline-none text-sm"
            />
          </div>

          <button
            onClick={handleBookRide}
            disabled={booking}
            className="w-full py-3 rounded-xl font-semibold text-white bg-[#0A7B44] hover:bg-[#065F33] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <FaCar /> {booking ? 'Booking...' : 'Book a Ride'}
          </button>

          <div className="grid grid-cols-2 gap-3 mt-5">
            <QuickCard icon={<FaClockRotateLeft />} label="Recent Rides" />
            <QuickCard icon={<FaWallet />} label="Payment" />
          </div>
        </div>
      </div>

      <div className="px-6 mt-6 mb-8">
        <h2 className="text-sm font-semibold text-gray-500 mb-3">ACCOUNT</h2>
        <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
          <Row icon={<FaUser />} label="Name" value={profile?.full_name || '—'} />
          <Row icon={<FaPhone />} label="Phone" value={profile?.phone || '—'} />
          <Row icon={<FaCircleCheck className={isVerified ? 'text-green-500' : 'text-gray-300'} />} label="Verified" value={isVerified ? 'Yes' : 'No'} />
        </div>
      </div>
    </div>
  );
};

function Row({ icon, label, value }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="text-gray-400">{icon}</span>
      <span className="text-sm text-gray-500 flex-1">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}

function QuickCard({ icon, label }) {
  return (
    <button className="flex flex-col items-start gap-1 p-4 rounded-xl border border-gray-100 bg-gray-50 hover:bg-gray-100 transition-colors text-left">
      <span className="text-[#0A7B44]">{icon}</span>
      <span className="text-xs text-gray-500">{label}</span>
    </button>
  );
}

export default PassengerHome;