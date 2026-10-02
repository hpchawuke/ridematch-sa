import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaLocationDot, FaCalendarDays, FaClock, FaStar, FaUsers } from 'react-icons/fa6';
import { supabase } from '../supabaseClient';

const FILTERS = ['All', 'Today', 'Tomorrow', 'This Week'];

function toDateString(d) {
  return d.toISOString().split('T')[0];
}

export default function AvailableTrips({ from, to }) {
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    let cancelled = false;

    async function fetchTrips() {
      setLoading(true);
      setError('');

      const today = toDateString(new Date());

      let query = supabase
        .from('trips')
        .select(
          'id, driver_id, driver_name, driver_phone, from_city, to_city, date, time, price, seats_available, status, from_region, notes, driver:users!trips_driver_public_fkey(avatar_url, vehicle, rating)'
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

  const filteredTrips = useMemo(() => {
    if (filter === 'All') return trips;

    const today = new Date();
    const todayStr = toDateString(today);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = toDateString(tomorrow);

    const weekFromNow = new Date(today);
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    const weekStr = toDateString(weekFromNow);

    return trips.filter((t) => {
      if (filter === 'Today') return t.date === todayStr;
      if (filter === 'Tomorrow') return t.date === tomorrowStr;
      if (filter === 'This Week') return t.date >= todayStr && t.date <= weekStr;
      return true;
    });
  }, [trips, filter]);

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
        <h3 className="text-sm font-semibold text-gray-500 mb-3">AVAILABLE TRIPS</h3>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm p-4 animate-pulse">
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

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-500">AVAILABLE TRIPS</h3>
        <button onClick={goToSearch} className="text-xs text-[#0A7B44] font-medium">
          See all
        </button>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              filter === f
                ? 'bg-[#0A7B44] text-white border-[#0A7B44]'
                : 'bg-white text-gray-600 border-gray-200'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {filteredTrips.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-6 text-center text-sm text-gray-400">
          No trips available right now.
          <br />
          Check back soon or try a different route.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTrips.map((trip) => (
            <TripCard key={trip.id} trip={trip} navigate={navigate} />
          ))}
        </div>
      )}
    </div>
  );
}

function TripCard({ trip, navigate }) {
  const driver = trip.driver;

  const goToBook = () => navigate(`/book/${trip.id}`);
  const goToDriverProfile = (e) => {
    e.stopPropagation();
    navigate(`/driver/${trip.driver_id}`);
  };

  return (
    <div
      onClick={goToBook}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') goToBook();
      }}
      className="bg-white rounded-2xl shadow-sm p-4 hover:shadow-md transition-shadow cursor-pointer"
    >
      {/* Driver row + price */}
      <div className="flex items-start justify-between mb-3">
        <button
          type="button"
          onClick={goToDriverProfile}
          className="flex items-center gap-3 text-left"
        >
          <div className="w-11 h-11 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
            {driver?.avatar_url ? (
              <img src={driver.avatar_url} alt={trip.driver_name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[#0A7B44] text-white font-bold">
                {(trip.driver_name || 'D').charAt(0)}
              </div>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{trip.driver_name}</p>
            {driver?.rating && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <FaStar className="text-yellow-400" />
                {driver.rating}
              </div>
            )}
          </div>
        </button>

        <div className="text-right flex-shrink-0">
          <p className="text-[#0A7B44] font-bold text-sm">R{trip.price}</p>
          <p className="text-[10px] text-gray-400">per seat</p>
        </div>
      </div>

      {/* Route */}
      <div className="flex items-center gap-2 text-sm text-gray-700 mb-1">
        <FaLocationDot className="text-[#0A7B44] text-xs flex-shrink-0" />
        {trip.from_city} → {trip.to_city}
      </div>

      {/* Date + time */}
      <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
        <span className="flex items-center gap-1">
          <FaCalendarDays className="text-gray-400" /> {trip.date}
        </span>
        <span className="flex items-center gap-1">
          <FaClock className="text-gray-400" /> {trip.time?.slice(0, 5)}
        </span>
      </div>

      {/* Seats + Request Seat */}
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-xs text-gray-500">
          <FaUsers className="text-gray-400" />
          {trip.seats_available} seat{trip.seats_available > 1 ? 's' : ''} available
        </span>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            goToBook();
          }}
          className="bg-[#0A7B44] hover:bg-[#065F33] text-white text-xs font-semibold px-4 py-2 rounded-full transition-colors"
        >
          Request Seat
        </button>
      </div>
    </div>
  );
}