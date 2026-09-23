import React from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import {
  FaRightFromBracket, FaLocationDot, FaMagnifyingGlassLocation,
  FaCar, FaWallet, FaClockRotateLeft, FaBell, FaToggleOn, FaToggleOff,
  FaUser, FaPhone, FaCircleCheck, FaTriangleExclamation
} from 'react-icons/fa6';
import { auth } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

const Home = () => {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();
  const [isOnline, setIsOnline] = useState(false);

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

  const firstName = profile?.fullName?.split(' ')[0] || user?.email?.split('@')[0] || 'there';
  const isDriver = profile?.userType === 'Driver';
  const isVerified = user?.emailVerified === true;

  return (
    <div className="flex-1 flex flex-col bg-gray-50 overflow-y-auto">
      {/* Header */}
      <div className="bg-[#0A7B44] text-white px-6 pt-6 pb-8 rounded-b-3xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm text-green-100">Welcome back,</p>
            <h1 className="text-2xl font-bold">{firstName} 👋</h1>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-full bg-white/15 hover:bg-white/25 transition-colors"
            title="Log out"
          >
            <FaRightFromBracket />
          </button>
        </div>

        {/* Verification banner */}
        {!isVerified && (
          <div className="flex items-start gap-2 bg-yellow-400/20 border border-yellow-300/40 rounded-xl px-3 py-2 text-xs">
            <FaTriangleExclamation className="mt-0.5 flex-shrink-0" />
            <span>Your account isn't verified yet. Verify to start {isDriver ? 'accepting rides' : 'booking rides'}.</span>
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="px-6 -mt-4">
        {isDriver ? <DriverHome isOnline={isOnline} setIsOnline={setIsOnline} /> : <PassengerHome />}
      </div>

      {/* Profile summary */}
      <div className="px-6 mt-6 mb-8">
        <h2 className="text-sm font-semibold text-gray-500 mb-3">ACCOUNT</h2>
        <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
          <Row icon={<FaUser />} label="Name" value={profile?.fullName || '—'} />
          <Row icon={<FaPhone />} label="Phone" value={profile?.phone || '—'} />
          <Row
            icon={<FaCircleCheck className={isVerified ? 'text-green-500' : 'text-gray-300'} />}
            label="Verified"
            value={isVerified ? 'Yes' : 'No'}
          />
        </div>
      </div>
    </div>
  );
};

/* ---------- Passenger view ---------- */
function PassengerHome() {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <h2 className="text-lg font-bold text-gray-900 mb-1">Where to?</h2>
      <p className="text-sm text-gray-500 mb-4">Book a ride in seconds</p>

      <div className="flex items-center border border-gray-200 rounded-xl px-4 mb-3">
        <FaLocationDot className="text-[#0A7B44] mr-3" />
        <input
          type="text"
          placeholder="Pickup location"
          className="w-full py-3 outline-none text-sm"
        />
      </div>
      <div className="flex items-center border border-gray-200 rounded-xl px-4 mb-4">
        <FaMagnifyingGlassLocation className="text-[#0A7B44] mr-3" />
        <input
          type="text"
          placeholder="Drop-off location"
          className="w-full py-3 outline-none text-sm"
        />
      </div>

      <button className="w-full py-3 rounded-xl font-semibold text-white bg-[#0A7B44] hover:bg-[#065F33] transition-colors flex items-center justify-center gap-2">
        <FaCar /> Book a Ride
      </button>

      <div className="grid grid-cols-2 gap-3 mt-5">
        <QuickCard icon={<FaClockRotateLeft />} label="Recent Rides" />
        <QuickCard icon={<FaWallet />} label="Payment" />
      </div>
    </div>
  );
}

/* ---------- Driver view ---------- */
function DriverHome({ isOnline, setIsOnline }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Driver Mode</h2>
          <p className="text-sm text-gray-500">
            {isOnline ? 'You are online — waiting for requests' : 'You are offline'}
          </p>
        </div>
        <button
          onClick={() => setIsOnline(!isOnline)}
          className={`text-4xl transition-colors ${isOnline ? 'text-[#0A7B44]' : 'text-gray-300'}`}
        >
          {isOnline ? <FaToggleOn /> : <FaToggleOff />}
        </button>
      </div>

      {isOnline ? (
        <div className="border border-dashed border-gray-300 rounded-xl py-8 text-center text-sm text-gray-400">
          <FaBell className="mx-auto mb-2 text-lg" />
          Waiting for ride requests…
        </div>
      ) : (
        <button
          onClick={() => setIsOnline(true)}
          className="w-full py-3 rounded-xl font-semibold text-white bg-[#0A7B44] hover:bg-[#065F33] transition-colors"
        >
          Go Online
        </button>
      )}

      <div className="grid grid-cols-2 gap-3 mt-5">
        <QuickCard icon={<FaWallet />} label="Earnings" value="R 0.00" />
        <QuickCard icon={<FaClockRotateLeft />} label="History" />
      </div>
    </div>
  );
}

/* ---------- Small building blocks ---------- */
function Row({ icon, label, value }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="text-gray-400">{icon}</span>
      <span className="text-sm text-gray-500 flex-1">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}

function QuickCard({ icon, label, value }) {
  return (
    <button className="flex flex-col items-start gap-1 p-4 rounded-xl border border-gray-100 bg-gray-50 hover:bg-gray-100 transition-colors text-left">
      <span className="text-[#0A7B44]">{icon}</span>
      <span className="text-xs text-gray-500">{label}</span>
      {value && <span className="text-sm font-semibold text-gray-900">{value}</span>}
    </button>
  );
}

export default Home;