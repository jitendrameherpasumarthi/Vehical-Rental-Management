import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getVehicles, getCustomers, getRentals } from '../services/api';
import { formatCurrency, formatDate } from '../utils/rentalUtils';
import StatCard from '../components/StatCard';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';

function Dashboard({ onConnectionRestored }) {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [vehiclesData, customersData, rentalsData] = await Promise.all([
        getVehicles(),
        getCustomers(),
        getRentals(),
      ]);
      setVehicles(vehiclesData || []);
      setCustomers(customersData || []);
      setRentals(rentalsData || []);
      if (onConnectionRestored) {
        onConnectionRestored();
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      const detailedMessage =
        err.message ||
        'Unable to load dashboard data from JSON Server. Please make sure the JSON Server is running on http://localhost:3000.';
      setError(detailedMessage);
    } finally {
      setIsLoading(false);
    }
  }, [onConnectionRestored]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Dynamic Dashboard Metric Calculations (No hardcoded values)
  const totalVehicles = vehicles.length;
  const availableVehicles = vehicles.filter((v) => v.status === 'Available').length;
  const rentedVehicles = vehicles.filter((v) => v.status === 'Rented').length;
  const maintenanceVehicles = vehicles.filter((v) => v.status === 'Maintenance').length;

  const totalCustomers = customers.length;
  const totalRentals = rentals.length;
  const activeRentals = rentals.filter((r) => r.status === 'Active').length;
  const upcomingRentals = rentals.filter((r) => r.status === 'Upcoming').length;
  const completedRentals = rentals.filter((r) => r.status === 'Completed').length;

  // Calculate Total Revenue from non-cancelled rentals
  const totalRevenue = rentals
    .filter((r) => r.status !== 'Cancelled')
    .reduce((sum, r) => sum + (Number(r.totalAmount) || 0), 0);

  // Vehicle type distribution breakdown
  const vehicleTypeCounts = vehicles.reduce((acc, v) => {
    const type = v.type || 'Other';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  // Helper to get Customer and Vehicle names for rental table
  const getCustomerName = (customerId) => {
    const customer = customers.find((c) => String(c.id) === String(customerId));
    return customer ? customer.name : `Customer #${customerId}`;
  };

  const getVehicleDetails = (vehicleId) => {
    const vehicle = vehicles.find((v) => String(v.id) === String(vehicleId));
    return vehicle
      ? { name: `${vehicle.brand} ${vehicle.name}`, reg: vehicle.registrationNumber, type: vehicle.type }
      : { name: `Vehicle #${vehicleId}`, reg: 'N/A', type: 'Car' };
  };

  // Recent 5 rentals
  const recentRentals = [...rentals].reverse().slice(0, 5);

  // Available vehicles highlight (up to 4)
  const availableVehiclesList = vehicles.filter((v) => v.status === 'Available').slice(0, 4);

  if (isLoading) {
    return <Loading message="Loading dashboard statistics from API..." size="large" />;
  }

  if (error) {
    return (
      <div className="error-card">
        <span className="error-icon">⚠️</span>
        <h3>API Connection Error</h3>
        <p className="error-message-text">{error}</p>
        <div className="error-diagnostic-box">
          <p className="error-diagnostic-title">Diagnostic & Recovery Steps:</p>
          <ul className="error-diagnostic-list">
            <li>
              <strong>Start JSON Server:</strong> Run <code>npm run server</code> in your terminal.
            </li>
            <li>
              <strong>Check Port 3000:</strong> Ensure no other service or crashed node process occupies port 3000.
            </li>
            <li>
              <strong>Verify Database:</strong> Ensure <code>db.json</code> exists and is valid JSON with <code>vehicles</code>, <code>customers</code>, and <code>rentals</code>.
            </li>
          </ul>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={fetchDashboardData}
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Executive Dashboard</h1>
          <p className="page-subtitle">
            Real-time fleet operations, revenue analytics, and active bookings.
          </p>
        </div>
        <div className="header-actions">
          <Link to="/rentals/add" className="btn btn-orange">
            + Create Booking
          </Link>
          <Link to="/vehicles/add" className="btn btn-primary">
            + Add Vehicle
          </Link>
        </div>
      </div>

      {/* Primary Key Metrics Grid - Lux Green, Orange, Yellow */}
      <div className="stats-grid">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(totalRevenue)}
          icon="💰"
          colorVariant="emerald"
          subtitle={`${completedRentals + activeRentals} Paid Rentals`}
        />
        <StatCard
          title="Total Fleet"
          value={totalVehicles}
          icon="🚘"
          colorVariant="yellow"
          subtitle={`${availableVehicles} Ready to Rent`}
          onClick={() => navigate('/vehicles')}
        />
        <StatCard
          title="Active Rentals"
          value={activeRentals}
          icon="⚡"
          colorVariant="orange"
          subtitle={`${upcomingRentals} Upcoming Bookings`}
          onClick={() => navigate('/rentals')}
        />
        <StatCard
          title="Registered Customers"
          value={totalCustomers}
          icon="👥"
          colorVariant="emerald"
          subtitle="Verified Clients"
          onClick={() => navigate('/customers')}
        />
      </div>

      {/* Secondary Quick Metrics Row - Lux Accents */}
      <div className="mini-stats-grid">
        <div className="mini-stat-card">
          <span className="mini-stat-label">Available Vehicles</span>
          <span className="mini-stat-value text-lux-green">{availableVehicles}</span>
        </div>
        <div className="mini-stat-card">
          <span className="mini-stat-label">Currently Rented</span>
          <span className="mini-stat-value text-lux-orange">{rentedVehicles}</span>
        </div>
        <div className="mini-stat-card">
          <span className="mini-stat-label">In Maintenance</span>
          <span className="mini-stat-value text-lux-yellow">{maintenanceVehicles}</span>
        </div>
        <div className="mini-stat-card">
          <span className="mini-stat-label">Completed Rentals</span>
          <span className="mini-stat-value text-lux-green">{completedRentals}</span>
        </div>
      </div>

      {/* Main Content Layout: Recent Rentals & Fleet Distribution */}
      <div className="dashboard-grid">
        {/* Left Column: Recent Rentals */}
        <div className="dashboard-card recent-rentals-card">
          <div className="card-header-flex">
            <div>
              <h2 className="card-title">Recent Rental Transactions</h2>
              <p className="card-desc">Latest bookings logged through JSON Server</p>
            </div>
            <Link to="/rentals" className="btn-link">
              View All ({totalRentals}) →
            </Link>
          </div>

          {recentRentals.length === 0 ? (
            <EmptyState
              icon="📑"
              title="No Rentals Yet"
              description="Create your first vehicle rental to start tracking transactions."
              actionLabel="+ Create Rental"
              onAction={() => navigate('/rentals/add')}
            />
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Vehicle</th>
                    <th>Dates</th>
                    <th>Days</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRentals.map((rental) => {
                    const vehicleInfo = getVehicleDetails(rental.vehicleId);
                    return (
                      <tr key={rental.id}>
                        <td>
                          <span className="font-semibold">{getCustomerName(rental.customerId)}</span>
                        </td>
                        <td>
                          <div className="vehicle-cell">
                            <span className="vehicle-cell-name">{vehicleInfo.name}</span>
                            <span className="vehicle-cell-reg">{vehicleInfo.reg}</span>
                          </div>
                        </td>
                        <td>
                          <div className="date-range-cell">
                            <span>{formatDate(rental.startDate)}</span>
                            <span className="date-arrow">→</span>
                            <span>{formatDate(rental.endDate)}</span>
                          </div>
                        </td>
                        <td>{rental.numberOfDays}d</td>
                        <td>
                          <span className="font-semibold text-accent">
                            {formatCurrency(rental.totalAmount)}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge badge-${rental.status?.toLowerCase()}`}>
                            {rental.status}
                          </span>
                        </td>
                        <td>
                          <Link
                            to={`/rentals/${rental.id}`}
                            className="btn btn-outline btn-xs"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column: Fleet Breakdown & Quick Links */}
        <div className="dashboard-side-column">
          {/* Fleet Distribution */}
          <div className="dashboard-card">
            <h2 className="card-title">Fleet Composition</h2>
            <p className="card-desc">Breakdown by vehicle category</p>
            <div className="category-bars">
              {Object.entries(vehicleTypeCounts).map(([type, count]) => {
                const percentage = Math.round((count / (totalVehicles || 1)) * 100);
                return (
                  <div key={type} className="category-bar-item">
                    <div className="category-bar-header">
                      <span className="category-name">{type}</span>
                      <span className="category-count">
                        {count} ({percentage}%)
                      </span>
                    </div>
                    <div className="progress-bar-bg">
                      <div
                        className="progress-bar-fill"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Available Vehicles Showcase */}
      <div className="dashboard-card mt-6">
        <div className="card-header-flex">
          <div>
            <h2 className="card-title">Available Vehicles Ready for Rent</h2>
            <p className="card-desc">Vehicles available for immediate reservation</p>
          </div>
          <Link to="/vehicles" className="btn-link">
            View All Vehicles →
          </Link>
        </div>

        {availableVehiclesList.length === 0 ? (
          <p className="no-available-text">No vehicles are currently marked as available.</p>
        ) : (
          <div className="mini-vehicle-grid">
            {availableVehiclesList.map((vehicle) => (
              <div key={vehicle.id} className="mini-vehicle-card">
                <img
                  src={vehicle.image}
                  alt={vehicle.name}
                  className="mini-vehicle-img"
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&w=800&q=80';
                  }}
                />
                <div className="mini-vehicle-info">
                  <h4 className="mini-vehicle-title">{vehicle.brand} {vehicle.name}</h4>
                  <p className="mini-vehicle-sub">{vehicle.type} • {vehicle.registrationNumber}</p>
                  <div className="mini-vehicle-footer">
                    <span className="mini-vehicle-price">{formatCurrency(vehicle.pricePerDay)}/day</span>
                    <Link
                      to={`/rentals/add?vehicleId=${vehicle.id}`}
                      className="btn btn-primary btn-xs"
                    >
                      Rent Now
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
