import React, { useEffect, useState } from 'react';
import { FaPhone, FaMessage, FaLock } from 'react-icons/fa6';
import { supabase } from '../supabaseClient';

// Today's date in South Africa (YYYY-MM-DD)
export function todaySast() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Johannesburg' });
}

// True once the trip's departure date has been reached (the whole day counts)
export function isOnOrAfterDate(dateStr) {
  return todaySast() >= String(dateStr).slice(0, 10);
}

// Shows the other person's phone number, but only on the departure date.
// The number is never sent to the browser before then: it is fetched
// through get_booking_contact(), which checks the date and the booking
// status on the server.
//
// Props:
//   bookingId      the booking this contact belongs to
//   name           the other person's name (display only)
//   tripDate       the trip's date (YYYY-MM-DD)
//   lockedMessage  text to show before the departure date (optional)
export default function ContactDetails({ bookingId, name, tripDate, lockedMessage }) {
  const unlocked = isOnOrAfterDate(tripDate);
  const [phone, setPhone] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!unlocked) return;
    let cancelled = false;

    setLoading(true);
    setError('');
    supabase
      .rpc('get_booking_contact', { p_booking_id: bookingId })
      .then(({ data, error: rpcError }) => {
        if (cancelled) return;
        if (rpcError) setError(rpcError.message);
        else setPhone(data || '');
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [unlocked, bookingId]);

  if (!unlocked) {
    if (!lockedMessage) return null;
    return (
      <p className="mt-3 flex items-start gap-1.5 text-xs text-gray-500">
        <FaLock className="mt-0.5 flex-shrink-0 text-gray-400" />
        {lockedMessage}
      </p>
    );
  }

  if (loading) return <p className="mt-3 text-xs text-gray-400">Loading contact details…</p>;
  if (error) return <p className="mt-3 text-xs text-red-500">{error}</p>;
  if (!phone) return <p className="mt-3 text-xs text-gray-400">No phone number on file.</p>;

  return (
    <div className="mt-3 rounded-xl border border-[#0A7B44]/30 bg-green-50/50 p-3">
      <p className="text-xs text-gray-500 mb-2">
        {name ? `${name}'s number` : 'Phone number'}: <span className="font-semibold text-gray-800">{phone}</span>
      </p>
      <div className="flex gap-2">
        <a
          href={`tel:${phone}`}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border border-[#0A7B44] text-[#0A7B44] text-sm font-medium hover:bg-green-50"
        >
          <FaPhone /> Call
        </a>
        <a
          href={`sms:${phone}`}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border border-[#0A7B44] text-[#0A7B44] text-sm font-medium hover:bg-green-50"
        >
          <FaMessage /> Message
        </a>
      </div>
    </div>
  );
}
