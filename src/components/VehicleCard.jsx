import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatCurrency, getVehicleDynamicStatus } from '../utils/rentalUtils';

function VehicleCard({ vehicle, rentals = [], onDelete }) {
  const navigate = useNavigate();

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

  const dynamicStatus = getVehicleDynamicStatus(vehicle, rentals);
  const isAvailable = dynamicStatus === 'Available';
  const isMaintenance = vehicle.status === 'Maintenance';

  const handleRentNow = () => {
    if (!isMaintenance && isAvailable) {
      navigate(`/rentals/add?vehicleId=${vehicle.id}`);
    }
  };

  // Default fallback image if invalid
  const handleImageError = (e) => {
    e.target.src = 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80';
  };

  return (
    <div className="vehicle-card">
      <div className="vehicle-card-image-wrapper">
        <img
          src={vehicle.image || 'https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&w=800&q=80'}
          alt={vehicle.name}
          className="vehicle-card-img"
          onError={handleImageError}
          loading="lazy"
        />
        <div className="vehicle-card-badges">
          <span className={`status-badge ${getStatusBadgeClass(dynamicStatus)}`}>
            {dynamicStatus}
          </span>
          <span className="type-badge">{vehicle.type}</span>
        </div>
      </div>

      <div className="vehicle-card-body">
        <div className="vehicle-card-header">
          <div>
            <span className="vehicle-brand">{vehicle.brand}</span>
            <h3 className="vehicle-name">{vehicle.name}</h3>
          </div>
          <div className="vehicle-price-tag">
            <span className="price-amount">{formatCurrency(vehicle.pricePerDay)}</span>
            <span className="price-period">/day</span>
          </div>
        </div>

        <div className="vehicle-specs-grid">
          <div className="spec-item">
            <span className="spec-icon">⛽</span>
            <span className="spec-text">{vehicle.fuelType}</span>
          </div>
          <div className="spec-item">
            <span className="spec-icon">⚙️</span>
            <span className="spec-text">{vehicle.transmission}</span>
          </div>
          <div className="spec-item">
            <span className="spec-icon">💺</span>
            <span className="spec-text">{vehicle.seats} Seats</span>
          </div>
          <div className="spec-item">
            <span className="spec-icon">🔢</span>
            <span className="spec-text">{vehicle.registrationNumber}</span>
          </div>
        </div>

        {vehicle.description && (
          <p className="vehicle-card-desc">{vehicle.description}</p>
        )}

        <div className="vehicle-card-actions">
          <Link
            to={`/vehicles/${vehicle.id}`}
            className="btn btn-outline btn-sm"
            title="View full vehicle details and specifications"
          >
            View Details
          </Link>
          <Link
            to={`/vehicles/edit/${vehicle.id}`}
            className="btn btn-secondary btn-sm"
            title="Edit vehicle details"
          >
            Edit
          </Link>
          <button
            type="button"
            className="btn btn-danger-outline btn-sm"
            onClick={() => onDelete(vehicle)}
            title="Delete Vehicle"
          >
            Delete
          </button>
          <button
            type="button"
            className={`btn btn-sm ${isAvailable ? 'btn-primary' : 'btn-disabled opacity-50'}`}
            disabled={!isAvailable}
            onClick={handleRentNow}
            title={
              isAvailable
                ? `Book ${vehicle.name} now`
                : `Booking disabled: Vehicle is currently ${dynamicStatus}`
            }
          >
            {isAvailable ? '⚡ Book Now' : `🔒 ${dynamicStatus}`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default VehicleCard;
