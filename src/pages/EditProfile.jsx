import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaArrowLeft, FaUser, FaPhone, FaCarSide, FaLocationDot, FaPen
} from 'react-icons/fa6';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

const EditProfile = () => {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const isDriver = profile?.user_type === 'Driver';

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [vehicle, setVehicle] = useState(profile?.vehicle || '');
  const [route, setRoute] = useState(profile?.route || '');
  const [aboutMe, setAboutMe] = useState(profile?.about_me || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const updates = {
        full_name: fullName.trim(),
        phone: phone.trim(),
        about_me: aboutMe.trim(),
      };

      // Only drivers have these fields to edit
      if (isDriver) {
        updates.vehicle = vehicle.trim();
        updates.route = route.trim();
      }

      const { error: updateError } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id);

      if (updateError) throw updateError;

      await refreshProfile();
      navigate('/profile');
    } catch (err) {
      console.error('Profile update failed:', err);
      setError(err.message || 'Could not save changes. Try again.');
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
        <h1 className="text-lg font-bold">Edit Profile</h1>
      </div>

      <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4">
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
          <Field icon={<FaUser />} label="Full name">
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full outline-none text-sm"
              required
            />
          </Field>

          <Field icon={<FaPhone />} label="Phone">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full outline-none text-sm"
            />
          </Field>
        </div>

        {isDriver && (
          <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
            <Field icon={<FaCarSide />} label="Vehicle">
              <input
                type="text"
                value={vehicle}
                onChange={(e) => setVehicle(e.target.value)}
                placeholder="e.g. Toyota Corolla"
                className="w-full outline-none text-sm"
              />
            </Field>

            <Field icon={<FaLocationDot />} label="Usual route">
              <input
                type="text"
                value={route}
                onChange={(e) => setRoute(e.target.value)}
                placeholder="e.g. Gauteng → Limpopo"
                className="w-full outline-none text-sm"
              />
            </Field>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm p-5">
          <Field icon={<FaPen />} label="About me">
            <textarea
              value={aboutMe}
              onChange={(e) => setAboutMe(e.target.value)}
              rows={3}
              className="w-full outline-none text-sm resize-none"
              placeholder="Tell others a bit about yourself"
            />
          </Field>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full py-4 rounded-xl font-semibold text-white bg-[#0A7B44] hover:bg-[#065F33] transition-colors disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
};

function Field({ icon, label, children }) {
  return (
    <div>
      <label className="flex items-center gap-2 text-xs text-gray-500 mb-1">
        <span className="text-[#0A7B44]">{icon}</span>
        {label}
      </label>
      <div className="border border-gray-200 rounded-xl px-4 py-3">
        {children}
      </div>
    </div>
  );
}

export default EditProfile;