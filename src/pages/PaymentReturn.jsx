import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FaCircleCheck, FaCircleXmark, FaSpinner } from 'react-icons/fa6';
import { bookingAction } from '../lib/payments';

// TradeSafe sends the passenger back here after the payment page. Set this
// page's address as both the success and failure URL in your TradeSafe
// application settings, e.g. https://your-site.com/payment/return
const PaymentReturn = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [phase, setPhase] = useState('checking'); // checking | done | failed | error
  const [message, setMessage] = useState('');

  const reference = params.get('reference');
  const transactionId = params.get('transactionId');
  const returnedStatus = params.get('status');

  useEffect(() => {
    let cancelled = false;

    const confirm = async () => {
      if (!reference && !transactionId) {
        setPhase('error');
        setMessage('We could not tell which payment this was. Check My Bookings.');
        return;
      }

      // Ask the server to check with TradeSafe. The webhook may already have
      // done this; either way it is safe to repeat. Poll for a short while
      // because the deposit can take a few seconds to register.
      for (let attempt = 0; attempt < 10 && !cancelled; attempt++) {
        try {
          const result = await bookingAction('sync', reference
            ? { payment_id: reference }
            : { transaction_id: transactionId });

          if (result.status === 'held' && result.booking_id) {
            if (!cancelled) setPhase('done');
            return;
          }
          if (result.status === 'refunded') {
            if (!cancelled) {
              setPhase('failed');
              setMessage('Your payment was received but the ride filled up in the meantime, so it has been refunded.');
            }
            return;
          }
          const userBackedOut = ['failure', 'canceled', 'error'].includes(returnedStatus);
          if (result.status === 'failed' || (result.status === 'awaiting_payment' && userBackedOut)) {
            if (!cancelled) {
              setPhase('failed');
              setMessage('The payment was not completed, so no money was taken and no seat was requested.');
            }
            return;
          }
        } catch (err) {
          if (!cancelled) {
            setPhase('error');
            setMessage(err.message || 'Something went wrong while checking your payment.');
          }
          return;
        }
        await new Promise((r) => setTimeout(r, 2500));
      }

      if (!cancelled) {
        setPhase('error');
        setMessage('We are still waiting for the payment to arrive. Check My Bookings in a minute. If you were charged, your seat request will appear there.');
      }
    };

    confirm();
    return () => { cancelled = true; };
  }, [reference, transactionId, returnedStatus]);

  useEffect(() => {
    if (phase !== 'done') return;
    const t = setTimeout(() => navigate('/bookings', { replace: true }), 2500);
    return () => clearTimeout(t);
  }, [phase, navigate]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-white h-screen p-6 text-center gap-4">
      {phase === 'checking' && (
        <>
          <FaSpinner className="text-4xl text-[#0A7B44] animate-spin" />
          <h1 className="text-xl font-bold text-gray-900">Confirming your payment…</h1>
          <p className="text-sm text-gray-500 max-w-xs">Please don't close this page.</p>
        </>
      )}

      {phase === 'done' && (
        <>
          <FaCircleCheck className="text-5xl text-[#0A7B44]" />
          <h1 className="text-xl font-bold text-gray-900">Payment received</h1>
          <p className="text-sm text-gray-500 max-w-xs">
            Your money is held safely in escrow and your seat request has been sent to the driver.
          </p>
        </>
      )}

      {(phase === 'failed' || phase === 'error') && (
        <>
          <FaCircleXmark className="text-5xl text-red-500" />
          <h1 className="text-xl font-bold text-gray-900">
            {phase === 'failed' ? 'No seat requested' : 'Could not confirm yet'}
          </h1>
          <p className="text-sm text-gray-500 max-w-xs">{message}</p>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/bookings')}
              className="py-2 px-4 rounded-xl font-semibold text-white bg-[#0A7B44] hover:bg-[#065F33] text-sm"
            >
              My Bookings
            </button>
            <button
              onClick={() => navigate('/home')}
              className="py-2 px-4 rounded-xl font-semibold text-gray-700 border border-gray-200 text-sm"
            >
              Home
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default PaymentReturn;
