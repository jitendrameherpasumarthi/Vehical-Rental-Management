/**
 * Utility functions for Vehicle Rental calculations, formatting, and availability checks.
 */

// Format currency in Indian Rupee format (INR)
export const formatCurrency = (amount) => {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
};

// Format ISO/Date string into readable format (e.g., "01 Oct 2026")
export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    }
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
};

// Calculate inclusive days between startDate and endDate
// Example: 2026-10-01 to 2026-10-03 = 3 days
export const calculateDays = (startDate, endDate) => {
  if (!startDate || !endDate) return 0;
  
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');

  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  if (end < start) return 0;

  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;

  return Math.max(1, diffDays);
};

// Calculate total rental amount = Number of Days × Price Per Day
export const calculateTotalAmount = (days, pricePerDay) => {
  const d = Number(days) || 0;
  const p = Number(pricePerDay) || 0;
  return d * p;
};

// Get today's date formatted as YYYY-MM-DD
export const getTodayDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Check if a requested rental dates overlap with existing rentals for the same vehicle.
 * Formula: requestedStart <= existingEnd AND requestedEnd >= existingStart
 * Ignores 'Cancelled' rentals.
 */
export const checkBookingOverlap = (
  existingRentals = [],
  vehicleId,
  startDate,
  endDate,
  excludeRentalId = null
) => {
  if (!vehicleId || !startDate || !endDate || !Array.isArray(existingRentals)) {
    return null;
  }

  const reqStart = startDate;
  const reqEnd = endDate;

  for (const rental of existingRentals) {
    // Exclude the rental being edited
    if (excludeRentalId && String(rental.id) === String(excludeRentalId)) {
      continue;
    }

    // Must match the vehicle
    if (String(rental.vehicleId) !== String(vehicleId)) {
      continue;
    }

    // Ignore Cancelled rentals
    if (rental.status && rental.status.toLowerCase() === 'cancelled') {
      continue;
    }

    const exStart = rental.startDate;
    const exEnd = rental.endDate;

    if (!exStart || !exEnd) continue;

    // Overlap condition: requestedStart <= existingEnd && requestedEnd >= existingStart
    if (reqStart <= exEnd && reqEnd >= exStart) {
      return rental; // Returns the conflicting rental object
    }
  }

  return null;
};

/**
 * Check if a vehicle is available for a given date range.
 * If no dates are passed, checks availability against today's date.
 */
export const isVehicleAvailableForDates = (
  vehicle,
  existingRentals = [],
  startDate = null,
  endDate = null,
  excludeRentalId = null
) => {
  if (!vehicle) return false;
  if (vehicle.status === 'Maintenance') return false;

  const today = getTodayDateString();
  const checkStart = startDate || today;
  const checkEnd = endDate || today;

  const conflict = checkBookingOverlap(
    existingRentals,
    vehicle.id,
    checkStart,
    checkEnd,
    excludeRentalId
  );

  return conflict === null;
};

/**
 * Determine dynamic vehicle operational status based on active rental contracts.
 * Completed past rentals do not permanently lock vehicles into 'Rented' state.
 */
export const getVehicleDynamicStatus = (vehicle, existingRentals = [], date = null) => {
  if (!vehicle) return 'Unknown';
  if (vehicle.status === 'Maintenance') return 'Maintenance';

  const checkDate = date || getTodayDateString();
  const isAvailable = isVehicleAvailableForDates(vehicle, existingRentals, checkDate, checkDate);
  return isAvailable ? 'Available' : 'Rented';
};

/**
 * Dynamic rental status calculation based on current date
 */
export const getDynamicRentalStatus = (rental) => {
  if (!rental) return 'Unknown';
  if (rental.status === 'Cancelled') return 'Cancelled';

  const today = getTodayDateString();
  const { startDate, endDate } = rental;

  if (!startDate || !endDate) return rental.status || 'Active';

  if (today < startDate) {
    return 'Upcoming';
  } else if (today >= startDate && today <= endDate) {
    return 'Active';
  } else {
    return 'Completed';
  }
};
