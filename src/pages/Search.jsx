import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaArrowLeft, FaLocationDot, FaFlagCheckered, FaCalendarDays,
  FaClock, FaUsers
} from 'react-icons/fa6';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { startCheckout } from '../lib/payments';

const GAUTENG = ['Johannesburg', 'Pretoria', 'Midrand', 'Soweto', 'Tembisa'];
const LIMPOPO = ['Polokwane', 'Mokopane', 'Thohoyandou', 'Musina', 'Tzaneen', 'Lebowakgomo'];

const Search = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

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
        .select('*, driver:users!trips_driver_public_fkey(full_name, avatar_url, vehicle)')
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
    const ok = window.confirm(
      `Pay R${trip.price} to request this seat?\n\nYou'll be taken to a secure payment page. The money is held in escrow and only released to the driver after your ride. If the driver declines, or you cancel before departure, you get a full refund.`
    );
    if (!ok) return;

    try {
      setBooking(trip.id);
      // Creates the escrow payment and redirects to the payment page.
      // The booking itself is created once the payment goes through.
      await startCheckout(trip.id);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Could not start the payment.');
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

            <button
              onClick={() => navigate(`/driver/${trip.driver_id}`)}
              className="flex items-center gap-2 text-xs text-gray-600 hover:text-gray-900 mb-4"
            >
              <div className="w-7 h-7 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                {trip.driver?.avatar_url ? (
                  <img src={trip.driver.avatar_url} alt={trip.driver_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#0A7B44] text-white text-[10px] font-bold">
                    {(trip.driver_name || 'D').charAt(0)}
                  </div>
                )}
              </div>
              <span className="font-medium">{trip.driver_name}</span>
              {trip.driver?.vehicle && <span className="text-gray-400">· {trip.driver.vehicle}</span>}
            </button>

            {trip.notes && (
              <p className="text-xs text-gray-500 italic mb-4">"{trip.notes}"</p>
            )}

            <button
              onClick={() => handleRequestSeat(trip)}
              disabled={booking === trip.id || trip.seats_available <= 0}
              className="w-full py-3 rounded-xl font-semibold text-white bg-[#0A7B44] hover:bg-[#065F33] transition-colors disabled:opacity-50"
            >
              {booking === trip.id
                ? 'Opening payment…'
                : trip.seats_available <= 0
                  ? 'Full'
                  : `Pay R${trip.price} & Request Seat`}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Search;
