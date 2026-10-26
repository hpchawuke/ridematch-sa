import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaRightFromBracket, FaClockRotateLeft, FaBell, FaToggleOn, FaToggleOff,
  FaUser, FaTriangleExclamation, FaShieldHalved,
  FaHouse, FaMagnifyingGlass, FaCalendarDays, FaCarSide
} from 'react-icons/fa6';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import AvailableTrips from '../components/AvailableTrips';
import VerificationModal from '../components/VerificationModal';
import InstallPrompt from '../components/InstallPrompt';

const Home = () => {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();
  const [isOnline, setIsOnline] = useState(false);

  // Admin is independent of being a Driver or Passenger — checked
  // separately so the entry point only shows for the handful of accounts
  // actually in the admins table.
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    if (!user) return;
    supabase
      .from('admins')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => setIsAdmin(Boolean(data)));
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <p className="text-gray-500">Loading…</p>
      </div>
    );
  }

  const firstName = profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'there';
  const isDriver = profile?.user_type === 'Driver';
  // Firebase's `emailVerified` boolean maps to Supabase's `email_confirmed_at`
  // timestamp (null until confirmed). We also keep profile.verified in sync
  // server-side via a DB trigger, so either works — this checks the source
  // of truth directly.
  const isVerified = Boolean(user?.email_confirmed_at);

  return (
    <div className="flex-1 flex flex-col bg-gray-50 h-screen relative">
      <VerificationModal />

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto pb-24">

        {/* Header */}
        <div className="bg-[#0A7B44] text-white px-6 pt-6 pb-8 rounded-b-3xl">
          <div className="flex items-center justify-between mb-6">
            <div className="w-8" />
            <div className="text-center flex-1">
              <p className="text-xs text-green-100">Welcome back, {isDriver ? 'driver' : 'passenger'}</p>
              <h1 className="text-xl font-bold">{firstName} 👋</h1>
              <InstallPrompt />
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <button
                  onClick={() => navigate('/admin/verifications')}
                  className="p-2 rounded-full bg-white/15 hover:bg-white/25 transition-colors"
                  title="Admin: Driver Verifications"
                >
                  <FaShieldHalved />
                </button>
              )}
              <button
                onClick={handleLogout}
                className="p-2 rounded-full bg-white/15 hover:bg-white/25 transition-colors"
                title="Log out"
              >
                <FaRightFromBracket />
              </button>
            </div>
          </div>

          {!isVerified && (
            <div className="flex items-start gap-2 bg-yellow-400/20 border border-yellow-300/40 rounded-xl px-3 py-2 text-xs">
              <FaTriangleExclamation className="mt-0.5 flex-shrink-0" />
              <span>
                Your account isn't verified yet. Verify to start{' '}
                {isDriver ? 'accepting rides' : 'booking rides'}.
              </span>
            </div>
          )}
        </div>

        {/* Main content — role-based */}
        <div className="px-6 -mt-4">
          {isDriver ? (
            <DriverView isOnline={isOnline} setIsOnline={setIsOnline} navigate={navigate} />
          ) : (
            <PassengerView />
          )}
        </div>
      </div>

      {/* --- BOTTOM NAVIGATION BAR --- */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center px-4 py-2">
        <NavBtn
          icon={<FaHouse />}
          label="Home"
          active
          onClick={() => navigate('/home')}
        />

        {isDriver ? (
          <NavBtn
            icon={<FaCarSide />}
            label="Post Ride"
            onClick={() => navigate('/post-ride')}
          />
        ) : (
          <NavBtn
            icon={<FaMagnifyingGlass />}
            label="Search"
            onClick={() => navigate('/search')}
          />
        )}

        <NavBtn
          icon={<FaCalendarDays />}
          label={isDriver ? 'My Trips' : 'Bookings'}
          onClick={() => navigate(isDriver ? '/my-trips' : '/bookings')}
        />

        <NavBtn
          icon={<FaUser />}
          label="Profile"
          onClick={() => navigate('/profile')}
        />
      </div>
    </div>
  );
};

/* ---------- Passenger view ---------- */
function PassengerView() {
  return (
    <div>
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Where to?</h2>
        <p className="text-sm text-gray-500">
          Find a ride in seconds, or scroll down to see what's available now
        </p>
      </div>

      {/* No from/to filtering now that the search fields are gone — this
          just shows every upcoming active trip. */}
      <AvailableTrips from="" to="" />
    </div>
  );
}

/* ---------- Driver view ---------- */
function DriverView({ isOnline, setIsOnline, navigate }) {
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
        <QuickCard
          icon={<FaCarSide />}
          label="Post a Trip"
          onClick={() => navigate('/post-ride')}
        />
        <QuickCard
          icon={<FaClockRotateLeft />}
          label="My Trips"
          onClick={() => navigate('/my-trips')}
        />
      </div>
    </div>
  );
}

/* ---------- Small building blocks ---------- */
function NavBtn({ icon, label, onClick, active }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 ${
        active ? 'text-[#0A7B44]' : 'text-gray-400 hover:text-gray-600'
      }`}
    >
      <span className="text-xl">{icon}</span>
      <span className={`text-[10px] ${active ? 'font-medium' : ''}`}>{label}</span>
    </button>
  );
}

function QuickCard({ icon, label, value, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-start gap-1 p-4 rounded-xl border border-gray-100 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
    >
      <span className="text-[#0A7B44]">{icon}</span>
      <span className="text-xs text-gray-500">{label}</span>
      {value && <span className="text-sm font-semibold text-gray-900">{value}</span>}
    </button>
  );
}

export default Home;