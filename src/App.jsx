import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import { checkServerHealth } from './services/api';

// Pages
import Dashboard from './pages/Dashboard';
import Vehicles from './pages/Vehicles';
import AddVehicle from './pages/AddVehicle';
import EditVehicle from './pages/EditVehicle';
import VehicleDetails from './pages/VehicleDetails';
import Customers from './pages/Customers';
import AddCustomer from './pages/AddCustomer';
import EditCustomer from './pages/EditCustomer';
import Rentals from './pages/Rentals';
import AddRental from './pages/AddRental';
import EditRental from './pages/EditRental';
import RentalDetails from './pages/RentalDetails';
import NotFound from './pages/NotFound';

import './App.css';

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('rentwheels_theme') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-bs-theme', theme);
    localStorage.setItem('rentwheels_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setThemeMode = (newMode) => {
    setTheme(newMode);
  };

  const verifyConnection = useCallback(async () => {
    await checkServerHealth();
  }, []);

  useEffect(() => {
    verifyConnection();

    // Check periodically every 15 seconds
    const interval = setInterval(verifyConnection, 15000);

    // Re-check when window gains focus
    window.addEventListener('focus', verifyConnection);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', verifyConnection);
    };
  }, [verifyConnection]);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className="portal-app">
      <Navbar
        onToggleSidebar={toggleSidebar}
        isSidebarOpen={isSidebarOpen}
        theme={theme}
        onToggleTheme={toggleTheme}
        onSetTheme={setThemeMode}
      />
      <div className="portal-layout">
        <Sidebar isOpen={isSidebarOpen} onCloseMobile={closeSidebar} />
        <main className="portal-main-view">
          <div className="portal-content-container">
            <Routes>
              {/* Dashboard Route */}
              <Route path="/" element={<Dashboard onConnectionRestored={verifyConnection} />} />

              {/* Vehicle Routes */}
              <Route path="/vehicles" element={<Vehicles />} />
              <Route path="/vehicles/add" element={<AddVehicle />} />
              <Route path="/vehicles/:id" element={<VehicleDetails />} />
              <Route path="/vehicles/edit/:id" element={<EditVehicle />} />

              {/* Customer Routes */}
              <Route path="/customers" element={<Customers />} />
              <Route path="/customers/add" element={<AddCustomer />} />
              <Route path="/customers/edit/:id" element={<EditCustomer />} />

              {/* Rental Routes */}
              <Route path="/rentals" element={<Rentals />} />
              <Route path="/rentals/add" element={<AddRental />} />
              <Route path="/rentals/:id" element={<RentalDetails />} />
              <Route path="/rentals/edit/:id" element={<EditRental />} />

              {/* 404 Catch-All Route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
