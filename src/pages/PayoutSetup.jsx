import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaBuildingColumns, FaCircleCheck, FaLock } from 'react-icons/fa6';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { callFunction } from '../lib/payments';

// IMPORTANT: TradeSafe's docs only show SBSA (Standard Bank) and CHEQUE.
// The other values below are best guesses at TradeSafe's names. Open the
// TradeSafe API playground, look at the `bank` and `accountType` enums in
// the schema docs, and correct any that differ. A wrong value is rejected
// safely with an error message, nothing bad happens.
const BANKS = [
  { value: 'ABSA', label: 'Absa' },
  { value: 'CAPITEC', label: 'Capitec' },
  { value: 'FNB', label: 'First National Bank (FNB)' },
  { value: 'NEDBANK', label: 'Nedbank' },
  { value: 'SBSA', label: 'Standard Bank' },
  { value: 'DISCOVERY', label: 'Discovery Bank' },
  { value: 'TYME', label: 'TymeBank' },
  { value: 'AFRICAN_BANK', label: 'African Bank' },
  { value: 'INVESTEC', label: 'Investec' },
];
const ACCOUNT_TYPES = [
  { value: 'CHEQUE', label: 'Cheque / Current' },
  { value: 'SAVINGS', label: 'Savings' },
];

const PayoutSetup = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [status, setStatus] = useState('loading'); // loading | none | ready
  const [bank, setBank] = useState('');
  const [accountType, setAccountType] = useState('CHEQUE');
  const [accountNumber, setAccountNumber] = useState('');
  const [confirmNumber, setConfirmNumber] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('tradesafe_tokens')
      .select('has_bank_account')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => setStatus(data?.has_bank_account ? 'ready' : 'none'));
  }, [user]);

  const handleSave = async () => {
    if (!bank) return alert('Choose your bank.');
    if (!/^\d{5,16}$/.test(accountNumber.replace(/\s/g, ''))) {
      return alert('Enter your account number using digits only.');
    }
    if (accountNumber !== confirmNumber) return alert('The account numbers do not match.');

    const ok = window.confirm(
      'Bank details cannot be changed after saving. Please double-check the account number belongs to you. Save?'
    );
    if (!ok) return;

    try {
      setSaving(true);
      await callFunction('setup-driver-payout', {
        bank,
        account_type: accountType,
        account_number: accountNumber,
      });
      setAccountNumber('');
      setConfirmNumber('');
      setStatus('ready');
    } catch (err) {
      alert(err.message || 'Could not save your bank details.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50 h-screen">
      <div className="bg-[#0A7B44] text-white px-6 py-5 flex items-center gap-3">
        <button onClick={() => navigate('/profile')} className="p-1">
          <FaArrowLeft />
        </button>
        <h1 className="text-lg font-bold">Payout details</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {status === 'loading' && <p className="text-center text-sm text-gray-400">Loading…</p>}

        {status === 'ready' && (
          <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
            <FaCircleCheck className="text-4xl text-[#0A7B44] mx-auto mb-3" />
            <h2 className="font-bold text-gray-900 mb-1">You're set up to get paid</h2>
            <p className="text-sm text-gray-500">
              After a passenger completes a ride, the money is paid into your bank account. To change your bank details, please contact support.
            </p>
          </div>
        )}

        {status === 'none' && (
          <>
            <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
              <p className="text-sm text-gray-600">
                Add the bank account where you want to be paid. Passengers can only book your trips once this is done.
              </p>

              <div className="flex items-center border border-gray-200 rounded-xl px-4">
                <FaBuildingColumns className="text-[#0A7B44] mr-3" />
                <select
                  value={bank}
                  onChange={(e) => setBank(e.target.value)}
                  className="w-full py-3 outline-none text-sm bg-transparent"
                >
                  <option value="">Select your bank…</option>
                  {BANKS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
                </select>
              </div>

              <select
                value={accountType}
                onChange={(e) => setAccountType(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none text-sm bg-transparent"
              >
                {ACCOUNT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>

              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="Account number"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value.replace(/[^\d]/g, ''))}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none text-sm"
              />
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="Confirm account number"
                value={confirmNumber}
                onChange={(e) => setConfirmNumber(e.target.value.replace(/[^\d]/g, ''))}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none text-sm"
              />

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-3 rounded-xl font-semibold text-white bg-[#0A7B44] hover:bg-[#065F33] transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save bank details'}
              </button>
            </div>

            <p className="flex items-start gap-2 text-xs text-gray-400">
              <FaLock className="mt-0.5 flex-shrink-0" />
              Your account number is sent securely to our escrow partner, TradeSafe. RideMatch SA does not store it.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default PayoutSetup;
