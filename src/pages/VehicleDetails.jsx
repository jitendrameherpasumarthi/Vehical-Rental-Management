import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getVehicleById, getRentals, getCustomers, deleteVehicle } from '../services/api';
import { formatCurrency, formatDate, getVehicleDynamicStatus } from '../utils/rentalUtils';
import Loading from '../components/Loading';
import ConfirmModal from '../components/ConfirmModal';
import Toast from '../components/Toast';

function VehicleDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [vehicle, setVehicle] = useState(null);
  const [vehicleRentals, setVehicleRentals] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  useEffect(() => {
    const loadVehicleDetails = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [vehicleData, rentalsData, customersData] = await Promise.all([
          getVehicleById(id),
          getRentals(),
          getCustomers(),
        ]);

        if (!vehicleData) {
          setError(`Vehicle #${id} not found.`);
        } else {
          setVehicle(vehicleData);
          const relatedRentals = (rentalsData || []).filter(
            (r) => String(r.vehicleId) === String(id)
          );
          setVehicleRentals(relatedRentals);
          setCustomers(customersData || []);
        }
      } catch (err) {
        console.error('Error fetching vehicle details:', err);
        setError('Failed to fetch vehicle information from the server.');
      } finally {
        setIsLoading(false);
      }
    };

    loadVehicleDetails();
  }, [id]);

  const getCustomerName = (customerId) => {
    const c = customers.find((cust) => String(cust.id) === String(customerId));
    return c ? c.name : `Customer #${customerId}`;
  };

  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'available':
        return 'badge-success';
      case 'rented':
        return 'badge-warning';
      case 'maintenance':
        return 'badge-danger';
      default:
        return 'badge-neutral';
    }
  };

  const promptDelete = () => {
    const hasActiveRentals = vehicleRentals.some(
      (r) => r.status === 'Active'
    );
    if (hasActiveRentals) {
      setToast({
        message: `Cannot delete "${vehicle?.name || 'this vehicle'}" because it currently has active rental bookings.`,
        type: 'error',
      });
      return;
    }
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    const hasActiveRentals = vehicleRentals.some(
      (r) => r.status === 'Active'
    );
    if (hasActiveRentals) {
      setToast({
        message: `Cannot delete "${vehicle?.name || 'this vehicle'}" because it currently has active rental bookings.`,
        type: 'error',
      });
      setIsDeleteModalOpen(false);
      return;
    }

    setIsDeleting(true);
    try {
      await deleteVehicle(id);
      setToast({
        message: 'Vehicle deleted successfully.',
        type: 'success',
      });
      setTimeout(() => {
        navigate('/vehicles');
      }, 800);
    } catch (err) {
      console.error('Error deleting vehicle:', err);
      setToast({
        message: 'Could not delete vehicle. Please check API server.',
        type: 'error',
      });
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  if (isLoading) {
    return <Loading message="Loading vehicle specifications..." size="large" />;
  }

  if (error || !vehicle) {
    return (
      <div className="error-card">
        <span className="error-icon">⚠️</span>
        <h3>Vehicle Not Found</h3>
        <p>{error || 'The requested vehicle could not be located.'}</p>
        <button type="button" className="btn btn-secondary" onClick={() => navigate('/vehicles')}>
          Back to Vehicles
        </button>
      </div>
    );
  }

  const dynamicStatus = getVehicleDynamicStatus(vehicle, vehicleRentals);
  const isAvailable = dynamicStatus === 'Available';

  return (
    <div className="vehicle-details-page">
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'success' })}
      />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        title="Delete Vehicle"
        message={`Are you sure you want to delete ${vehicle.brand} ${vehicle.name} (${vehicle.registrationNumber})?`}
        confirmText={isDeleting ? 'Deleting...' : 'Confirm Delete'}
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
      />

      {/* Breadcrumb / Top Bar */}
      <div className="details-top-bar">
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => navigate('/vehicles')}
        >
          ← Back to Fleet
        </button>

        <div className="top-bar-actions">
          <Link to={`/vehicles/edit/${vehicle.id}`} className="btn btn-secondary btn-sm">
            ✏️ Edit Vehicle
          </Link>
          <button
            type="button"
            className="btn btn-danger-outline btn-sm"
            onClick={promptDelete}
          >
            🗑️ Delete
          </button>
          <button
            type="button"
            className={`btn btn-sm ${isAvailable ? 'btn-primary' : 'btn-disabled opacity-50'}`}
            disabled={!isAvailable}
            onClick={() => navigate(`/rentals/add?vehicleId=${vehicle.id}`)}
            title={isAvailable ? 'Book this vehicle now' : `Vehicle is currently ${dynamicStatus}`}
          >
            {isAvailable ? '⚡ Book Now' : `🔒 ${dynamicStatus}`}
          </button>
        </div>
      </div>

      {/* Main Vehicle Showcase */}
      <div className="vehicle-details-grid">
        {/* Left Column: Image and Badges */}
        <div className="vehicle-details-media">
          <div className="media-card">
            <img
              src={vehicle.image || 'https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&w=800&q=80'}
              alt={vehicle.name}
              className="details-main-img"
              onError={(e) => {
                e.target.src = 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80';
              }}
            />
            <div className="details-media-overlay">
              <span className={`status-badge ${getStatusBadgeClass(dynamicStatus)}`}>
                {dynamicStatus}
              </span>
              <span className="type-badge">{vehicle.type}</span>
            </div>
          </div>

          <div className="rate-card">
            <div className="rate-info">
              <span className="rate-label">Daily Rental Rate</span>
              <h2 className="rate-value">{formatCurrency(vehicle.pricePerDay)} <span className="rate-sub">/ day</span></h2>
            </div>
            {isAvailable ? (
              <span className="availability-tag available-tag">● Ready for immediate booking</span>
            ) : (
              <span className="availability-tag busy-tag">● Currently {dynamicStatus}</span>
            )}
            <button
              type="button"
              className={`btn w-100 mt-3 ${isAvailable ? 'btn-primary' : 'btn-disabled opacity-50'}`}
              disabled={!isAvailable}
              onClick={() => navigate(`/rentals/add?vehicleId=${vehicle.id}`)}
            >
              {isAvailable ? '⚡ Book Now — Proceed to Reservation' : `Unavailable (${dynamicStatus})`}
            </button>
          </div>
        </div>

        {/* Right Column: Specifications & Description */}
        <div className="vehicle-details-info">
          <div className="details-header-card">
            <span className="brand-tag">{vehicle.brand}</span>
            <h1 className="vehicle-title">{vehicle.name}</h1>
            <p className="reg-badge">Reg: {vehicle.registrationNumber}</p>
          </div>

          {vehicle.description && (
            <div className="desc-card">
              <h3 className="section-title">About this Vehicle</h3>
              <p className="desc-text">{vehicle.description}</p>
            </div>
          )}

          <div className="specs-card">
            <h3 className="section-title">Technical Specifications</h3>
            <div className="specs-table-grid">
              <div className="spec-row">
                <span className="spec-name">Model Year</span>
                <span className="spec-val">{vehicle.model}</span>
              </div>
              <div className="spec-row">
                <span className="spec-name">Vehicle Type</span>
                <span className="spec-val">{vehicle.type}</span>
              </div>
              <div className="spec-row">
                <span className="spec-name">Fuel Type</span>
                <span className="spec-val">{vehicle.fuelType}</span>
              </div>
              <div className="spec-row">
                <span className="spec-name">Transmission</span>
                <span className="spec-val">{vehicle.transmission}</span>
              </div>
              <div className="spec-row">
                <span className="spec-name">Seating Capacity</span>
                <span className="spec-val">{vehicle.seats} Passengers</span>
              </div>
              <div className="spec-row">
                <span className="spec-name">Current Status</span>
                <span className="spec-val font-semibold">{vehicle.status}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Booking History for this vehicle */}
      <div className="vehicle-history-card">
        <h3 className="section-title">Rental Booking History ({vehicleRentals.length})</h3>
        {vehicleRentals.length === 0 ? (
          <p className="no-history-text">No rental transactions recorded for this vehicle yet.</p>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Customer</th>
                  <th>Rental Period</th>
                  <th>Duration</th>
                  <th>Total Billed</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {vehicleRentals.map((rental) => (
                  <tr key={rental.id}>
                    <td>
                      <Link to={`/rentals/${rental.id}`} className="font-mono text-accent">
                        #{rental.id}
                      </Link>
                    </td>
                    <td>{getCustomerName(rental.customerId)}</td>
                    <td>
                      {formatDate(rental.startDate)} → {formatDate(rental.endDate)}
                    </td>
                    <td>{rental.numberOfDays} Days</td>
                    <td>{formatCurrency(rental.totalAmount)}</td>
                    <td>
                      <span className={`status-badge badge-${rental.status?.toLowerCase()}`}>
                        {rental.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default VehicleDetails;
