import { calculateDays, checkBookingOverlap, getTodayDateString } from './rentalUtils';

/**
 * Validate Vehicle Form Data
 */
export const validateVehicle = (formData, existingVehicles = [], currentId = null) => {
  const errors = {};

  if (!formData.name || !formData.name.trim()) {
    errors.name = 'Vehicle name is required.';
  }

  if (!formData.brand || !formData.brand.trim()) {
    errors.brand = 'Brand is required.';
  }

  if (!formData.type) {
    errors.type = 'Vehicle type is required.';
  }

  if (!formData.model || !formData.model.trim()) {
    errors.model = 'Model/Year is required.';
  } else {
    const year = parseInt(formData.model, 10);
    const currentYear = new Date().getFullYear() + 2;
    if (isNaN(year) || year < 1990 || year > currentYear) {
      errors.model = `Please enter a valid model year (e.g. 2024).`;
    }
  }

  if (!formData.registrationNumber || !formData.registrationNumber.trim()) {
    errors.registrationNumber = 'Registration number is required.';
  } else {
    const regClean = formData.registrationNumber.trim().toUpperCase();
    const isDuplicate = existingVehicles.some(
      (v) =>
        String(v.id) !== String(currentId) &&
        v.registrationNumber &&
        v.registrationNumber.trim().toUpperCase() === regClean
    );
    if (isDuplicate) {
      errors.registrationNumber = 'A vehicle with this registration number already exists.';
    }
  }

  if (formData.pricePerDay === '' || formData.pricePerDay === undefined || formData.pricePerDay === null) {
    errors.pricePerDay = 'Price per day is required.';
  } else if (Number(formData.pricePerDay) <= 0) {
    errors.pricePerDay = 'Price per day must be greater than ₹0.';
  }

  if (formData.seats === '' || formData.seats === undefined || formData.seats === null) {
    errors.seats = 'Number of seats is required.';
  } else if (Number(formData.seats) <= 0) {
    errors.seats = 'Seats must be a positive number (at least 1).';
  }

  if (!formData.fuelType) {
    errors.fuelType = 'Fuel type is required.';
  }

  if (!formData.transmission) {
    errors.transmission = 'Transmission is required.';
  }

  if (!formData.status) {
    errors.status = 'Status is required.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validate Customer Form Data
 */
export const validateCustomer = (formData, existingCustomers = [], currentId = null) => {
  const errors = {};

  if (!formData.name || !formData.name.trim()) {
    errors.name = 'Customer name is required.';
  } else if (formData.name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters long.';
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!formData.email || !formData.email.trim()) {
    errors.email = 'Email address is required.';
  } else if (!emailRegex.test(formData.email.trim())) {
    errors.email = 'Please enter a valid email address (e.g. name@example.com).';
  } else {
    const emailClean = formData.email.trim().toLowerCase();
    const isDuplicateEmail = existingCustomers.some(
      (c) =>
        String(c.id) !== String(currentId) &&
        c.email &&
        c.email.trim().toLowerCase() === emailClean
    );
    if (isDuplicateEmail) {
      errors.email = 'A customer with this email address already exists.';
    }
  }

  const phoneRegex = /^[0-9]{10}$/;
  const phoneClean = (formData.phone || '').replace(/\D/g, '');
  if (!formData.phone || !formData.phone.trim()) {
    errors.phone = 'Phone number is required.';
  } else if (!phoneRegex.test(phoneClean)) {
    errors.phone = 'Phone number must be exactly 10 digits.';
  }

  if (!formData.licenseNumber || !formData.licenseNumber.trim()) {
    errors.licenseNumber = 'Driving License number is required.';
  } else {
    const licClean = formData.licenseNumber.trim().toUpperCase();
    const isDuplicateLic = existingCustomers.some(
      (c) =>
        String(c.id) !== String(currentId) &&
        c.licenseNumber &&
        c.licenseNumber.trim().toUpperCase() === licClean
    );
    if (isDuplicateLic) {
      errors.licenseNumber = 'A customer with this License number already exists.';
    }
  }

  if (!formData.address || !formData.address.trim()) {
    errors.address = 'Address is required.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validate Rental Form Data & Prevent Double Booking
 */
export const validateRental = (
  formData,
  existingRentals = [],
  currentId = null,
  isEdit = false
) => {
  const errors = {};
  let conflict = null;

  if (!formData.customerId) {
    errors.customerId = 'Please select a customer.';
  }

  if (!formData.vehicleId) {
    errors.vehicleId = 'Please select a vehicle.';
  }

  const today = getTodayDateString();

  if (!formData.startDate) {
    errors.startDate = 'Start date is required.';
  } else if (!isEdit && formData.startDate < today) {
    errors.startDate = 'Start date cannot be in the past.';
  }

  if (!formData.endDate) {
    errors.endDate = 'End date is required.';
  } else if (formData.startDate && formData.endDate < formData.startDate) {
    errors.endDate = 'End date cannot be earlier than start date.';
  }

  const days = calculateDays(formData.startDate, formData.endDate);
  if (formData.startDate && formData.endDate && days <= 0) {
    errors.endDate = 'Invalid date range selected.';
  }

  // Prevent Double Booking Check
  if (formData.vehicleId && formData.startDate && formData.endDate && !errors.startDate && !errors.endDate) {
    conflict = checkBookingOverlap(
      existingRentals,
      formData.vehicleId,
      formData.startDate,
      formData.endDate,
      currentId
    );

    if (conflict) {
      errors.general = `This vehicle is already booked from ${conflict.startDate} to ${conflict.endDate}. Please choose different dates or another vehicle.`;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    conflictingRental: conflict,
  };
};
