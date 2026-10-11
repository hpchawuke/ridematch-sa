import { supabase } from '../supabaseClient';

// Calls an Edge Function and turns any failure into a readable Error.
export async function callFunction(name, body) {
  const { data, error } = await supabase.functions.invoke(name, { body });

  if (error) {
    let message = error.message;
    try {
      const payload = await error.context.json();
      if (payload?.error) message = payload.error;
    } catch {
      // keep the generic message
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

// "Request Seat": creates the escrow payment and sends the passenger to
// TradeSafe's secure payment page. The booking only appears once the
// payment goes through.
export async function startCheckout(tripId) {
  const { url } = await callFunction('create-checkout', { trip_id: tripId });
  window.location.href = url;
}

// accept | decline | cancel | complete | dispute | sync | admin_release | admin_refund
export function bookingAction(action, payload = {}) {
  return callFunction('booking-action', { action, ...payload });
}
