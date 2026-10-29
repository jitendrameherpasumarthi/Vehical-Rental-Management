import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { validateVehicle } from '../utils/validation';

const buildVehicleFormData = (data) => ({
  name: data?.name || '',
  brand: data?.brand || '',
  type: data?.type || 'Car',
  model: data?.model || new Date().getFullYear().toString(),
  registrationNumber: data?.registrationNumber || '',
  pricePerDay: data?.pricePerDay !== undefined ? data?.pricePerDay : '',
  fuelType: data?.fuelType || 'Petrol',
  seats: data?.seats !== undefined ? data?.seats : 5,
  transmission: data?.transmission || 'Automatic',
  status: data?.status || 'Available',
  image: data?.image || '',
  description: data?.description || '',
});

function VehicleForm({
  initialData = null,
  onSubmit,
  isLoading = false,
  isEdit = false,
  existingVehicles = [],
  currentId = null,
}) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(() => buildVehicleFormData(initialData));
  const [prevInitialData, setPrevInitialData] = useState(initialData);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Sync state during render when switching records without triggering cascading effect renders
  if (initialData !== prevInitialData) {
    setPrevInitialData(initialData);
    setFormData(buildVehicleFormData(initialData));
    setErrors({});
    setTouched({});
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'pricePerDay' || name === 'seats'
        ? value === '' ? '' : Number(value)
        : value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const { isValid, errors: validationErrors } = validateVehicle(
      formData,
      existingVehicles,
      currentId
    );

    if (!isValid) {
      setErrors(validationErrors);
      // Mark all error fields as touched
      const allTouched = Object.keys(validationErrors).reduce((acc, key) => {
        acc[key] = true;
        return acc;
      }, {});
      setTouched((prev) => ({ ...prev, ...allTouched }));
      return;
    }

    const payload = {
      ...formData,
      name: formData.name.trim(),
      brand: formData.brand.trim(),
      registrationNumber: formData.registrationNumber.trim().toUpperCase(),
      pricePerDay: Number(formData.pricePerDay),
      seats: Number(formData.seats),
      image: formData.image.trim() || 'https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&w=800&q=80',
    };

    onSubmit(payload);
  };

  return (
    <form className="form-card" onSubmit={handleSubmit} noValidate>
      <div className="form-grid">
        {/* Vehicle Name */}
        <div className="form-group">
          <label className="form-label" htmlFor="name">
            Vehicle Name <span className="required-star">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            className={`form-input ${touched.name && errors.name ? 'input-error' : ''}`}
            placeholder="e.g. Honda City"
            value={formData.name}
            onChange={handleChange}
            onBlur={() => handleBlur('name')}
            disabled={isLoading}
          />
          {touched.name && errors.name && (
            <span className="field-error">{errors.name}</span>
          )}
        </div>

        {/* Brand */}
        <div className="form-group">
          <label className="form-label" htmlFor="brand">
            Brand / Manufacturer <span className="required-star">*</span>
          </label>
          <input
            type="text"
            id="brand"
            name="brand"
            className={`form-input ${touched.brand && errors.brand ? 'input-error' : ''}`}
            placeholder="e.g. Honda, Toyota, BMW"
            value={formData.brand}
            onChange={handleChange}
            onBlur={() => handleBlur('brand')}
            disabled={isLoading}
          />
          {touched.brand && errors.brand && (
            <span className="field-error">{errors.brand}</span>
          )}
        </div>

        {/* Vehicle Type */}
        <div className="form-group">
          <label className="form-label" htmlFor="type">
            Vehicle Type <span className="required-star">*</span>
          </label>
          <select
            id="type"
            name="type"
            className="form-select"
            value={formData.type}
            onChange={handleChange}
            disabled={isLoading}
          >
            <option value="Car">Car</option>
            <option value="SUV">SUV</option>
            <option value="Motorcycle">Motorcycle</option>
            <option value="Luxury">Luxury</option>
            <option value="Van">Van / MPV</option>
            <option value="Truck">Truck</option>
          </select>
        </div>

        {/* Model Year */}
        <div className="form-group">
          <label className="form-label" htmlFor="model">
            Model / Year <span className="required-star">*</span>
          </label>
          <input
            type="text"
            id="model"
            name="model"
            className={`form-input ${touched.model && errors.model ? 'input-error' : ''}`}
            placeholder="e.g. 2024"
            value={formData.model}
            onChange={handleChange}
            onBlur={() => handleBlur('model')}
            disabled={isLoading}
          />
          {touched.model && errors.model && (
            <span className="field-error">{errors.model}</span>
          )}
        </div>

        {/* Registration Number */}
        <div className="form-group">
          <label className="form-label" htmlFor="registrationNumber">
            Registration Number <span className="required-star">*</span>
          </label>
          <input
            type="text"
            id="registrationNumber"
            name="registrationNumber"
            className={`form-input uppercase-input ${
              touched.registrationNumber && errors.registrationNumber ? 'input-error' : ''
            }`}
            placeholder="e.g. AP01AB1234"
            value={formData.registrationNumber}
            onChange={handleChange}
            onBlur={() => handleBlur('registrationNumber')}
            disabled={isLoading}
          />
          {touched.registrationNumber && errors.registrationNumber && (
            <span className="field-error">{errors.registrationNumber}</span>
          )}
        </div>

        {/* Price Per Day */}
        <div className="form-group">
          <label className="form-label" htmlFor="pricePerDay">
            Price Per Day (₹) <span className="required-star">*</span>
          </label>
          <input
            type="number"
            id="pricePerDay"
            name="pricePerDay"
            min="1"
            step="50"
            className={`form-input ${touched.pricePerDay && errors.pricePerDay ? 'input-error' : ''}`}
            placeholder="e.g. 2500"
            value={formData.pricePerDay}
            onChange={handleChange}
            onBlur={() => handleBlur('pricePerDay')}
            disabled={isLoading}
          />
          {touched.pricePerDay && errors.pricePerDay && (
            <span className="field-error">{errors.pricePerDay}</span>
          )}
        </div>

        {/* Fuel Type */}
        <div className="form-group">
          <label className="form-label" htmlFor="fuelType">
            Fuel Type <span className="required-star">*</span>
          </label>
          <select
            id="fuelType"
            name="fuelType"
            className="form-select"
            value={formData.fuelType}
            onChange={handleChange}
            disabled={isLoading}
          >
            <option value="Petrol">Petrol</option>
            <option value="Diesel">Diesel</option>
            <option value="Electric">Electric</option>
            <option value="Hybrid">Hybrid</option>
            <option value="CNG">CNG</option>
          </select>
        </div>

        {/* Seats */}
        <div className="form-group">
          <label className="form-label" htmlFor="seats">
            Seating Capacity <span className="required-star">*</span>
          </label>
          <input
            type="number"
            id="seats"
            name="seats"
            min="1"
            max="60"
            className={`form-input ${touched.seats && errors.seats ? 'input-error' : ''}`}
            placeholder="e.g. 5"
            value={formData.seats}
            onChange={handleChange}
            onBlur={() => handleBlur('seats')}
            disabled={isLoading}
          />
          {touched.seats && errors.seats && (
            <span className="field-error">{errors.seats}</span>
          )}
        </div>

        {/* Transmission */}
        <div className="form-group">
          <label className="form-label" htmlFor="transmission">
            Transmission <span className="required-star">*</span>
          </label>
          <select
            id="transmission"
            name="transmission"
            className="form-select"
            value={formData.transmission}
            onChange={handleChange}
            disabled={isLoading}
          >
            <option value="Automatic">Automatic</option>
            <option value="Manual">Manual</option>
          </select>
        </div>

        {/* Status */}
        <div className="form-group">
          <label className="form-label" htmlFor="status">
            Operational Status <span className="required-star">*</span>
          </label>
          <select
            id="status"
            name="status"
            className="form-select"
            value={formData.status}
            onChange={handleChange}
            disabled={isLoading}
          >
            <option value="Available">Available</option>
            <option value="Rented">Rented</option>
            <option value="Maintenance">Maintenance</option>
          </select>
        </div>

        {/* Image URL */}
        <div className="form-group full-width">
          <label className="form-label" htmlFor="image">
            Vehicle Image URL
          </label>
          <input
            type="url"
            id="image"
            name="image"
            className="form-input"
            placeholder="https://example.com/car.jpg or leave blank for default photo"
            value={formData.image}
            onChange={handleChange}
            disabled={isLoading}
          />
          <span className="field-hint">Paste a web image URL or leave empty for an automatic placeholder.</span>
        </div>

        {/* Description */}
        <div className="form-group full-width">
          <label className="form-label" htmlFor="description">
            Description / Features
          </label>
          <textarea
            id="description"
            name="description"
            rows="3"
            className="form-textarea"
            placeholder="Add vehicle highlights, condition notes, or rental terms..."
            value={formData.description}
            onChange={handleChange}
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="form-actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => navigate('/vehicles')}
          disabled={isLoading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isLoading}
        >
          {isLoading ? 'Saving...' : isEdit ? 'Update Vehicle' : 'Add Vehicle'}
        </button>
      </div>
    </form>
  );
}

export default VehicleForm;
