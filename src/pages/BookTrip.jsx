import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FaArrowLeft, FaLocationDot, FaClock, FaUser,
  FaChair, FaNoteSticky, FaShieldHalved, FaChevronRight,
} from 'react-icons/fa6';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { startCheckout } from '../lib/payments';

export default function BookTrip() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadTrip() {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .single();

      if (cancelled) return;

      if (error) {
        console.error(error);
        setErr(error.message);
      } else {
        setTrip(data);
      }
      setLoading(false);
    }

    loadTrip();
    return () => {
      cancelled = true;
    };
  }, [tripId]);

  // Creates the escrow payment and sends the passenger to TradeSafe's secure
  // payment page. The seat request is only created once the payment goes
  // through (see PaymentReturn).
  const handlePayAndRequest = async () => {
    if (!user) return navigate('/login');
    if (trip.driver_id === user.id) {
      setErr("You can't book your own trip.");
      return;
    }

    setSubmitting(true);
    setErr('');

    try {
      await startCheckout(trip.id);
      // The browser is now leaving for the payment page.
    } catch (e) {
      console.error(e);
      setErr(e.message || 'Could not start the payment.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading trip…</p>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 p-6">
        <p className="text-gray-500 mb-4">Trip not found.</p>
        <button
          onClick={() => navigate('/home')}
          className="text-[#0A7B44] font-medium"
        >
          ← Back to home
        </button>
      </div>
    );
  }

  const seatsLeft = trip.seats_available ?? 0;
  const isFull = seatsLeft <= 0 || trip.status !== 'active';

  return (
    <div className="flex-1 flex flex-col bg-gray-50 h-screen">
      <div className="bg-[#0A7B44] text-white px-6 pt-6 pb-6 rounded-b-3xl">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-full bg-white/15 hover:bg-white/25 mb-4"
          title="Back"
        >
          <FaArrowLeft />
        </button>
        <p className="text-xs text-green-100">Trip details</p>
        <h1 className="text-xl font-bold">
          {trip.from_city} → {trip.to_city}
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto px-6 -mt-4 pb-8">
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
          <div className="flex items-center gap-2 mb-3 text-gray-900 font-semibold">
            <FaLocationDot className="text-[#0A7B44]" />
            <span>{trip.from_city}</span>
            <span className="text-gray-300">→</span>
            <span>{trip.to_city}</span>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
            <FaClock className="text-gray-400" />
            <span>
              {trip.date} · {trip.time?.slice(0, 5)}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <FaChair className="text-gray-400" />
            <span>
              {seatsLeft} seat{seatsLeft !== 1 ? 's' : ''} available
            </span>
          </div>
        </div>

        {/* Driver: tap to see their profile. Their phone number is shared
            only after they accept your request. */}
        <button
          type="button"
          onClick={() => navigate(`/driver/${trip.driver_id}`)}
          className="w-full text-left bg-white rounded-2xl shadow-sm p-5 mb-4 flex items-center justify-between hover:bg-gray-50"
        >
          <div>
            <h2 className="text-sm font-semibold text-gray-500 mb-2">DRIVER</h2>
            <div className="flex items-center gap-2 text-sm text-gray-800">
              <FaUser className="text-gray-400" />
              <span className="font-medium">{trip.driver_name || '—'}</span>
            </div>
          </div>
          <FaChevronRight className="text-gray-300" />
        </button>

        <div className="bg-white rounded-2xl shadow-sm p-5 mb-4 flex items-center justify-between">
          <span className="text-sm text-gray-500">Price per seat</span>
          <span className="text-2xl font-bold text-[#0A7B44]">R{trip.price}</span>
        </div>

        {trip.notes && (
          <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
            <h2 className="text-sm font-semibold text-gray-500 mb-2 flex items-center gap-2">
              <FaNoteSticky /> NOTES
            </h2>
            <p className="text-sm text-gray-700">{trip.notes}</p>
          </div>
        )}

        {/* How the payment works */}
        <div className="bg-green-50 border border-green-100 rounded-2xl p-4 mb-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-[#0A7B44] mb-1">
            <FaShieldHalved /> Your payment is protected
          </p>
          <p className="text-xs text-gray-600">
            You pay now and the money is held safely in escrow. The driver only
            gets paid after your ride. If the driver declines, or you cancel
            before departure, you are refunded in full.
          </p>
        </div>

        {err && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl p-3 mb-4">
            {err}
          </div>
        )}

        <button
          onClick={handlePayAndRequest}
          disabled={submitting || isFull}
          className="w-full py-3 rounded-xl font-semibold text-white bg-[#0A7B44] hover:bg-[#065F33] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isFull
            ? 'Trip is full'
            : submitting
            ? 'Opening secure payment…'
            : `Pay R${trip.price} & Request Seat`}
        </button>
      </div>
    </div>
  );
}