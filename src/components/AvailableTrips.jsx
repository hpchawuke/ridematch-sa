import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaLocationDot, FaClock, FaArrowRight } from 'react-icons/fa6';
import { supabase } from '../supabaseClient';

export default function AvailableTrips({ from, to }) {
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function fetchTrips() {
      setLoading(true);
      setError('');

      const today = new Date().toISOString().split('T')[0];

      let query = supabase
        .from('trips')
        .select(
          'id, driver_id, driver_name, driver_phone, from_city, to_city, date, time, price, seats_available, status, from_region, notes, driver:users!trips_driver_public_fkey(avatar_url, vehicle)'
        )
        .eq('status', 'active')
        .gt('seats_available', 0)
        .gte('date', today)
        .order('date', { ascending: true })
        .order('time', { ascending: true })
        .limit(10);

      if (from) query = query.ilike('from_city', `%${from}%`);
      if (to) query = query.ilike('to_city', `%${to}%`);

      const { data, error } = await query;

      if (cancelled) return;

      if (error) {
        console.error('Trip fetch error:', error);
        setError(error.message || 'Could not load trips right now.');
        setTrips([]);
      } else {
        setTrips(data || []);
      }
      setLoading(false);
    }

    fetchTrips();
    return () => {
      cancelled = true;
    };
  }, [from, to]);

  const goToSearch = () => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const qs = params.toString();
    navigate(qs ? `/search?${qs}` : '/search');
  };

  if (loading) {
    return (
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-gray-500 mb-3">
          AVAILABLE TRIPS
        </h3>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl shadow-sm p-4 animate-pulse"
            >
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-1/2 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-1/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-6 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl p-3">
        {error}
      </div>
    );
  }

  if (trips.length === 0) {
    return (
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-gray-500 mb-3">
          AVAILABLE TRIPS
        </h3>
        <div className="bg-white rounded-2xl shadow-sm p-6 text-center text-sm text-gray-400">
          No trips available right now.
          <br />
          Check back soon or try a different route.
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-500">AVAILABLE TRIPS</h3>
        <button
          onClick={goToSearch}
          className="text-xs text-[#0A7B44] font-medium"
        >
          See all
        </button>
      </div>

      <div className="space-y-3">
        {trips.map((trip) => (
          <div
            key={trip.id}
            onClick={() => navigate(`/book/${trip.id}`)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') navigate(`/book/${trip.id}`);
            }}
            className="w-full text-left bg-white rounded-2xl shadow-sm p-4 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2 text-gray-900 font-semibold">
                <FaLocationDot className="text-[#0A7B44] text-xs" />
                <span>{trip.from_city}</span>
                <FaArrowRight className="text-gray-300 text-xs" />
                <span>{trip.to_city}</span>
              </div>
              <span className="text-[#0A7B44] font-bold text-sm">
                R{trip.price}
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <FaClock className="text-gray-400" />
                {trip.date} · {trip.time?.slice(0, 5)}
              </span>
              <span>
                {trip.seats_available} seat
                {trip.seats_available > 1 ? 's' : ''} left
              </span>
            </div>

            {trip.driver_name && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/driver/${trip.driver_id}`);
                }}
                className="flex items-center gap-2 mt-2 text-xs text-gray-600 hover:text-gray-900"
              >
                <div className="w-5 h-5 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                  {trip.driver?.avatar_url ? (
                    <img
                      src={trip.driver.avatar_url}
                      alt={trip.driver_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#0A7B44] text-white text-[8px] font-bold">
                      {trip.driver_name.charAt(0)}
                    </div>
                  )}
                </div>
                <span>{trip.driver_name}</span>
                {trip.driver?.vehicle && (
                  <span className="text-gray-400">· {trip.driver.vehicle}</span>
                )}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}