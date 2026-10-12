import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaArrowLeft, FaCalendarDays, FaLocationDot, FaClock,
  FaShieldHalved, FaTriangleExclamation, FaChevronDown, FaChevronUp, FaClockRotateLeft, FaCircleXmark
} from 'react-icons/fa6';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { bookingAction } from '../lib/payments';
import ContactDetails from '../components/ContactDetails';

const WINDOW_MS = 24 * 60 * 60 * 1000; // confirm / report until 24h after departure, then auto-released
const SAST_OFFSET_MS = 2 * 60 * 60 * 1000; // South Africa is always UTC+2

// Midnight (South African time) at the start of the departure day
function departureDayStart(departureMs) {
  return Math.floor((departureMs + SAST_OFFSET_MS) / 86400000) * 86400000 - SAST_OFFSET_MS;
}

const seenKey = (userId) => `ridematch:seenDeclines:${userId}`;

function readSeen(userId) {
  try {
    return JSON.parse(localStorage.getItem(seenKey(userId)) || '[]');
  } catch {
    return [];
  }
}

function writeSeen(userId, ids) {
  try {
    localStorage.setItem(seenKey(userId), JSON.stringify(ids));
  } catch {
    // storage unavailable: the badge just won't remember
  }
}

const Bookings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [showDeclined, setShowDeclined] = useState(false);
  const [showRecent, setShowRecent] = useState(false);
  const [seen, setSeen] = useState([]);

  const fetchBookings = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('bookings')
      .select('*, driver:users!bookings_driver_public_fkey(avatar_url), payment:payments(status, amount, departure_at)')
      .eq('passenger_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
    } else {
      setBookings(data);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) return;

    setSeen(readSeen(user.id));
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
  }, [user, fetchBookings]);

  // Keeps the groups accurate while the page stays open
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  // Sort every booking into one of three groups:
  //  - declined: the driver said no, or the ride filled up (refunded)
  //  - recent:   the trip's departure has passed and there is nothing left to do
  //  - active:   everything else, soonest first. A trip that has departed but
  //              is still waiting for "Complete Ride" stays here so it isn't missed.
  const { active, declined, recent } = useMemo(() => {
    const active = [];
    const declined = [];
    const recent = [];

    for (const b of bookings) {
      const payment = Array.isArray(b.payment) ? b.payment[0] : b.payment;
      const departure = departureOf(b, payment);

      if (['declined', 'full'].includes(b.status)) {
        declined.push(b);
        continue;
      }

      const needsAction =
        ['accepted', 'disputed'].includes(b.status) &&
        ['held', 'disputed'].includes(payment?.status);

      if (departure < now && !needsAction) {
        recent.push({ b, departure });
      } else {
        active.push({ b, departure });
      }
    }

    active.sort((x, y) => x.departure - y.departure);
    recent.sort((x, y) => y.departure - x.departure);

    return {
      active: active.map((x) => x.b),
      declined,
      recent: recent.map((x) => x.b),
    };
  }, [bookings, now]);

  const unseenDeclines = declined.filter((b) => !seen.includes(b.id)).length;

  // Opening the Declined section counts as having seen them
  useEffect(() => {
    if (!user || !showDeclined || declined.length === 0) return;
    const ids = declined.map((b) => b.id);
    const merged = Array.from(new Set([...readSeen(user.id), ...ids]));
    writeSeen(user.id, merged);
    setSeen(merged);
  }, [user, showDeclined, declined]);

  return (
    <div className="flex-1 flex flex-col bg-gray-50 h-screen">
      <div className="bg-[#0A7B44] text-white px-6 py-5 flex items-center gap-3">
        <button onClick={() => navigate('/home')} className="p-1">
          <FaArrowLeft />
        </button>
        <h1 className="text-lg font-bold">My Bookings</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
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

        {/* Upcoming / needs attention */}
        {!loading && bookings.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xs font-semibold text-gray-500 tracking-wide">UPCOMING</h2>
            {active.length === 0 && (
              <div className="bg-white rounded-2xl shadow-sm p-5 text-center">
                <p className="text-sm text-gray-400 mb-3">No upcoming trips.</p>
                <button
                  onClick={() => navigate('/search')}
                  className="py-2 px-4 rounded-xl font-semibold text-white bg-[#0A7B44] hover:bg-[#065F33] text-sm"
                >
                  Find a ride
                </button>
              </div>
            )}
            {active.map((b) => (
              <BookingCard key={b.id} booking={b} onChanged={fetchBookings} />
            ))}
          </div>
        )}

        {/* Declined */}
        {declined.length > 0 && (
          <div className="space-y-3">
            <SectionToggle
              open={showDeclined}
              onClick={() => setShowDeclined((v) => !v)}
              icon={<FaCircleXmark className="text-red-500" />}
              label="Declined"
              count={declined.length}
              alertCount={unseenDeclines}
            />
            {showDeclined && declined.map((b) => (
              <BookingCard key={b.id} booking={b} onChanged={fetchBookings} />
            ))}
          </div>
        )}

        {/* Recent trips */}
        {recent.length > 0 && (
          <div className="space-y-3">
            <SectionToggle
              open={showRecent}
              onClick={() => setShowRecent((v) => !v)}
              icon={<FaClockRotateLeft className="text-gray-400" />}
              label="Recent trips"
              count={recent.length}
            />
            {showRecent && recent.map((b) => (
              <BookingCard key={b.id} booking={b} onChanged={fetchBookings} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Collapsible section header. `alertCount` shows a red badge that grabs
// attention (used for declines the passenger hasn't looked at yet).
function SectionToggle({ open, onClick, icon, label, count, alertCount = 0 }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between bg-white rounded-2xl shadow-sm px-5 py-4 ${
        alertCount > 0 ? 'ring-2 ring-red-200' : ''
      }`}
    >
      <span className="flex items-center gap-2 text-sm font-semibold text-gray-800">
        {icon}
        {label}
        <span className="text-xs font-medium text-gray-400">({count})</span>
        {alertCount > 0 && (
          <span className="ml-1 h-5 px-2 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center">
            {alertCount} new
          </span>
        )}
      </span>
      {open ? <FaChevronUp className="text-gray-400" /> : <FaChevronDown className="text-gray-400" />}
    </button>
  );
}

function departureOf(b, payment) {
  if (payment?.departure_at) return new Date(payment.departure_at).getTime();
  return new Date(`${b.date}T${String(b.time).slice(0, 5)}:00+02:00`).getTime();
}

function BookingCard({ booking: b, onChanged }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Keeps the buttons accurate while the page stays open
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const payment = Array.isArray(b.payment) ? b.payment[0] : b.payment;
  const departure = departureOf(b, payment);
  const dayStart = departureDayStart(departure);
  const beforeDeparture = now < departure;
  const beforeDepartureDay = now < dayStart;
  // From the start of the departure day until 24h after departure
  const rideWindowOpen = now >= dayStart && now <= departure + WINDOW_MS;
  const paymentHeld = payment?.status === 'held';

  const run = async (action, payload, doneMessage) => {
    try {
      setBusy(true);
      await bookingAction(action, { booking_id: b.id, ...payload });
      if (doneMessage) alert(doneMessage);
      await onChanged();
    } catch (err) {
      alert(err.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = () => {
    if (!window.confirm('Cancel this booking? You will get a full refund. Once the departure date is reached you will not be able to cancel.')) return;
    run('cancel', {}, 'Booking cancelled. Your refund is on its way.');
  };

  const handleComplete = () => {
    if (!window.confirm(`Only confirm once you are in the car. This releases R${b.price} to the driver and can't be undone.`)) return;
    run('complete', {}, 'Trip confirmed. The driver has been paid. Thank you!');
  };

  const handleDispute = () => {
    const reason = window.prompt('What went wrong? Our team will review it and the money stays on hold until then.');
    if (reason === null) return;
    if (reason.trim().length < 5) {
      alert('Please give a little more detail.');
      return;
    }
    run('dispute', { reason }, 'Thanks. We have put the payment on hold and an admin will review it.');
  };

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

      <PaymentLine status={payment?.status} />

      {/* The driver's number is only shared on the departure date */}
      {['accepted', 'disputed'].includes(b.status) && (
        <ContactDetails bookingId={b.id} name={b.driver_name} tripDate={b.date} />
      )}

      {b.status === 'pending' && (
        <p className="mt-3 text-xs text-gray-400">
          Waiting for the driver to confirm your seat. If they decline, you are refunded automatically.
        </p>
      )}

      {b.status === 'declined' && (
        <p className="mt-3 text-xs text-gray-400">
          The driver couldn't take this booking. Your payment has been refunded. Try another trip.
        </p>
      )}

      {b.status === 'full' && (
        <p className="mt-3 text-xs text-gray-400">
          This ride filled up. Your payment has been refunded. Try another trip.
        </p>
      )}

      {b.status === 'cancelled' && (
        <p className="mt-3 text-xs text-gray-400">This booking was cancelled and your payment refunded.</p>
      )}

      {b.status === 'disputed' && (
        <p className="mt-3 text-xs text-orange-600">
          You reported a problem. The money is on hold while an admin reviews it.
        </p>
      )}

      {/* Waiting for the driver: can still withdraw until departure time */}
      {b.status === 'pending' && paymentHeld && beforeDeparture && (
        <button
          onClick={handleCancel}
          disabled={busy}
          className="mt-3 w-full py-2 rounded-xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 disabled:opacity-50"
        >
          Cancel request (full refund)
        </button>
      )}

      {/* Accepted, days before departure: cancel + warning */}
      {b.status === 'accepted' && paymentHeld && beforeDepartureDay && (
        <div className="mt-3 space-y-2">
          <button
            onClick={handleCancel}
            disabled={busy}
            className="w-full py-2 rounded-xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 disabled:opacity-50"
          >
            Cancel ride (full refund)
          </button>
          <Warning>
            Once the departure date is reached you will not be able to cancel a trip. On that day you will be able to call/message the driver to give them your specific pick-up location.
          </Warning>
        </div>
      )}

      {/* Departure day: Confirm trip replaces Cancel */}
      {b.status === 'accepted' && paymentHeld && rideWindowOpen && (
        <div className="mt-3 space-y-2">
          <Warning>
            You can only click Confirm Trip after you are in the car. Before that, wait for the communication from the driver.
          </Warning>
          <button
            onClick={handleComplete}
            disabled={busy}
            className="w-full py-3 rounded-xl font-semibold text-white bg-[#0A7B44] hover:bg-[#065F33] disabled:opacity-50"
          >
            {busy ? 'Please wait…' : 'Confirm Trip'}
          </button>
          <button
            onClick={handleDispute}
            disabled={busy}
            className="w-full py-2 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            Report a problem
          </button>
          <p className="text-[11px] text-gray-400 text-center">
            If you do nothing, the payment is released to the driver 24 hours after departure.
          </p>
        </div>
      )}
    </div>
  );
}

function Warning({ children }) {
  return (
    <p className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
      <FaTriangleExclamation className="mt-0.5 flex-shrink-0 text-amber-500" />
      <span>{children}</span>
    </p>
  );
}

function PaymentLine({ status }) {
  if (!status) return null;
  const map = {
    held: ['Paid · held safely in escrow', 'text-[#0A7B44]'],
    released: ['Paid to driver', 'text-gray-500'],
    refunded: ['Refunded', 'text-gray-500'],
    disputed: ['On hold · under review', 'text-orange-600'],
  };
  const entry = map[status];
  if (!entry) return null;
  return (
    <p className={`mt-3 flex items-center gap-1.5 text-xs font-medium ${entry[1]}`}>
      <FaShieldHalved /> {entry[0]}
    </p>
  );
}

function StatusBadge({ status }) {
  const styles = {
    accepted: ['Accepted', 'text-green-700 bg-green-50'],
    declined: ['Declined', 'text-red-600 bg-red-50'],
    full: ['Ride full', 'text-gray-600 bg-gray-100'],
    cancelled: ['Cancelled', 'text-gray-600 bg-gray-100'],
    completed: ['Completed', 'text-green-700 bg-green-50'],
    disputed: ['Under review', 'text-orange-600 bg-orange-50'],
    pending: ['Pending', 'text-yellow-700 bg-yellow-50'],
  };
  const [label, cls] = styles[status] || styles.pending;
  return <span className={`text-xs font-semibold px-2 py-1 rounded-full ${cls}`}>{label}</span>;
}

export default Bookings;
