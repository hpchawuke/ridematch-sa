import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaArrowLeft, FaLocationDot, FaCalendarDays, FaClock,
  FaPhone, FaUser, FaCircleCheck, FaXmark, FaHourglassHalf,
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
    let cancelled = false;

    const fetchBookings = async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('passenger_id', user.id)
        .order('created_at', { ascending: false });

      if (cancelled) return;
      if (error) {
        console.error(error);
        setBookings([]);
      } else {
        setBookings(data || []);
      }
      setLoading(false);
    };

    fetchBookings();

    const channel = supabase
      .channel(`bookings-passenger-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `passenger_id=eq.${user.id}`,
        },
        fetchBookings
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user]);

  const pending = bookings.filter((b) => b.status === 'pending');
  const accepted = bookings.filter((b) => b.status === 'accepted');
  const declined = bookings.filter((b) => b.status === 'declined');

  const renderCard = (b, tone) => {
    const toneMap = {
      pending: 'bg-yellow-50 border-yellow-200',
      accepted: 'bg-green-50 border-green-200',
      declined: 'bg-gray-50 border-gray-200',
    };
    const iconMap = {
      pending: <FaHourglassHalf className="text-yellow-600" />,
      accepted: <FaCircleCheck className="text-green-600" />,
      declined: <FaXmark className="text-gray-500" />,
    };

    return (
      <div
        key={b.id}
        className={`rounded-2xl border p-4 ${toneMap[tone]}`}
      >
        {/* Route */}
        <div className="flex items-center gap-2 mb-2 font-semibold text-gray-900">
          <FaLocationDot className="text-[#0A7B44]" />
          <span>{b.from_city}</span>
          <span className="text-gray-300">→</span>
          <span>{b.to_city}</span>
        </div>

        {/* Date + time + price */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600 mb-3">
          <span className="flex items-center gap-1">
            <FaCalendarDays className="text-gray-400" />
            {b.date}
          </span>
          <span className="flex items-center gap-1">
            <FaClock className="text-gray-400" />
            {b.time?.slice(0, 5)}
          </span>
          <span className="font-semibold text-[#0A7B44]">R{b.price}</span>
        </div>

        {/* Driver info — only show phone if accepted */}
        <div className="border-t border-black/5 pt-3 mt-2">
          <div className="flex items-center gap-2 text-xs text-gray-700 mb-1">
            <FaUser className="text-gray-400" />
            <span className="font-medium">{b.driver_name || 'Driver'}</span>
          </div>

          {tone === 'accepted' && b.driver_phone && (
            <a
              href={`tel:${b.driver_phone}`}
              className="flex items-center gap-2 text-xs text-[#0A7B44] font-medium"
            >
              <FaPhone />
              {b.driver_phone}
            </a>
          )}

          {tone === 'pending' && (
            <p className="text-xs text-gray-500 italic">
              Waiting for driver to confirm…
            </p>
          )}
          {tone === 'declined' && (
            <p className="text-xs text-gray-500 italic">
              Driver couldn't take this ride.
            </p>
          )}
        </div>

        {/* Status pill */}
        <div className="mt-3 flex items-center gap-1 text-xs font-medium">
          {iconMap[tone]}
          <span className="capitalize text-gray-700">{b.status}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50 h-screen">
      <div className="bg-[#0A7B44] text-white px-6 py-5 flex items-center gap-3">
        <button onClick={() => navigate('/home')} className="p-1">
          <FaArrowLeft />
        </button>
        <h1 className="text-lg font-bold">My Bookings</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {loading && (
          <p className="text-center text-sm text-gray-400 py-6">Loading…</p>
        )}

        {!loading && bookings.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-6 text-center">
            <FaCalendarDays className="text-4xl mb-3" />
            <p className="text-sm">Your booked trips will appear here.</p>
            <button
              onClick={() => navigate('/search')}
              className="mt-4 py-2 px-4 rounded-xl font-semibold text-white bg-[#0A7B44] hover:bg-[#065F33] text-sm"
            >
              Find a ride
            </button>
          </div>
        )}

        {!loading && accepted.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xs font-semibold text-gray-500 mb-2">
              CONFIRMED ({accepted.length})
            </h2>
            <div className="space-y-3">
              {accepted.map((b) => renderCard(b, 'accepted'))}
            </div>
          </div>
        )}

        {!loading && pending.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xs font-semibold text-gray-500 mb-2">
              PENDING ({pending.length})
            </h2>
            <div className="space-y-3">
              {pending.map((b) => renderCard(b, 'pending'))}
            </div>
          </div>
        )}

        {!loading && declined.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xs font-semibold text-gray-500 mb-2">
              DECLINED ({declined.length})
            </h2>
            <div className="space-y-3">
              {declined.map((b) => renderCard(b, 'declined'))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Bookings;