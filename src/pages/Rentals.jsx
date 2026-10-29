import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getRentals, getVehicles, getCustomers, deleteRental, updateVehicle } from '../services/api';
import { formatCurrency, formatDate } from '../utils/rentalUtils';
import SearchBar from '../components/SearchBar';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import ConfirmModal from '../components/ConfirmModal';
import Toast from '../components/Toast';

function Rentals() {
  const navigate = useNavigate();
  const [rentals, setRentals] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [rentalToDelete, setRentalToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const fetchRentalsData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [rentalsData, vehiclesData, customersData] = await Promise.all([
        getRentals(),
        getVehicles(),
        getCustomers(),
      ]);
      setRentals(rentalsData || []);
      setVehicles(vehiclesData || []);
      setCustomers(customersData || []);
    } catch (err) {
      console.error('Error fetching rentals:', err);
      setError(err.message || 'Failed to fetch rental transactions from JSON Server on port 3000.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRentalsData();
  }, []);

  const customerMap = useMemo(() => {
    return new Map(customers.map((c) => [String(c.id), c]));
  }, [customers]);

  const vehicleMap = useMemo(() => {
    return new Map(vehicles.map((v) => [String(v.id), v]));
  }, [vehicles]);

  const getCustomerName = (customerId) => {
    const customer = customerMap.get(String(customerId));
    return customer ? customer.name : `Customer #${customerId}`;
  };

  const getVehicleInfo = (vehicleId) => {
    const vehicle = vehicleMap.get(String(vehicleId));
    return vehicle
      ? {
          name: `${vehicle.brand} ${vehicle.name}`,
          reg: vehicle.registrationNumber,
          type: vehicle.type,
        }
      : {
          name: `Vehicle #${vehicleId}`,
          reg: 'N/A',
          type: 'Car',
        };
  };

  const filteredRentals = useMemo(() => {
    return rentals
      .filter((r) => {
        const cust = customerMap.get(String(r.customerId));
        const customerName = cust ? cust.name.toLowerCase() : '';
        const veh = vehicleMap.get(String(r.vehicleId));
        const vehicleName = veh ? `${veh.brand} ${veh.name}`.toLowerCase() : '';
        const vehicleReg = veh ? veh.registrationNumber.toLowerCase() : '';
        const term = searchTerm.toLowerCase().trim();

        const matchesSearch =
          !term ||
          customerName.includes(term) ||
          vehicleName.includes(term) ||
          vehicleReg.includes(term) ||
          String(r.id).includes(term);

        const matchesStatus = statusFilter === 'All' || r.status === statusFilter;

        return matchesSearch && matchesStatus;
      })
      .reverse(); // Most recent first
  }, [rentals, customerMap, vehicleMap, searchTerm, statusFilter]);

  const handleReset = () => {
    setSearchTerm('');
    setStatusFilter('All');
  };

  const promptDeleteRental = (rental) => {
    setRentalToDelete(rental);
  };

  const handleQuickStatusChange = async (rental, newStatus) => {
    try {
      const updated = { ...rental, status: newStatus };
      await updateRental(rental.id, updated);

      const targetVehicle = vehicleMap.get(String(rental.vehicleId));
      if (targetVehicle) {
        if (newStatus === 'Completed' || newStatus === 'Cancelled') {
          const otherActive = rentals.some(
            (r) =>
              String(r.id) !== String(rental.id) &&
              String(r.vehicleId) === String(targetVehicle.id) &&
              r.status === 'Active'
          );
          if (!otherActive && targetVehicle.status === 'Rented') {
            await updateVehicle(targetVehicle.id, { ...targetVehicle, status: 'Available' });
          }
        } else if (newStatus === 'Active' && targetVehicle.status === 'Available') {
          await updateVehicle(targetVehicle.id, { ...targetVehicle, status: 'Rented' });
        }
      }

      setToast({
        message: `Booking #${rental.id} marked as ${newStatus}! Fleet status synchronized.`,
        type: 'success',
      });
      await fetchRentalsData();
    } catch (err) {
      console.error('Error updating rental status:', err);
      setToast({
        message: 'Failed to update rental status.',
        type: 'error',
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!rentalToDelete) return;
    setIsDeleting(true);
    try {
      await deleteRental(rentalToDelete.id);

      // If the deleted rental was Active, check if the vehicle should be marked Available
      const targetVehicle = vehicles.find((v) => String(v.id) === String(rentalToDelete.vehicleId));
      if (targetVehicle && targetVehicle.status === 'Rented') {
        const remainingActive = rentals.filter(
          (r) =>
            String(r.id) !== String(rentalToDelete.id) &&
            String(r.vehicleId) === String(targetVehicle.id) &&
            r.status === 'Active'
        );
        if (remainingActive.length === 0) {
          await updateVehicle(targetVehicle.id, {
            ...targetVehicle,
            status: 'Available',
          });
        }
      }

      setToast({
        message: `Rental booking #${rentalToDelete.id} deleted successfully. Vehicle availability has been updated.`,
        type: 'success',
      });
      setRentalToDelete(null);
      await fetchRentalsData();
    } catch (err) {
      console.error('Error deleting rental:', err);
      setToast({
        message: 'Failed to delete rental from server.',
        type: 'error',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Metrics
  const activeCount = rentals.filter((r) => r.status === 'Active').length;
  const upcomingCount = rentals.filter((r) => r.status === 'Upcoming').length;
  const completedCount = rentals.filter((r) => r.status === 'Completed').length;
  const totalVolume = rentals
    .filter((r) => r.status !== 'Cancelled')
    .reduce((sum, r) => sum + (Number(r.totalAmount) || 0), 0);

  return (
    <div className="rentals-page">
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'success' })}
      />

      <ConfirmModal
        isOpen={Boolean(rentalToDelete)}
        title="Delete Rental Booking"
        message={`Are you sure you want to delete Rental #${rentalToDelete?.id} for ${getCustomerName(
          rentalToDelete?.customerId
        )}? This will release the vehicle for these booking dates.`}
        confirmText={isDeleting ? 'Deleting...' : 'Delete Rental'}
        confirmVariant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setRentalToDelete(null)}
      />

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Rental Transactions</h1>
          <p className="page-subtitle">
            Track active bookings, calculate billing amounts, and manage reservation schedules.
          </p>
        </div>
        <div className="header-actions">
          <Link to="/rentals/add" className="btn btn-orange">
            + Create New Rental
          </Link>
        </div>
      </div>

      {/* Quick Metric Summary Badges */}
      <div className="mini-stats-grid">
        <div className="mini-stat-card">
          <span className="mini-stat-label">Active Bookings</span>
          <span className="mini-stat-value text-lux-orange">{activeCount}</span>
        </div>
        <div className="mini-stat-card">
          <span className="mini-stat-label">Upcoming Reservations</span>
          <span className="mini-stat-value text-lux-yellow">{upcomingCount}</span>
        </div>
        <div className="mini-stat-card">
          <span className="mini-stat-label">Completed Bookings</span>
          <span className="mini-stat-value text-lux-green">{completedCount}</span>
        </div>
        <div className="mini-stat-card">
          <span className="mini-stat-label">Total Revenue</span>
          <span className="mini-stat-value text-lux-green">{formatCurrency(totalVolume)}</span>
        </div>
      </div>

      {/* Search & Status Filters */}
      <div className="filters-card">
        <SearchBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          placeholder="Search by customer name, vehicle name, registration number, or booking ID..."
          filters={[
            {
              label: 'Rental Status:',
              value: statusFilter,
              onChange: setStatusFilter,
              options: [
                { label: 'All Statuses', value: 'All' },
                { label: 'Active', value: 'Active' },
                { label: 'Upcoming', value: 'Upcoming' },
                { label: 'Completed', value: 'Completed' },
                { label: 'Cancelled', value: 'Cancelled' },
              ],
            },
          ]}
          onReset={handleReset}
        />
      </div>

      {/* Content Area */}
      {isLoading ? (
        <Loading message="Loading rental transactions from JSON Server..." size="large" />
      ) : error ? (
        <div className="error-card">
          <span className="error-icon">⚠️</span>
          <h3>Error Loading Rentals</h3>
          <p>{error}</p>
          <button type="button" className="btn btn-primary" onClick={fetchRentalsData}>
            Retry
          </button>
        </div>
      ) : filteredRentals.length === 0 ? (
        <EmptyState
          icon="📑"
          title={rentals.length === 0 ? 'No Rental Bookings Found' : 'No Matching Rentals'}
          description={
            rentals.length === 0
              ? 'Create a new rental to assign a vehicle to a customer.'
              : 'Try modifying your search keywords or resetting filters.'
          }
          actionLabel={rentals.length === 0 ? '+ Create New Rental' : 'Reset Filters'}
          onAction={rentals.length === 0 ? () => navigate('/rentals/add') : handleReset}
        />
      ) : (
        <div className="table-card">
          <div className="table-responsive">
            <table className="data-table table table-dark table-hover align-middle">
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Customer</th>
                  <th>Vehicle</th>
                  <th>Rental Dates</th>
                  <th>Duration & Rate</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRentals.map((rental) => {
                  const vehicleInfo = getVehicleInfo(rental.vehicleId);
                  return (
                    <tr key={rental.id}>
                      <td>
                        <Link to={`/rentals/${rental.id}`} className="font-mono text-accent">
                          #{rental.id}
                        </Link>
                      </td>
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
                      <td>
                        <div className="rate-cell">
                          <span>{rental.numberOfDays} {rental.numberOfDays === 1 ? 'day' : 'days'}</span>
                          <span className="rate-sub">@ {formatCurrency(rental.pricePerDay)}/d</span>
                        </div>
                      </td>
                      <td>
                        <span className="total-amount-pill">
                          {formatCurrency(rental.totalAmount)}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge badge-${rental.status?.toLowerCase()}`}>
                          {rental.status}
                        </span>
                      </td>
                      <td>
                        <div className="table-action-btns">
                          {rental.status === 'Active' && (
                            <button
                              type="button"
                              className="btn btn-emerald-outline btn-xs"
                              onClick={() => handleQuickStatusChange(rental, 'Completed')}
                              title="Mark Completed & Free Vehicle"
                            >
                              ✓ Return
                            </button>
                          )}
                          {rental.status === 'Upcoming' && (
                            <button
                              type="button"
                              className="btn btn-blue-outline btn-xs"
                              onClick={() => handleQuickStatusChange(rental, 'Active')}
                              title="Dispatch Vehicle & Set Active"
                            >
                              ▶ Dispatch
                            </button>
                          )}
                          <Link
                            to={`/rentals/${rental.id}`}
                            className="btn btn-outline btn-xs"
                            title="View Invoice & Details"
                          >
                            View
                          </Link>
                          <Link
                            to={`/rentals/edit/${rental.id}`}
                            className="btn btn-secondary btn-xs"
                            title="Edit Rental"
                          >
                            Edit
                          </Link>
                          <button
                            type="button"
                            className="btn btn-danger-outline btn-xs"
                            onClick={() => promptDeleteRental(rental)}
                            title="Delete Rental"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default Rentals;
