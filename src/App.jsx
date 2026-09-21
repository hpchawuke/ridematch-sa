import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Splash from './pages/Splash';
import UserType from './pages/UserType';
import Signup from './pages/Signup';
import Login from './pages/Login';
import Home from './pages/Home';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Splash />} />
          <Route path="/user-type" element={<UserType />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />
          <Route path="/home" element={<Home />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;