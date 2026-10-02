import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaArrowLeft, FaCircleCheck, FaCircleXmark, FaStar, FaCarSide,
  FaLocationDot, FaClock, FaUser, FaPhone, FaEnvelope,
  FaRightFromBracket, FaHouse, FaMagnifyingGlass,
  FaCalendarDays, FaPenToSquare, FaCamera
} from 'react-icons/fa6';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

const Profile = () => {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();

  const fileInputRef = useRef(null);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Keep local avatar in sync with the profile row once it loads
  useEffect(() => {
    setAvatarUrl(profile?.avatar_url || '');
  }, [profile?.avatar_url]);

  // The "Verified" badge for a driver should reflect admin document
  // approval (driver_verifications.status), not email confirmation —
  // those are two different kinds of "verified".
  const [driverVerificationStatus, setDriverVerificationStatus] = useState(null);

  useEffect(() => {
    if (!user || profile?.user_type !== 'Driver') return;

    supabase
      .from('driver_verifications')
      .select('status')
      .eq('driver_id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error(error);
        setDriverVerificationStatus(data?.status || 'not_submitted');
      });
  }, [user, profile?.user_type]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // lets the user re-pick the same file later
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Please choose an image file.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setUploadError('Image must be under 2 MB.');
      return;
    }

    setUploading(true);
    setUploadError('');

    try {
      // One fixed path per user, so a new upload replaces the old one
      const path = `${user.id}/avatar`;

      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadErr) throw uploadErr;

      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      // Timestamp busts the browser cache since the path never changes
      const url = `${data.publicUrl}?t=${Date.now()}`;

      const { error: dbErr } = await supabase
        .from('users')
        .update({ avatar_url: url })
        .eq('id', user.id);
      if (dbErr) throw dbErr;

      setAvatarUrl(url);
    } catch (err) {
      console.error('Avatar upload failed:', err);
      setUploadError(err.message || 'Upload failed. Try again.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <p className="text-gray-500">Loading…</p>
      </div>
    );
  }

  const isDriver = profile?.user_type === 'Driver';
  // Passengers still use email-confirmation as "verified" — drivers use
  // the admin-reviewed driver_verifications status instead.
  const isVerified = isDriver
    ? driverVerificationStatus === 'approved'
    : profile?.verified === true;

  const displayName = profile?.full_name || 'User Name';
  const displayPhone = profile?.phone || '—';
  const displayEmail = user?.email || '—';
  // Note: vehicle, route, rating, trips, and aboutMe were never part of the
  // Firestore users doc either — these fall back to defaults until you add
  // matching columns to public.users and start writing to them.
  const vehicle = profile?.vehicle || 'Toyota Corolla';
  const route = profile?.route || 'Gauteng → Limpopo';
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).getFullYear()
    : new Date().getFullYear();
  const rating = profile?.rating || '4.8';
  const trips = profile?.trips || '0';
  const aboutMe = profile?.about_me ||
    'Safe, friendly and punctual. Travelling regularly between Johannesburg and Polokwane.';

  return (
    <div className="flex-1 flex flex-col bg-gray-50 h-screen relative">

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pb-24">

        {/* Header */}
        <div className="bg-white px-6 pt-6 pb-6 border-b border-gray-100">
          <div className="flex items-center justify-between mb-6">
            {/* Back — goes to /home now */}
            <button
              onClick={() => navigate('/home')}
              className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors text-[#0A7B44]"
            >
              <FaArrowLeft className="text-xl" />
            </button>

            <div className="text-center flex-1">
              <h1 className="text-lg font-bold text-gray-900">
                {isDriver ? 'Driver Profile' : 'Passenger Profile'}
              </h1>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 -mr-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-gray-600"
              title="Log out"
            >
              <FaRightFromBracket />
            </button>
          </div>

          {/* Avatar + name */}
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-3">
              <div className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden border-4 border-white shadow-sm">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#0A7B44] text-white text-3xl font-bold">
                    {displayName.charAt(0)}
                  </div>
                )}
              </div>

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#0A7B44] text-white flex items-center justify-center border-2 border-white shadow disabled:opacity-60"
                title="Change photo"
              >
                <FaCamera className="text-xs" />
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>

            {uploading && <p className="text-xs text-gray-500 mb-2">Uploading…</p>}
            {uploadError && <p className="text-xs text-red-600 mb-2">{uploadError}</p>}

            <h2 className="text-xl font-bold text-gray-900">{displayName}</h2>

            <VerifiedBadge isDriver={isDriver} isVerified={isVerified} driverStatus={driverVerificationStatus} />

            {isDriver && (
              <div className="flex items-center gap-1 text-sm text-gray-600 mt-3">
                <FaStar className="text-yellow-400" />
                <span className="font-semibold text-gray-900">{rating}</span>
                <span>({trips} trips)</span>
              </div>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="px-6 mt-4">
          <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
            {isDriver && (
              <>
                <DetailRow icon={<FaCarSide />} text={vehicle} />
                <DetailRow icon={<FaLocationDot />} text={route} />
              </>
            )}

            <DetailRow icon={<FaClock />} text={`Member since ${memberSince}`} />

            {!isDriver && (
              <>
                <DetailRow icon={<FaPhone />} text={displayPhone} />
                <DetailRow icon={<FaEnvelope />} text={displayEmail} />
              </>
            )}
          </div>
        </div>

        {/* About */}
        <div className="px-6 mt-6 mb-8">
          <h3 className="text-sm font-semibold text-gray-500 mb-3">About me</h3>
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <p className="text-sm text-gray-600 leading-relaxed">{aboutMe}</p>
          </div>
        </div>

        {/* Verify Account — drivers only */}
        {isDriver && (
          <div className="px-6 mb-3">
            <button
              onClick={() => navigate('/verification')}
              className="w-full py-4 rounded-xl font-semibold text-[#0A7B44] border-2 border-[#0A7B44] hover:bg-green-50 transition-colors flex items-center justify-center gap-2"
            >
              <FaCircleCheck />
              Verify Account
            </button>
          </div>
        )}

        <div className="px-6 mb-8">
          <button
            onClick={() => navigate('/profile/edit')}
            className="w-full py-4 rounded-xl font-semibold text-white bg-[#0A7B44] hover:bg-[#065F33] transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <FaPenToSquare />
            Edit Profile
          </button>
        </div>
      </div>

      {/* BOTTOM NAV — role-based now */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center px-4 py-2">

        <NavBtn
          icon={<FaHouse />}
          label="Home"
          onClick={() => navigate('/home')}
        />

        {isDriver ? (
          <NavBtn
            icon={<FaCarSide />}
            label="Post Ride"
            onClick={() => navigate('/post-ride')}
          />
        ) : (
          <NavBtn
            icon={<FaMagnifyingGlass />}
            label="Search"
            onClick={() => navigate('/search')}
          />
        )}

        <NavBtn
          icon={<FaCalendarDays />}
          label={isDriver ? 'My Trips' : 'Bookings'}
          onClick={() => navigate(isDriver ? '/my-trips' : '/bookings')}
        />

        <NavBtn
          icon={<FaUser />}
          label="Profile"
          active
          onClick={() => navigate('/profile')}
        />
      </div>
    </div>
  );
};

function VerifiedBadge({ isDriver, isVerified, driverStatus }) {
  if (isVerified) {
    return (
      <div className="flex items-center gap-1 bg-[#0A7B44] text-white text-xs px-3 py-1 rounded-full mt-2">
        <FaCircleCheck />
        <span>Verified</span>
      </div>
    );
  }

  // Driver mid-review gets a neutral "pending" look rather than red, since
  // nothing has actually gone wrong yet — red is for not-submitted/declined.
  if (isDriver && driverStatus === 'pending') {
    return (
      <div className="flex items-center gap-1 bg-yellow-100 text-yellow-700 text-xs px-3 py-1 rounded-full mt-2">
        <FaClock />
        <span>Pending verification</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 bg-red-100 text-red-600 text-xs px-3 py-1 rounded-full mt-2">
      <FaCircleXmark />
      <span>{isDriver && driverStatus === 'declined' ? 'Verification declined' : 'Unverified'}</span>
    </div>
  );
}

function DetailRow({ icon, text }) {
  return (
    <div className="flex items-center gap-3 text-gray-700">
      <span className="text-[#0A7B44] w-5 flex justify-center">{icon}</span>
      <span className="text-sm font-medium">{text}</span>
    </div>
  );
}

function NavBtn({ icon, label, onClick, active }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 ${
        active ? 'text-[#0A7B44]' : 'text-gray-400 hover:text-gray-600'
      }`}
    >
      <span className="text-xl">{icon}</span>
      <span className={`text-[10px] ${active ? 'font-medium' : ''}`}>{label}</span>
    </button>
  );
}

export default Profile;