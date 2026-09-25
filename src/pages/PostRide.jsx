import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import {
  FaArrowLeft, FaLocationDot, FaFlagCheckered, FaCalendarDays,
  FaClock, FaUsers, FaMoneyBill
} from 'react-icons/fa6';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

const GAUTENG = ['Johannesburg', 'Pretoria', 'Midrand', 'Soweto', 'Tembisa'];
const LIMPOPO = ['Polokwane', 'Mokopane', 'Thohoyandou', 'Musina', 'Tzaneen', 'Lebowakgomo'];
const PRICE = 350;

const PostRide = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [fromRegion, setFromRegion] = useState('Gauteng');
  const [fromCity, setFromCity] = useState('');
  const [toCity, setToCity] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [seats, setSeats] = useState(3);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fromCities = fromRegion === 'Gauteng' ? GAUTENG : LIMPOPO;
  const toCities = fromRegion === 'Gauteng' ? LIMPOPO : GAUTENG;

  const handleSubmit = async () => {
    if (!fromCity || !toCity || !date || !time) {
      alert('Please fill in all fields.');
      return;
    }
    if (fromCity === toCity) {
      alert('From and To cannot be the same.');
      return;
    }

    try {
      setSubmitting(true);
      await addDoc(collection(db, 'trips'), {
        driverId: user.uid,
        driverName: profile?.fullName || user.email,
        driverPhone: profile?.phone || '',
        fromRegion,
        fromCity,
        toCity,
        date,
        time,
        seats: Number(seats),
        seatsAvailable: Number(seats),
        price: PRICE,
        notes: notes.trim(),
        status: 'active',
        createdAt: serverTimestamp(),
      });
      alert('Trip posted!');
      navigate('/my-trips');
    } catch (err) {
      console.error(err);
      alert('Failed to post trip. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50 h-full">

      {/* Header */}
      <div className="bg-[#0A7B44] text-white px-6 py-4 flex items-center gap-3 flex-shrink-0">
        <button onClick={() => navigate('/home')} className="p-1">
          <FaArrowLeft />
        </button>
        <h1 className="text-lg font-bold">Post a Ride</h1>
      </div>

      {/* Scrollable form — small padding, tight spacing */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">

        {/* Direction */}
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
          <div className="flex gap-2">
            <button
              onClick={() => { setFromRegion('Gauteng'); setFromCity(''); setToCity(''); }}
              className={`flex-1 py-2 rounded-xl text-xs font-medium border ${
                fromRegion === 'Gauteng'
                  ? 'bg-[#0A7B44] text-white border-[#0A7B44]'
                  : 'bg-white text-gray-600 border-gray-200'
              }`}
            >
              GP → LP
            </button>
            <button
              onClick={() => { setFromRegion('Limpopo'); setFromCity(''); setToCity(''); }}
              className={`flex-1 py-2 rounded-xl text-xs font-medium border ${
                fromRegion === 'Limpopo'
                  ? 'bg-[#0A7B44] text-white border-[#0A7B44]'
                  : 'bg-white text-gray-600 border-gray-200'
              }`}
            >
              LP → GP
            </button>
          </div>

          <div className="flex items-center border border-gray-200 rounded-xl px-3">
            <FaLocationDot className="text-[#0A7B44] mr-2 text-sm" />
            <select
              value={fromCity}
              onChange={(e) => setFromCity(e.target.value)}
              className="w-full py-2.5 outline-none text-sm bg-transparent"
            >
              <option value="">From…</option>
              {fromCities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="flex items-center border border-gray-200 rounded-xl px-3">
            <FaFlagCheckered className="text-[#0A7B44] mr-2 text-sm" />
            <select
              value={toCity}
              onChange={(e) => setToCity(e.target.value)}
              className="w-full py-2.5 outline-none text-sm bg-transparent"
            >
              <option value="">To…</option>
              {toCities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* When */}
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center border border-gray-200 rounded-xl px-3">
              <FaCalendarDays className="text-[#0A7B44] mr-2 text-sm" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full py-2.5 outline-none text-xs bg-transparent"
              />
            </div>
            <div className="flex items-center border border-gray-200 rounded-xl px-3">
              <FaClock className="text-[#0A7B44] mr-2 text-sm" />
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full py-2.5 outline-none text-xs bg-transparent"
              />
            </div>
          </div>
        </div>

        {/* Seats + Price */}
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
          <div className="flex items-center border border-gray-200 rounded-xl px-3">
            <FaUsers className="text-[#0A7B44] mr-2 text-sm" />
            <input
              type="number"
              min="1"
              max="7"
              value={seats}
              onChange={(e) => setSeats(e.target.value)}
              className="w-full py-2.5 outline-none text-sm"
              placeholder="Seats"
            />
          </div>
          <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-3 py-2.5">
            <span className="flex items-center gap-2 text-xs text-gray-600">
              <FaMoneyBill className="text-[#0A7B44]" /> Price/seat
            </span>
            <span className="font-bold text-[#0A7B44] text-sm">R {PRICE}</span>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)"
            rows={2}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 outline-none text-sm resize-none"
          />
        </div>

        {/* SUBMIT — right here, after the form */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-4 rounded-xl font-semibold text-white bg-[#0A7B44] hover:bg-[#065F33] transition-colors disabled:opacity-50"
        >
          {submitting ? 'Posting…' : 'Post Trip'}
        </button>

        {/* Extra bottom padding so the button isn't cut off */}
        <div className="h-4" />
      </div>
    </div>
  );
};

export default PostRide;