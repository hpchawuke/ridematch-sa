import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaTriangleExclamation, FaClock, FaCircleXmark } from 'react-icons/fa6';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

const CONTENT = {
  not_submitted: {
    icon: <FaTriangleExclamation className="text-3xl text-yellow-500" />,
    title: 'Your account has not been verified',
    body: 'Upload your ID, car photo and plate number to start accepting rides.',
    primaryLabel: 'Verify Now',
  },
  pending: {
    icon: <FaClock className="text-3xl text-yellow-500" />,
    title: 'Verification pending',
    body: "Waiting for the admin to verify your documents — you're good to go once that's done.",
    primaryLabel: 'View submission',
  },
  declined: {
    icon: <FaCircleXmark className="text-3xl text-red-500" />,
    title: 'Verification declined',
    body: "Your documents couldn't be verified. Contact the admin for details, then upload them again.",
    primaryLabel: 'Upload again',
  },
};

// Shows a blocking-style modal for drivers who aren't approved yet. Renders
// nothing for passengers, approved drivers, or while still loading.
const VerificationModal = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  const isDriver = profile?.user_type === 'Driver';

  useEffect(() => {
    if (!user || !isDriver) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchStatus = async () => {
      const { data, error } = await supabase
        .from('driver_verifications')
        .select('status')
        .eq('driver_id', user.id)
        .maybeSingle();

      if (cancelled) return;
      if (error) console.error(error);
      setStatus(data?.status || 'not_submitted');
      setLoading(false);
    };

    fetchStatus();

    // Live update — the modal disappears on its own the moment an admin
    // approves, or switches text the moment they decline, no refresh needed
    const channel = supabase
      .channel(`verification-status-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'driver_verifications', filter: `driver_id=eq.${user.id}` },
        fetchStatus
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user, isDriver]);

  if (!isDriver || loading || dismissed || status === 'approved') return null;

  const content = CONTENT[status];
  if (!content) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 text-center">
        <div className="flex justify-center mb-3">{content.icon}</div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">{content.title}</h2>
        <p className="text-sm text-gray-500 mb-6">{content.body}</p>

        <button
          onClick={() => navigate('/verification')}
          className="w-full py-3 rounded-xl font-semibold text-white bg-[#0A7B44] hover:bg-[#065F33] transition-colors mb-2"
        >
          {content.primaryLabel}
        </button>

        <button
          onClick={() => setDismissed(true)}
          className="w-full py-2 text-xs text-gray-400 hover:text-gray-600"
        >
          Not now
        </button>
      </div>
    </div>
  );
};

export default VerificationModal;