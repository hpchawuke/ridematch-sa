import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaArrowLeft, FaCalendarDays, FaLocationDot, FaClock,
  FaPhone
} from 'react-icons/fa6';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

const Bookings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchBookings = async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('*, driver:users!bookings_driver_public_fkey(avatar_url)')
        .eq('passenger_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error(error);
      } else {
        setBookings(data);
      }
      setLoading(false);
    };

    fetchBookings();

    // Refetch whenever one of this passenger's bookings changes, so a
    // driver accepting/declining in MyTrips shows up here without a refresh
    const channel = supabase
      .channel(`bookings-passenger-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings', filter: `passenger_id=eq.${user.id}` },
        fetchBookings
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <div className="flex-1 flex flex-col bg-gray-50 h-screen">
      <div className="bg-[#0A7B44] text-white px-6 py-5 flex items-center gap-3">
        <button onClick={() => navigate('/home')} className="p-1">
          <FaArrowLeft />
        </button>
        <h1 className="text-lg font-bold">My Bookings</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-3">
        {loading && <p className="text-center text-sm text-gray-400">Loading…</p>}

        {!loading && bookings.length === 0 && (
          <div className="flex flex-col items-center justify-center text-gray-400 py-16 text-center">
            <FaCalendarDays className="text-4xl mb-3" />
            <p className="text-sm mb-4">You haven't booked any trips yet.</p>
            <button
              onClick={() => navigate('/search')}
              className="py-2 px-4 rounded-xl font-semibold text-white bg-[#0A7B44] hover:bg-[#065F33] text-sm"
            >
              Find a ride
            </button>
          </div>
        )}

        {bookings.map((b) => (
          <BookingCard key={b.id} booking={b} />
        ))}
      </div>
    </div>
  );
};

function BookingCard({ booking: b }) {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
          <FaLocationDot className="text-[#0A7B44]" />
          {b.from_city} → {b.to_city}
        </div>
        <StatusBadge status={b.status} />
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-gray-500 mb-3">
        <span className="flex items-center gap-1"><FaCalendarDays /> {b.date}</span>
        <span className="flex items-center gap-1"><FaClock /> {b.time}</span>
        <span className="font-semibold text-[#0A7B44]">R {b.price}</span>
      </div>

      <button
        onClick={() => navigate(`/driver/${b.driver_id}`)}
        className="flex items-center gap-2 text-xs text-gray-600 hover:text-gray-900"
      >
        <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
          {b.driver?.avatar_url ? (
            <img src={b.driver.avatar_url} alt={b.driver_name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[#0A7B44] text-white text-[10px] font-bold">
              {(b.driver_name || 'D').charAt(0)}
            </div>
          )}
        </div>
        <span className="font-medium">{b.driver_name}</span>
      </button>

      {/* Driver's number only appears once they've accepted the request */}
      {b.status === 'accepted' && b.driver_phone && (
        <a
          href={`tel:${b.driver_phone}`}
          className="mt-3 flex items-center justify-center gap-2 py-2 rounded-xl border border-[#0A7B44] text-[#0A7B44] text-sm font-medium hover:bg-green-50"
        >
          <FaPhone /> Call {b.driver_phone}
        </a>
      )}

      {b.status === 'pending' && (
        <p className="mt-3 text-xs text-gray-400">
          Waiting for the driver to confirm your seat.
        </p>
      )}

      {b.status === 'declined' && (
        <p className="mt-3 text-xs text-gray-400">
          The driver couldn't take this booking. Try another trip.
        </p>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  if (status === 'accepted') {
    return (
      <span className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-1 rounded-full">
        Accepted
      </span>
    );
  }
  if (status === 'declined') {
    return (
      <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-full">
        Declined
      </span>
    );
  }
  return (
    <span className="text-xs font-semibold text-yellow-700 bg-yellow-50 px-2 py-1 rounded-full">
      Pending
    </span>
  );
}

export default Bookings;