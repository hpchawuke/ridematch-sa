import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Splash from './pages/Splash';
import UserType from './pages/UserType';
import Signup from './pages/Signup';
import Login from './pages/Login';
import Home from './pages/Home';
import Profile from './pages/Profile';
import Search from './pages/Search';
import PostRide from './pages/PostRide';
import Bookings from './pages/Bookings';
import MyTrips from './pages/MyTrips';
import BookTrip from './pages/BookTrip';
import DriverProfile from './pages/DriverProfile';
import EditProfile from './pages/EditProfile';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-6 text-center">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Splash />} />
        <Route path="/user-type" element={<UserType />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/profile/edit" element={<EditProfile />} />


        {/* Home Route */}
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />

        {/* Profile Route */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        {/* Search Route (passenger) */}
        <Route
          path="/search"
          element={
            <ProtectedRoute>
              <Search />
            </ProtectedRoute>
          }
        />

        {/* Post Ride Route (driver) */}
        <Route
          path="/post-ride"
          element={
            <ProtectedRoute>
              <PostRide />
            </ProtectedRoute>
          }
        />
        <Route path="/driver/:driverId" element={<DriverProfile />} />

        {/* Bookings Route (passenger) */}
        <Route
          path="/bookings"
          element={
            <ProtectedRoute>
              <Bookings />
            </ProtectedRoute>
          }
        />

        {/* My Trips Route (driver) */}
        <Route
          path="/my-trips"
          element={
            <ProtectedRoute>
              <MyTrips />
            </ProtectedRoute>
          }
        />

        {/* ✅ Trip Details / Book Trip Route */}
        <Route
          path="/book/:tripId"
          element={
            <ProtectedRoute>
              <BookTrip />
            </ProtectedRoute>
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;