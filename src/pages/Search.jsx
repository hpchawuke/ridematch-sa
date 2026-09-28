import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FaArrowLeft, FaLocationDot, FaFlagCheckered, FaCalendarDays,
  FaUser, FaClock, FaUsers, FaMagnifyingGlass,
} from 'react-icons/fa6';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

const GAUTENG = ['Johannesburg', 'Pretoria', 'Midrand', 'Soweto', 'Tembisa'];
const LIMPOPO = ['Polokwane', 'Mokopane', 'Thohoyandou', 'Musina', 'Tzaneen', 'Lebowakgomo'];

const Search = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const [fromCity, setFromCity] = useState(searchParams.get('from') || '');
  const [toCity, setToCity] = useState(searchParams.get('to') || '');
  const [date, setDate] = useState('');
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Load ALL available trips on mount
  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('status', 'active')
        .gt('seats_available', 0)
        .gte('date', today)
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (cancelled) return;
      if (error) {
        console.error(error);
        setTrips([]);
      } else {
        setTrips(data || []);
      }
      setLoading(false);
    }

    loadAll();
    return () => { cancelled = true; };
  }, []);

  // Client-side filtering (no extra network calls)
  const filtered = trips.filter((t) => {
    if (fromCity && t.from_city !== fromCity) return false;
    if (toCity && t.to_city !== toCity) return false;
    if (date && t.date !== date) return false;
    return true;
  });

  const allCities = [...GAUTENG, ...LIMPOPO].sort();

  const clearFilters = () => {
    setFromCity('');
    setToCity('');
    setDate('');
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50 h-screen">
      {/* Header */}
      <div className="bg-[#0A7B44] text-white px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/home')} className="p-1">
            <FaArrowLeft />
          </button>
          <h1 className="text-lg font-bold">Available Trips</h1>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="text-xs bg-white/15 hover:bg-white/25 px-3 py-2 rounded-lg font-medium flex items-center gap-1"
        >
          <FaMagnifyingGlass /> Filter
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-3">
        {/* Optional filter bar */}
        {showFilters && (
          <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
            <div className="flex items-center border border-gray-200 rounded-xl px-4">
              <FaLocationDot className="text-[#0A7B44] mr-3" />
              <select
                value={fromCity}
                onChange={(e) => setFromCity(e.target.value)}
                className="w-full py-3 outline-none text-sm bg-transparent"
              >
                <option value="">From… (any)</option>
                {allCities.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="flex items-center border border-gray-200 rounded-xl px-4">
              <FaFlagCheckered className="text-[#0A7B44] mr-3" />
              <select
                value={toCity}
                onChange={(e) => setToCity(e.target.value)}
                className="w-full py-3 outline-none text-sm bg-transparent"
              >
                <option value="">To… (any)</option>
                {allCities.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="flex items-center border border-gray-200 rounded-xl px-4">
              <FaCalendarDays className="text-[#0A7B44] mr-3" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full py-3 outline-none text-sm bg-transparent"
              />
            </div>

            <button
              onClick={clearFilters}
              className="w-full py-2 rounded-xl text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50"
            >
              Clear filters
            </button>
          </div>
        )}

        {loading && (
          <p className="text-center text-sm text-gray-400 py-6">Loading trips…</p>
        )}

        {!loading && filtered.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-6 text-center text-sm text-gray-400">
            No trips match your filters.
            {(fromCity || toCity || date) && (
              <button
                onClick={clearFilters}
                className="block mx-auto mt-3 text-[#0A7B44] font-medium"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {!loading && filtered.map((trip) => (
          <button
            key={trip.id}
            onClick={() => navigate(`/book/${trip.id}`)}
            className="w-full text-left bg-white rounded-2xl shadow-sm p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                <FaLocationDot className="text-[#0A7B44]" />
                {trip.from_city} → {trip.to_city}
              </div>
              <span className="font-bold text-[#0A7B44]">R {trip.price}</span>
            </div>

            <div className="flex flex-wrap gap-4 text-xs text-gray-500 mb-2">
              <span className="flex items-center gap-1">
                <FaCalendarDays /> {trip.date}
              </span>
              <span className="flex items-center gap-1">
                <FaClock /> {trip.time?.slice(0, 5)}
              </span>
              <span className="flex items-center gap-1">
                <FaUsers /> {trip.seats_available} seats left
              </span>
            </div>

            {trip.driver_name && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <FaUser className="text-gray-400" />
                {trip.driver_name}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Search;