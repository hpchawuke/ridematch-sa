import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaIdCard, FaCar, FaPhone, FaCheck, FaXmark, FaClock,
  FaCircleCheck, FaCircleXmark, FaHouse
} from 'react-icons/fa6';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { bookingAction } from '../lib/payments';

const TABS = ['pending', 'approved', 'declined'];

const AdminVerifications = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(null); // null = not checked yet
  const [tab, setTab] = useState('pending');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [section, setSection] = useState('verifications'); // verifications | disputes

  // Confirm admin status before doing anything else
  useEffect(() => {
    if (!user) return;

    supabase
      .from('admins')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => setIsAdmin(Boolean(data)));
  }, [user]);

  useEffect(() => {
    if (!isAdmin) return;

    const fetchRows = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('driver_verifications')
        .select('*, driver:users!driver_verifications_driver_public_fkey(full_name)')
        .eq('status', tab)
        .order('created_at', { ascending: true });

      if (error) {
        console.error(error);
      } else {
        setRows(data || []);
      }
      setLoading(false);
    };

    fetchRows();

    const channel = supabase
      .channel('admin-driver-verifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_verifications' }, fetchRows)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, tab]);

  const viewDocument = async (path) => {
    const { data, error } = await supabase.storage
      .from('driver-documents')
      .createSignedUrl(path, 120);
    if (error) {
      alert('Could not load document: ' + error.message);
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener');
  };

  const handleApprove = async (row) => {
    try {
      setBusy(row.id);
      const { error } = await supabase.rpc('review_driver_verification', {
        p_verification_id: row.id,
        p_approve: true,
      });
      if (error) throw error;
    } catch (err) {
      alert('Failed to approve: ' + (err.message || 'Unknown error'));
    } finally {
      setBusy(null);
    }
  };

  const handleDecline = async (row) => {
    const reason = window.prompt('Reason for declining (shown to the driver):');
    if (reason === null) return; // cancelled

    try {
      setBusy(row.id);
      const { error } = await supabase.rpc('review_driver_verification', {
        p_verification_id: row.id,
        p_approve: false,
        p_reason: reason,
      });
      if (error) throw error;
    } catch (err) {
      alert('Failed to decline: ' + (err.message || 'Unknown error'));
    } finally {
      setBusy(null);
    }
  };

  if (authLoading || isAdmin === null) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white h-screen">
        <p className="text-gray-500">Loading…</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white h-screen text-center p-6">
        <p className="text-gray-500">You don't have access to this page.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50 h-screen">
      <div className="bg-[#0A7B44] text-white px-6 py-5 flex items-center gap-3">
        <button onClick={() => navigate('/home')} className="p-1">
          <FaHouse />
        </button>
        <h1 className="text-lg font-bold">Admin</h1>
      </div>

      <div className="flex border-b border-gray-100 bg-white">
        {[['verifications', 'Driver verifications'], ['disputes', 'Payment disputes']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setSection(key)}
            className={`flex-1 py-3 text-sm font-semibold border-b-2 ${
              section === key ? 'border-[#0A7B44] text-[#0A7B44]' : 'border-transparent text-gray-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {section === 'disputes' ? (
        <DisputesPanel />
      ) : (
        <>
      <div className="flex gap-2 px-6 py-3 bg-white border-b border-gray-100">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium capitalize border ${
              tab === t
                ? 'bg-[#0A7B44] text-white border-[#0A7B44]'
                : 'bg-white text-gray-600 border-gray-200'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-3">
        {loading && <p className="text-center text-sm text-gray-400">Loading…</p>}

        {!loading && rows.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-10">
            No {tab} submissions.
          </p>
        )}

        {rows.map((row) => (
          <div key={row.id} className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-semibold text-gray-900">{row.driver?.full_name || 'Unknown driver'}</p>
                <AdminPhone userId={row.driver_id} />
              </div>
              <StatusBadge status={row.status} />
            </div>

            <p className="text-xs text-gray-500 mb-3">
              Plate: <span className="font-medium text-gray-700">{row.plate_number}</span>
            </p>

            <div className="flex gap-2 mb-3">
              <button
                onClick={() => viewDocument(row.id_document_path)}
                className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                <FaIdCard /> View ID
              </button>
              <button
                onClick={() => viewDocument(row.car_photo_path)}
                className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                <FaCar /> View car photo
              </button>
            </div>

            {row.status === 'declined' && row.decline_reason && (
              <p className="text-xs text-red-500 mb-3">Reason: {row.decline_reason}</p>
            )}

            {row.status === 'pending' && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleApprove(row)}
                  disabled={busy === row.id}
                  className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-[#0A7B44] text-white text-xs font-semibold hover:bg-[#065F33] disabled:opacity-50"
                >
                  <FaCheck /> Approve
                </button>
                <button
                  onClick={() => handleDecline(row)}
                  disabled={busy === row.id}
                  className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-50 disabled:opacity-50"
                >
                  <FaXmark /> Decline
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
        </>
      )}
    </div>
  );
};

function DisputesPanel() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);

  const fetchRows = async () => {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        id, amount, status, dispute_reason, created_at, paid_at, tradesafe_transaction_id,
        passenger_id, driver_id,
        passenger:users!payments_passenger_public_fkey(full_name),
        driver:users!payments_driver_public_fkey(full_name),
        booking:bookings(from_city, to_city, date, time)
      `)
      .eq('status', 'disputed')
      .order('created_at', { ascending: true });

    if (error) console.error(error);
    else setRows(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchRows();
    const channel = supabase
      .channel('admin-payment-disputes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, fetchRows)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const resolve = async (row, action) => {
    const message = action === 'admin_release'
      ? `Release R${row.amount} to the driver? This cannot be undone.`
      : `Refund R${row.amount} to the passenger? This cannot be undone.`;
    if (!window.confirm(message)) return;

    try {
      setBusy(row.id);
      await bookingAction(action, { payment_id: row.id });
      await fetchRows();
    } catch (err) {
      alert(err.message || 'Could not complete that.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-3">
      {loading && <p className="text-center text-sm text-gray-400">Loading…</p>}
      {!loading && rows.length === 0 && (
        <p className="text-center text-sm text-gray-400 py-10">No open payment disputes.</p>
      )}

      {rows.map((row) => {
        const trip = Array.isArray(row.booking) ? row.booking[0] : row.booking;
        return (
          <div key={row.id} className="bg-white rounded-2xl shadow-sm p-5 space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-gray-900">
                {trip ? `${trip.from_city} → ${trip.to_city}` : 'Trip'}
              </p>
              <span className="font-bold text-[#0A7B44]">R {row.amount}</span>
            </div>
            {trip && <p className="text-xs text-gray-500">{trip.date} · {trip.time}</p>}

            <p className="text-xs text-gray-600">
              <span className="text-gray-400">Passenger:</span> {row.passenger?.full_name} <AdminPhone userId={row.passenger_id} inline />
            </p>
            <p className="text-xs text-gray-600">
              <span className="text-gray-400">Driver:</span> {row.driver?.full_name} <AdminPhone userId={row.driver_id} inline />
            </p>

            <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 text-xs text-orange-800">
              {row.dispute_reason}
            </div>

            <p className="text-[11px] text-gray-400 break-all">
              TradeSafe transaction: {row.tradesafe_transaction_id}
            </p>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => resolve(row, 'admin_release')}
                disabled={busy === row.id}
                className="flex-1 py-2 rounded-lg bg-[#0A7B44] text-white text-xs font-semibold hover:bg-[#065F33] disabled:opacity-50"
              >
                Release to driver
              </button>
              <button
                onClick={() => resolve(row, 'admin_refund')}
                disabled={busy === row.id}
                className="flex-1 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-50 disabled:opacity-50"
              >
                Refund passenger
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Admins read phone numbers through a server check (admin_get_user_phone),
// because phone numbers are no longer readable straight from the users table.
function AdminPhone({ userId, inline = false }) {
  const [phone, setPhone] = useState(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    supabase.rpc('admin_get_user_phone', { p_user_id: userId }).then(({ data, error }) => {
      if (!cancelled && !error) setPhone(data || null);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (!phone) return null;
  if (inline) return <span>· {phone}</span>;
  return (
    <p className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
      <FaPhone className="text-gray-400" /> {phone}
    </p>
  );
}

function StatusBadge({ status }) {
  if (status === 'approved') {
    return (
      <span className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 px-2 py-1 rounded-full">
        <FaCircleCheck /> Approved
      </span>
    );
  }
  if (status === 'declined') {
    return (
      <span className="flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-full">
        <FaCircleXmark /> Declined
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs font-semibold text-yellow-700 bg-yellow-50 px-2 py-1 rounded-full">
      <FaClock /> Pending
    </span>
  );
}

export default AdminVerifications;
