import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { validateCustomer } from '../utils/validation';

const buildCustomerFormData = (data) => ({
  name: data?.name || '',
  email: data?.email || '',
  phone: data?.phone || '',
  licenseNumber: data?.licenseNumber || '',
  address: data?.address || '',
});

function CustomerForm({
  initialData = null,
  onSubmit,
  isLoading = false,
  isEdit = false,
  existingCustomers = [],
  currentId = null,
}) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(() => buildCustomerFormData(initialData));
  const [prevInitialData, setPrevInitialData] = useState(initialData);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Sync state during render when switching records without triggering cascading effect renders
  if (initialData !== prevInitialData) {
    setPrevInitialData(initialData);
    setFormData(buildCustomerFormData(initialData));
    setErrors({});
    setTouched({});
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
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
    const { isValid, errors: validationErrors } = validateCustomer(
      formData,
      existingCustomers,
      currentId
    );

    if (!isValid) {
      setErrors(validationErrors);
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
      email: formData.email.trim().toLowerCase(),
      phone: formData.phone.trim().replace(/\D/g, ''),
      licenseNumber: formData.licenseNumber.trim().toUpperCase(),
      address: formData.address.trim(),
      createdAt: initialData?.createdAt || new Date().toISOString().split('T')[0],
    };

    onSubmit(payload);
  };

  return (
    <form className="form-card" onSubmit={handleSubmit} noValidate>
      <div className="form-grid">
        {/* Full Name */}
        <div className="form-group full-width">
          <label className="form-label" htmlFor="name">
            Customer Full Name <span className="required-star">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            className={`form-input ${touched.name && errors.name ? 'input-error' : ''}`}
            placeholder="e.g. Rahul Kumar"
            value={formData.name}
            onChange={handleChange}
            onBlur={() => handleBlur('name')}
            disabled={isLoading}
          />
          {touched.name && errors.name && (
            <span className="field-error">{errors.name}</span>
          )}
        </div>

        {/* Email Address */}
        <div className="form-group">
          <label className="form-label" htmlFor="email">
            Email Address <span className="required-star">*</span>
          </label>
          <input
            type="email"
            id="email"
            name="email"
            className={`form-input ${touched.email && errors.email ? 'input-error' : ''}`}
            placeholder="e.g. rahul@example.com"
            value={formData.email}
            onChange={handleChange}
            onBlur={() => handleBlur('email')}
            disabled={isLoading}
          />
          {touched.email && errors.email && (
            <span className="field-error">{errors.email}</span>
          )}
        </div>

        {/* Phone Number */}
        <div className="form-group">
          <label className="form-label" htmlFor="phone">
            10-Digit Mobile Phone <span className="required-star">*</span>
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            maxLength={10}
            className={`form-input ${touched.phone && errors.phone ? 'input-error' : ''}`}
            placeholder="e.g. 9876543210"
            value={formData.phone}
            onChange={handleChange}
            onBlur={() => handleBlur('phone')}
            disabled={isLoading}
          />
          {touched.phone && errors.phone && (
            <span className="field-error">{errors.phone}</span>
          )}
        </div>

        {/* Driving License Number */}
        <div className="form-group">
          <label className="form-label" htmlFor="licenseNumber">
            Driving License Number <span className="required-star">*</span>
          </label>
          <input
            type="text"
            id="licenseNumber"
            name="licenseNumber"
            className={`form-input uppercase-input ${
              touched.licenseNumber && errors.licenseNumber ? 'input-error' : ''
            }`}
            placeholder="e.g. DL1420110012345"
            value={formData.licenseNumber}
            onChange={handleChange}
            onBlur={() => handleBlur('licenseNumber')}
            disabled={isLoading}
          />
          {touched.licenseNumber && errors.licenseNumber && (
            <span className="field-error">{errors.licenseNumber}</span>
          )}
        </div>

        {/* Complete Address */}
        <div className="form-group full-width">
          <label className="form-label" htmlFor="address">
            Residential / Office Address <span className="required-star">*</span>
          </label>
          <textarea
            id="address"
            name="address"
            rows="3"
            className={`form-textarea ${touched.address && errors.address ? 'input-error' : ''}`}
            placeholder="e.g. 4-12/1 Main Road, Bhimavaram, AP"
            value={formData.address}
            onChange={handleChange}
            onBlur={() => handleBlur('address')}
            disabled={isLoading}
          />
          {touched.address && errors.address && (
            <span className="field-error">{errors.address}</span>
          )}
        </div>
      </div>

      <div className="form-actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => navigate('/customers')}
          disabled={isLoading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isLoading}
        >
          {isLoading ? 'Saving...' : isEdit ? 'Update Customer' : 'Add Customer'}
        </button>
      </div>
    </form>
  );
}

export default CustomerForm;
