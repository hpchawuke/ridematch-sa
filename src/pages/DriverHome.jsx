import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaRightFromBracket, FaUser, FaPhone, FaCircleCheck, FaTriangleExclamation,
  FaWallet, FaClockRotateLeft, FaBell, FaToggleOn, FaToggleOff,
  FaCar, FaStar
} from 'react-icons/fa6';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

const DriverHome = () => {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();
  const [isOnline, setIsOnline] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading…</p>
      </div>
    );
  }

  const firstName = profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'driver';
  const isVerified = profile?.verified === true;

  return (
    <div className="flex-1 flex flex-col bg-gray-50 overflow-y-auto">
      <div className="bg-[#0A7B44] text-white px-6 pt-6 pb-8 rounded-b-3xl">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-sm text-green-100">Welcome back, driver</p>
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
            <span>Your account isn't verified yet. Verify to start accepting rides.</span>
          </div>
        </div>
      )}

      <div className="px-6 -mt-4 space-y-4">
        {/* Online toggle */}
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
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard icon={<FaWallet />} label="Today" value="R 0.00" />
          <StatCard icon={<FaCar />} label="Trips" value="0" />
          <StatCard icon={<FaStar />} label="Rating" value="—" />
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-500 mb-3">QUICK ACTIONS</h3>
          <div className="grid grid-cols-2 gap-3">
            <QuickCard icon={<FaClockRotateLeft />} label="Trip History" />
            <QuickCard icon={<FaWallet />} label="Earnings" />
          </div>
        </div>
      </div>

      {/* Account */}
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

function StatCard({ icon, label, value }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-3 flex flex-col items-center gap-1">
      <span className="text-[#0A7B44]">{icon}</span>
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-sm font-semibold text-gray-900">{value}</span>
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

export default DriverHome;