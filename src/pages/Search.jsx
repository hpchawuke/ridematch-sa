import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaArrowLeft, FaLocationDot, FaFlagCheckered, FaCalendarDays,
  FaUser, FaClock, FaUsers
} from 'react-icons/fa6';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

const GAUTENG = ['Johannesburg', 'Pretoria', 'Midrand', 'Soweto', 'Tembisa'];
const LIMPOPO = ['Polokwane', 'Mokopane', 'Thohoyandou', 'Musina', 'Tzaneen', 'Lebowakgomo'];

const Search = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [fromCity, setFromCity] = useState('');
  const [toCity, setToCity] = useState('');
  const [date, setDate] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState(null);

  const handleSearch = async () => {
    if (!fromCity || !toCity || !date) {
      alert('Pick a From, To, and Date.');
      return;
    }
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('from_city', fromCity)
        .eq('to_city', toCity)
        .eq('date', date)
        .eq('status', 'active');

      if (error) throw error;
      setResults(data);
    } catch (err) {
      console.error(err);
      alert('Search failed. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestSeat = async (trip) => {
    if (trip.driver_id === user.id) {
      alert("You can't book your own trip.");
      return;
    }
    if (trip.seats_available <= 0) {
      alert('No seats left on this trip.');
      return;
    }
    try {
      setBooking(trip.id);
      const { error } = await supabase.from('bookings').insert({
        trip_id: trip.id,
        passenger_id: user.id,
        passenger_name: profile?.full_name || user.email,
        passenger_phone: profile?.phone || '',
        driver_id: trip.driver_id,
        driver_name: trip.driver_name,
        driver_phone: trip.driver_phone || '',
        from_city: trip.from_city,
        to_city: trip.to_city,
        date: trip.date,
        time: trip.time,
        price: trip.price,
        status: 'pending',
      });

      if (error) throw error;

      alert('Seat requested! Waiting for driver to confirm.');
      navigate('/bookings');
    } catch (err) {
      console.error(err);
      alert('Failed to request seat.');
    } finally {
      setBooking(null);
    }
  };

  const allCities = [...GAUTENG, ...LIMPOPO].sort();

  return (
    <div className="flex-1 flex flex-col bg-gray-50 h-screen">
      <div className="bg-[#0A7B44] text-white px-6 py-5 flex items-center gap-3">
        <button onClick={() => navigate('/home')} className="p-1">
          <FaArrowLeft />
        </button>
        <h1 className="text-lg font-bold">Search Trips</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
          <div className="flex items-center border border-gray-200 rounded-xl px-4">
            <FaLocationDot className="text-[#0A7B44] mr-3" />
            <select
              value={fromCity}
              onChange={(e) => setFromCity(e.target.value)}
              className="w-full py-3 outline-none text-sm bg-transparent"
            >
              <option value="">From…</option>
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
              <option value="">To…</option>
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
            onClick={handleSearch}
            disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-white bg-[#0A7B44] hover:bg-[#065F33] transition-colors disabled:opacity-50"
          >
            {loading ? 'Searching…' : 'Search'}
          </button>
        </div>

        {results && results.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-6 text-center text-sm text-gray-400">
            No trips found for that route and date. Try another day.
          </div>
        )}

        {results && results.map((trip) => (
          <div key={trip.id} className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                <FaLocationDot className="text-[#0A7B44]" />
                {trip.from_city} → {trip.to_city}
              </div>
              <span className="font-bold text-[#0A7B44]">R {trip.price}</span>
            </div>

            <div className="flex flex-wrap gap-4 text-xs text-gray-500 mb-4">
              <span className="flex items-center gap-1"><FaCalendarDays /> {trip.date}</span>
              <span className="flex items-center gap-1"><FaClock /> {trip.time}</span>
              <span className="flex items-center gap-1"><FaUsers /> {trip.seats_available} seats</span>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
              <FaUser className="text-gray-400" />
              {trip.driver_name}
            </div>

            {trip.notes && (
              <p className="text-xs text-gray-500 italic mb-4">"{trip.notes}"</p>
            )}

            <button
              onClick={() => handleRequestSeat(trip)}
              disabled={booking === trip.id || trip.seats_available <= 0}
              className="w-full py-3 rounded-xl font-semibold text-white bg-[#0A7B44] hover:bg-[#065F33] transition-colors disabled:opacity-50"
            >
              {booking === trip.id
                ? 'Requesting…'
                : trip.seats_available <= 0
                  ? 'Full'
                  : 'Request Seat'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Search;