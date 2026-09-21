import React from 'react';

const Layout = ({ children }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      {/* Mobile Phone Frame */}
      <div className="w-full max-w-[400px] h-[850px] bg-white rounded-[2rem] shadow-2xl overflow-hidden relative flex flex-col">
        {children}
      </div>
    </div>
  );
};

export default Layout;