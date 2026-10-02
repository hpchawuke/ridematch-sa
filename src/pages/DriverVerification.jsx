import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaArrowLeft, FaIdCard, FaCar, FaHashtag, FaCircleCheck,
  FaCircleXmark, FaClock
} from 'react-icons/fa6';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

const DriverVerification = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();

  const [verification, setVerification] = useState(null);
  const [loading, setLoading] = useState(true);

  const [idFile, setIdFile] = useState(null);
  const [carFile, setCarFile] = useState(null);
  const [plateNumber, setPlateNumber] = useState('');
  const [idPreviewUrl, setIdPreviewUrl] = useState('');
  const [carPreviewUrl, setCarPreviewUrl] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;

    const fetchVerification = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('driver_verifications')
        .select('*')
        .eq('driver_id', user.id)
        .maybeSingle();

      if (error) {
        console.error(error);
      } else if (data) {
        setVerification(data);
        setPlateNumber(data.plate_number || '');

        // Documents live in a private bucket — get short-lived signed URLs
        // to preview what was already uploaded.
        const [idSigned, carSigned] = await Promise.all([
          supabase.storage.from('driver-documents').createSignedUrl(data.id_document_path, 300),
          supabase.storage.from('driver-documents').createSignedUrl(data.car_photo_path, 300),
        ]);
        if (idSigned.data) setIdPreviewUrl(idSigned.data.signedUrl);
        if (carSigned.data) setCarPreviewUrl(carSigned.data.signedUrl);
      }
      setLoading(false);
    };

    fetchVerification();
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const needsIdFile = !idFile && !verification;
    const needsCarFile = !carFile && !verification;

    if (needsIdFile || needsCarFile || !plateNumber.trim()) {
      setError('Please provide your ID/license, car photo, and plate number.');
      return;
    }

    setSubmitting(true);

    try {
      let idPath = verification?.id_document_path;
      let carPath = verification?.car_photo_path;

      if (idFile) {
        idPath = `${user.id}/id-document`;
        const { error: idErr } = await supabase.storage
          .from('driver-documents')
          .upload(idPath, idFile, { upsert: true, contentType: idFile.type });
        if (idErr) throw idErr;
      }

      if (carFile) {
        carPath = `${user.id}/car-photo`;
        const { error: carErr } = await supabase.storage
          .from('driver-documents')
          .upload(carPath, carFile, { upsert: true, contentType: carFile.type });
        if (carErr) throw carErr;
      }

      const { data, error: rpcErr } = await supabase.rpc('submit_driver_verification', {
        p_id_document_path: idPath,
        p_car_photo_path: carPath,
        p_plate_number: plateNumber.trim(),
      });
      if (rpcErr) throw rpcErr;

      setVerification(data);
      setIdFile(null);
      setCarFile(null);
    } catch (err) {
      console.error('Verification submit failed:', err);
      setError(err.message || 'Could not submit. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white h-screen">
        <p className="text-gray-500">Loading…</p>
      </div>
    );
  }

  if (profile?.user_type !== 'Driver') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-white h-screen text-center p-6">
        <p className="text-gray-500 mb-4">This page is for drivers only.</p>
        <button onClick={() => navigate('/home')} className="text-sm font-semibold text-[#0A7B44] hover:underline">
          Go home
        </button>
      </div>
    );
  }

  const status = verification?.status;
  const isApproved = status === 'approved';
  const isPending = status === 'pending';
  const isDeclined = status === 'declined';

  return (
    <div className="flex-1 flex flex-col bg-gray-50 h-screen">
      <div className="bg-[#0A7B44] text-white px-6 py-5 flex items-center gap-3">
        <button onClick={() => navigate('/home')} className="p-1">
          <FaArrowLeft />
        </button>
        <h1 className="text-lg font-bold">Driver Verification</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Status banner */}
        {status && (
          <div
            className={`rounded-xl px-4 py-3 flex items-start gap-2 text-sm ${
              isApproved
                ? 'bg-green-50 border border-green-200 text-green-700'
                : isDeclined
                ? 'bg-red-50 border border-red-200 text-red-600'
                : 'bg-yellow-50 border border-yellow-200 text-yellow-700'
            }`}
          >
            {isApproved && <FaCircleCheck className="mt-0.5 flex-shrink-0" />}
            {isDeclined && <FaCircleXmark className="mt-0.5 flex-shrink-0" />}
            {isPending && <FaClock className="mt-0.5 flex-shrink-0" />}
            <div>
              {isApproved && <p className="font-medium">You're verified. You can accept ride requests.</p>}
              {isPending && <p className="font-medium">Your documents are under review.</p>}
              {isDeclined && (
                <>
                  <p className="font-medium">Your submission was declined.</p>
                  {verification.decline_reason && (
                    <p className="mt-1 text-xs">{verification.decline_reason}</p>
                  )}
                  <p className="mt-1 text-xs">Update your documents below and resubmit.</p>
                </>
              )}
            </div>
          </div>
        )}

        {!isApproved && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
              <FileField
                icon={<FaIdCard />}
                label="ID or driver's license"
                previewUrl={idPreviewUrl}
                onChange={(file) => setIdFile(file)}
                fileName={idFile?.name}
              />

              <FileField
                icon={<FaCar />}
                label="Photo of your car"
                previewUrl={carPreviewUrl}
                onChange={(file) => setCarFile(file)}
                fileName={carFile?.name}
              />

              <div>
                <label className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                  <FaHashtag className="text-[#0A7B44]" />
                  Number plate
                </label>
                <div className="border border-gray-200 rounded-xl px-4 py-3">
                  <input
                    type="text"
                    value={plateNumber}
                    onChange={(e) => setPlateNumber(e.target.value)}
                    placeholder="e.g. CA 123-456"
                    className="w-full outline-none text-sm uppercase"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 rounded-xl font-semibold text-white bg-[#0A7B44] hover:bg-[#065F33] transition-colors disabled:opacity-60"
            >
              {submitting ? 'Submitting…' : verification ? 'Resubmit' : 'Submit for review'}
            </button>

            <p className="text-xs text-gray-400 text-center">
              Your documents are only visible to you and to RideMatch SA admins.
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

function FileField({ icon, label, previewUrl, onChange, fileName }) {
  return (
    <div>
      <label className="flex items-center gap-2 text-xs text-gray-500 mb-1">
        <span className="text-[#0A7B44]">{icon}</span>
        {label}
      </label>

      {previewUrl && (
        <img
          src={previewUrl}
          alt={label}
          className="w-full h-32 object-cover rounded-xl mb-2 border border-gray-200"
        />
      )}

      <label className="flex items-center justify-center border border-dashed border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-500 cursor-pointer hover:bg-gray-50">
        {fileName || (previewUrl ? 'Replace file' : 'Choose file')}
        <input
          type="file"
          accept="image/*"
          onChange={(e) => onChange(e.target.files?.[0] || null)}
          className="hidden"
        />
      </label>
    </div>
  );
}

export default DriverVerification;