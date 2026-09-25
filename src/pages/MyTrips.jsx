import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection, query, where, onSnapshot, orderBy,
  updateDoc, doc, increment
} from 'firebase/firestore';
import {
  FaArrowLeft, FaLocationDot, FaCalendarDays, FaClock, FaUsers,
  FaChevronDown, FaChevronUp, FaPhone, FaCheck, FaXmark
} from 'react-icons/fa6';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

const MyTrips = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'trips'),
      where('driverId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q,
      (snap) => {
        setTrips(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setLoading(false);
      }
    );
    return unsub;
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

  // Load requests only when expanded
  useEffect(() => {
    if (!expanded) return;
    setLoadingRequests(true);
    const q = query(
      collection(db, 'bookings'),
      where('tripId', '==', trip.id),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q,
      (snap) => {
        setRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoadingRequests(false);
      },
      (err) => {
        console.error(err);
        setLoadingRequests(false);
      }
    );
    return unsub;
  }, [expanded, trip.id]);

  const handleAccept = async (booking) => {
    try {
      setBusy(booking.id);
      await updateDoc(doc(db, 'bookings', booking.id), { status: 'accepted' });
      await updateDoc(doc(db, 'trips', trip.id), {
        seatsAvailable: increment(-1),
      });
    } catch (err) {
      console.error(err);
      alert('Failed to accept. Check console.');
    } finally {
      setBusy(null);
    }
  };

  const handleDecline = async (booking) => {
    try {
      setBusy(booking.id);
      await updateDoc(doc(db, 'bookings', booking.id), { status: 'declined' });
    } catch (err) {
      console.error(err);
      alert('Failed to decline. Check console.');
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
            {trip.fromCity} → {trip.toCity}
          </div>
          <span className="font-bold text-[#0A7B44]">R {trip.price}</span>
        </div>

        <div className="flex flex-wrap gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1"><FaCalendarDays /> {trip.date}</span>
          <span className="flex items-center gap-1"><FaClock /> {trip.time}</span>
          <span className="flex items-center gap-1">
            <FaUsers /> {trip.seatsAvailable}/{trip.seats} seats left
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
                <span className="font-medium text-gray-900">{r.passengerName}</span>
                <RequestBadge status={r.status} />
              </div>
              {r.passengerPhone && (
                <p className="flex items-center gap-1 text-xs text-gray-500">
                  <FaPhone className="text-gray-400" /> {r.passengerPhone}
                </p>
              )}

              {r.status === 'pending' && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleAccept(r)}
                    disabled={busy === r.id}
                    className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-[#0A7B44] text-white text-xs font-semibold hover:bg-[#065F33] disabled:opacity-50"
                  >
                    <FaCheck /> Accept
                  </button>
                  <button
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
    return <span className="text-xs text-red-500 font-medium">Declined</span>;
  }
  return <span className="text-xs text-yellow-600 font-medium">Pending</span>;
}

export default MyTrips;