import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  getRentalById,
  getVehicleById,
  getCustomerById,
  deleteRental,
  getRentals,
  updateVehicle,
} from '../services/api';
import { formatCurrency, formatDate } from '../utils/rentalUtils';
import Loading from '../components/Loading';
import ConfirmModal from '../components/ConfirmModal';
import Toast from '../components/Toast';

function RentalDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [rental, setRental] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  useEffect(() => {
    const loadRentalDetails = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const rentalData = await getRentalById(id);
        if (!rentalData) {
          setError(`Rental booking #${id} not found.`);
          setIsLoading(false);
          return;
        }

        setRental(rentalData);

        // Fetch corresponding vehicle and customer
        const [vehicleData, customerData] = await Promise.all([
          rentalData.vehicleId ? getVehicleById(rentalData.vehicleId).catch(() => null) : null,
          rentalData.customerId ? getCustomerById(rentalData.customerId).catch(() => null) : null,
        ]);

        setVehicle(vehicleData);
        setCustomer(customerData);
      } catch (err) {
        console.error('Error fetching rental details:', err);
        setError('Failed to fetch rental record from API.');
      } finally {
        setIsLoading(false);
      }
    };

    loadRentalDetails();
  }, [id]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteRental(id);

      // If the deleted rental was associated with a vehicle, ensure vehicle status is restored if no other active rentals
      if (rental?.vehicleId) {
        try {
          const allRentals = await getRentals();
          const remainingActive = (allRentals || []).filter(
            (r) =>
              String(r.id) !== String(id) &&
              String(r.vehicleId) === String(rental.vehicleId) &&
              r.status === 'Active'
          );
          if (remainingActive.length === 0 && vehicle && vehicle.status === 'Rented') {
            await updateVehicle(vehicle.id, {
              ...vehicle,
              status: 'Available',
            });
          }
        } catch (syncErr) {
          console.warn('Could not sync vehicle status after rental deletion:', syncErr);
        }
      }

      setToast({
        message: `Rental #${id} deleted successfully. Vehicle availability has been updated.`,
        type: 'success',
      });
      setTimeout(() => {
        navigate('/rentals');
      }, 800);
    } catch (err) {
      console.error('Error deleting rental:', err);
      setToast({
        message: 'Could not delete rental. Please check API server.',
        type: 'error',
      });
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  if (isLoading) {
    return <Loading message="Loading rental invoice & transaction details..." size="large" />;
  }

  if (error || !rental) {
    return (
      <div className="error-card">
        <span className="error-icon">⚠️</span>
        <h3>Rental Record Not Found</h3>
        <p>{error || 'The requested rental does not exist in the database.'}</p>
        <button type="button" className="btn btn-secondary" onClick={() => navigate('/rentals')}>
          Back to Rentals
        </button>
      </div>
    );
  }

  return (
    <div className="rental-details-page">
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'success' })}
      />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        title="Delete Rental Record"
        message={`Are you sure you want to delete rental booking #${rental.id}? This will release the vehicle dates.`}
        confirmText={isDeleting ? 'Deleting...' : 'Confirm Delete'}
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
      />

      {/* Top Bar Navigation */}
      <div className="details-top-bar">
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => navigate('/rentals')}
        >
          ← Back to Rentals
        </button>

        <div className="top-bar-actions">
          <button
            type="button"
            className="btn btn-primary btn-sm no-print"
            onClick={() => window.print()}
            title="Print or export as PDF invoice"
          >
            🖨️ Print / Save PDF Invoice
          </button>
          <Link to={`/rentals/edit/${rental.id}`} className="btn btn-secondary btn-sm no-print">
            ✏️ Edit Booking
          </Link>
          <button
            type="button"
            className="btn btn-danger-outline btn-sm no-print"
            onClick={() => setIsDeleteModalOpen(true)}
          >
            🗑️ Delete
          </button>
        </div>
      </div>

      {/* Main Invoice Card */}
      <div className="invoice-container">
        {/* Invoice Header */}
        <div className="invoice-header">
          <div>
            <span className="invoice-badge">RENTAL INVOICE</span>
            <h1 className="invoice-id">Booking #{rental.id}</h1>
            <p className="invoice-created">Created Date: {formatDate(rental.createdAt)}</p>
          </div>
          <div className="invoice-status-block">
            <span className={`status-badge badge-${rental.status?.toLowerCase()} status-large`}>
              {rental.status}
            </span>
          </div>
        </div>

        {/* Customer & Vehicle Info Two-Column Grid */}
        <div className="invoice-parties-grid">
          {/* Customer Card */}
          <div className="party-card">
            <h3 className="party-card-title">👤 Customer Information</h3>
            {customer ? (
              <div className="party-details">
                <p className="party-name">{customer.name}</p>
                <div className="party-info-row">
                  <span className="party-label">Email:</span>
                  <span className="party-value">{customer.email}</span>
                </div>
                <div className="party-info-row">
                  <span className="party-label">Phone:</span>
                  <span className="party-value">{customer.phone}</span>
                </div>
                <div className="party-info-row">
                  <span className="party-label">License No:</span>
                  <span className="party-value license-text">{customer.licenseNumber}</span>
                </div>
                <div className="party-info-row">
                  <span className="party-label">Address:</span>
                  <span className="party-value">{customer.address}</span>
                </div>
              </div>
            ) : (
              <p className="text-muted">Customer details not available (ID: #{rental.customerId})</p>
            )}
          </div>

          {/* Vehicle Card */}
          <div className="party-card">
            <h3 className="party-card-title">🚗 Vehicle Information</h3>
            {vehicle ? (
              <div className="party-details">
                <p className="party-name">{vehicle.brand} {vehicle.name}</p>
                <div className="party-info-row">
                  <span className="party-label">Reg Number:</span>
                  <span className="party-value reg-text">{vehicle.registrationNumber}</span>
                </div>
                <div className="party-info-row">
                  <span className="party-label">Type / Model:</span>
                  <span className="party-value">{vehicle.type} ({vehicle.model})</span>
                </div>
                <div className="party-info-row">
                  <span className="party-label">Fuel & Transmission:</span>
                  <span className="party-value">{vehicle.fuelType} • {vehicle.transmission}</span>
                </div>
                <div className="party-info-row">
                  <span className="party-label">Capacity:</span>
                  <span className="party-value">{vehicle.seats} Seats</span>
                </div>
              </div>
            ) : (
              <p className="text-muted">Vehicle details not available (ID: #{rental.vehicleId})</p>
            )}
          </div>
        </div>

        {/* Rental Period Summary Banner */}
        <div className="rental-period-banner">
          <div className="period-box">
            <span className="period-label">PICKUP DATE</span>
            <span className="period-date">{formatDate(rental.startDate)}</span>
          </div>
          <div className="period-duration">
            <span className="duration-arrow">➔</span>
            <span className="duration-pill">{rental.numberOfDays} {rental.numberOfDays === 1 ? 'Day' : 'Days'} Total</span>
          </div>
          <div className="period-box">
            <span className="period-label">RETURN DATE</span>
            <span className="period-date">{formatDate(rental.endDate)}</span>
          </div>
        </div>

        {/* Financial Billing Calculation Table */}
        <div className="billing-table-wrapper">
          <table className="billing-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Rate / Day</th>
                <th>Duration</th>
                <th className="text-right">Line Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>Vehicle Rental Fee</strong>
                  <p className="text-muted text-xs">
                    {vehicle ? `${vehicle.brand} ${vehicle.name}` : `Vehicle #${rental.vehicleId}`} ({formatDate(rental.startDate)} to {formatDate(rental.endDate)})
                  </p>
                </td>
                <td>{formatCurrency(rental.pricePerDay)}</td>
                <td>{rental.numberOfDays} {rental.numberOfDays === 1 ? 'day' : 'days'}</td>
                <td className="text-right font-semibold">{formatCurrency(rental.totalAmount)}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="3" className="text-right font-bold">Total Rental Amount:</td>
                <td className="text-right font-bold text-accent total-highlight">
                  {formatCurrency(rental.totalAmount)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Formula Explainer Box */}
        <div className="billing-formula-note">
          <span>Formula Applied: <strong>{rental.numberOfDays} days × {formatCurrency(rental.pricePerDay)}/day = {formatCurrency(rental.totalAmount)}</strong></span>
        </div>
      </div>
    </div>
  );
}

export default RentalDetails;
