import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaArrowLeft, FaLocationDot, FaCalendarDays, FaClock, FaUsers,
  FaChevronDown, FaChevronUp, FaPhone, FaCheck, FaXmark
} from 'react-icons/fa6';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { bookingAction } from '../lib/payments';

const MyTrips = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchTrips = async () => {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('driver_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error(error);
      } else {
        setTrips(data || []);
      }
      setLoading(false);
    };

    fetchTrips();

    const channel = supabase
      .channel(`trips-driver-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trips', filter: `driver_id=eq.${user.id}` },
        fetchTrips
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <div className="flex-1 flex flex-col bg-gray-50 h-screen">
      <div className="bg-[#0A7B44] text-white px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/home')} className="p-1">
            <FaArrowLeft />
          </button>
          <h1 className="text-lg font-bold">My Trips</h1>
        </div>
        <button
          onClick={() => navigate('/post-ride')}
          className="text-xs bg-white/15 hover:bg-white/25 px-3 py-2 rounded-lg font-medium"
        >
          + New
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-3">
        {loading && <p className="text-center text-sm text-gray-400">Loading…</p>}

        {!loading && trips.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
            <p className="text-sm text-gray-400 mb-4">You haven't posted any trips yet.</p>
            <button
              onClick={() => navigate('/post-ride')}
              className="py-2 px-4 rounded-xl font-semibold text-white bg-[#0A7B44] hover:bg-[#065F33] text-sm"
            >
              Post your first trip
            </button>
          </div>
        )}

        {trips.map((t) => (
          <TripCard key={t.id} trip={t} />
        ))}
      </div>
    </div>
  );
};

function TripCard({ trip }) {
  const [expanded, setExpanded] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [busy, setBusy] = useState(null);
  const isFull = trip.status === 'full';

  const fetchRequests = useCallback(async () => {
    setLoadingRequests(true);
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('trip_id', trip.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
    } else {
      setRequests(data || []);
    }
    setLoadingRequests(false);
  }, [trip.id]);

  const refetch = fetchRequests;

  useEffect(() => {
    if (!expanded) return;

    fetchRequests();

    const channel = supabase
      .channel(`bookings-trip-${trip.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings', filter: `trip_id=eq.${trip.id}` },
        fetchRequests
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [expanded, trip.id, fetchRequests]);

  const handleAccept = async (booking) => {
    try {
      setBusy(booking.id);

      // Server-side: checks the payment is held in escrow and a seat is
      // still free, accepts, takes a seat off the trip and, if that was the
      // last seat, marks it 'full' and refunds everyone still waiting.
      // The money stays in escrow until the passenger completes the ride.
      await bookingAction('accept', { booking_id: booking.id });
      await refetch();
    } catch (err) {
      console.error(err);
      alert('Failed to accept: ' + (err.message || 'Unknown error'));
    } finally {
      setBusy(null);
    }
  };

  const handleDecline = async (booking) => {
    if (!window.confirm('Decline this request? The passenger will be notified and refunded in full.')) return;
    try {
      setBusy(booking.id);
      await bookingAction('decline', { booking_id: booking.id });
      await refetch();
    } catch (err) {
      console.error(err);
      alert('Failed to decline: ' + (err.message || 'Unknown error'));
    } finally {
      setBusy(null);
    }
  };

  const handleCancelRide = async (booking) => {
    if (!window.confirm('Cancel this passenger\'s seat? They will be refunded in full.')) return;
    try {
      setBusy(booking.id);
      await bookingAction('cancel', { booking_id: booking.id });
      await refetch();
    } catch (err) {
      console.error(err);
      alert('Failed to cancel: ' + (err.message || 'Unknown error'));
    } finally {
      setBusy(null);
    }
  };

  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
            <FaLocationDot className="text-[#0A7B44]" />
            {trip.from_city} → {trip.to_city}
          </div>
          {isFull ? (
            <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              Ride Full
            </span>
          ) : (
            <span className="font-bold text-[#0A7B44]">R {trip.price}</span>
          )}
        </div>

        <div className="flex flex-wrap gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1"><FaCalendarDays /> {trip.date}</span>
          <span className="flex items-center gap-1"><FaClock /> {trip.time}</span>
          <span className="flex items-center gap-1">
            <FaUsers /> {trip.seats_available}/{trip.seats} seats left
          </span>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-4 w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
        >
          {expanded ? <FaChevronUp /> : <FaChevronDown />}
          {expanded ? 'Hide requests' : 'View requests'}
          {pendingCount > 0 && (
            <span className="ml-1 bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full font-semibold">
              {pendingCount} new
            </span>
          )}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-2">
          {loadingRequests && (
            <p className="text-center text-xs text-gray-400 py-2">Loading requests…</p>
          )}
          {!loadingRequests && requests.length === 0 && (
            <p className="text-center text-xs text-gray-400 py-3">
              No seat requests yet.
            </p>
          )}

          {requests.map((r) => (
            <div key={r.id} className="bg-white rounded-xl p-3 text-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-gray-900">{r.passenger_name}</span>
                <RequestBadge status={r.status} />
              </div>
              {r.passenger_phone && (
                <p className="flex items-center gap-1 text-xs text-gray-500">
                  <FaPhone className="text-gray-400" /> {r.passenger_phone}
                </p>
              )}
              {['pending', 'accepted'].includes(r.status) && (
                <p className="text-xs text-[#0A7B44] mt-1">R {r.price} paid · held in escrow</p>
              )}
              {r.status === 'completed' && (
                <p className="text-xs text-gray-500 mt-1">R {r.price} released to you</p>
              )}
              {r.status === 'disputed' && (
                <p className="text-xs text-orange-600 mt-1">Passenger reported a problem. Payment on hold while an admin reviews it.</p>
              )}

              {r.status === 'accepted' && (
                <button
                  type="button"
                  onClick={() => handleCancelRide(r)}
                  disabled={busy === r.id}
                  className="mt-3 w-full py-2 rounded-lg border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 disabled:opacity-50"
                >
                  Cancel this passenger (they are refunded)
                </button>
              )}

              {r.status === 'pending' && (
                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => handleAccept(r)}
                    disabled={busy === r.id}
                    className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-[#0A7B44] text-white text-xs font-semibold hover:bg-[#065F33] disabled:opacity-50"
                  >
                    <FaCheck /> Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDecline(r)}
                    disabled={busy === r.id}
                    className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-50 disabled:opacity-50"
                  >
                    <FaXmark /> Decline
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RequestBadge({ status }) {
  if (status === 'accepted') {
    return <span className="text-xs text-green-600 font-medium">Accepted</span>;
  }
  if (status === 'declined') {
    return <span className="text-xs text-red-500 font-medium">Declined · refunded</span>;
  }
  if (status === 'full') {
    return <span className="text-xs text-gray-500 font-medium">Ride full · refunded</span>;
  }
  if (status === 'cancelled') {
    return <span className="text-xs text-gray-500 font-medium">Cancelled · refunded</span>;
  }
  if (status === 'completed') {
    return <span className="text-xs text-green-600 font-medium">Completed</span>;
  }
  if (status === 'disputed') {
    return <span className="text-xs text-orange-600 font-medium">Disputed</span>;
  }
  return <span className="text-xs text-yellow-600 font-medium">Pending</span>;
}

export default MyTrips;
