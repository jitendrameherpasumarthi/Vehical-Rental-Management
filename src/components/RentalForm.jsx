import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  calculateDays,
  calculateTotalAmount,
  formatCurrency,
  checkBookingOverlap,
  getTodayDateString,
  formatDate,
} from '../utils/rentalUtils';
import {
  getRentals,
  addCustomer,
  addRental,
  updateVehicle,
} from '../services/api';

const DEFAULT_CUSTOMER = {
  name: '',
  email: '',
  phone: '',
  licenseNumber: '',
  address: '',
};

// Helper to compute inclusive end date based on duration
const computeEndDateFromDuration = (startDateStr, days) => {
  if (!startDateStr || days <= 0) return '';
  const d = new Date(startDateStr + 'T00:00:00');
  d.setDate(d.getDate() + (days - 1));
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

function RentalForm({
  initialData = null,
  vehicles = [],
  customers = [],
  existingRentals = [],
  onSubmit, // Optional custom submit handler (used by EditRental)
  isLoading = false,
  isEdit = false,
  currentId = null,
  preselectedVehicleId = '',
}) {
  const navigate = useNavigate();
  const today = getTodayDateString();

  // Local state for dynamically registered customers in this session
  const [newRegisteredCustomers, setNewRegisteredCustomers] = useState([]);
  const customerList = useMemo(() => {
    return [...customers, ...newRegisteredCustomers];
  }, [customers, newRegisteredCustomers]);

  // Form State
  const [selectedVehicleId, setSelectedVehicleId] = useState(() => {
    if (initialData?.vehicleId) return String(initialData.vehicleId);
    return preselectedVehicleId ? String(preselectedVehicleId) : '';
  });

  const [startDate, setStartDate] = useState(() => {
    return initialData?.startDate || today;
  });

  const [endDate, setEndDate] = useState(() => {
    return initialData?.endDate || today;
  });

  const [status, setStatus] = useState(() => {
    return initialData?.status || 'Active';
  });

  // Customer Section State
  const [customerMode, setCustomerMode] = useState(() => {
    // If editing and has customer, or initial data exists, can start in existing mode
    if (initialData?.customerId) return 'existing';
    return 'register'; // 'register' (inline registration) or 'existing' (pick from profile)
  });

  const [selectedExistingCustomerId, setSelectedExistingCustomerId] = useState(() => {
    return initialData?.customerId ? String(initialData.customerId) : '';
  });

  const [customerForm, setCustomerForm] = useState(() => {
    if (initialData?.customerId) {
      const match = customers.find((c) => String(c.id) === String(initialData.customerId));
      if (match) {
        return {
          name: match.name || '',
          email: match.email || '',
          phone: match.phone || '',
          licenseNumber: match.licenseNumber || '',
          address: match.address || '',
        };
      }
    }
    return { ...DEFAULT_CUSTOMER };
  });

  // Validation errors & touched fields
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Review & Confirmation Modals
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [confirmedBookingData, setConfirmedBookingData] = useState(null);
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [apiError, setApiError] = useState(null);

  // Vehicle Picker UI controls
  const [showVehiclePicker, setShowVehiclePicker] = useState(!preselectedVehicleId && !initialData?.vehicleId);
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [vehicleCategoryFilter, setVehicleCategoryFilter] = useState('All');

  // Selected vehicle object
  const selectedVehicle = useMemo(() => {
    return vehicles.find((v) => String(v.id) === String(selectedVehicleId)) || null;
  }, [vehicles, selectedVehicleId]);

  // Derived price & calculations
  const pricePerDay = selectedVehicle ? Number(selectedVehicle.pricePerDay) || 0 : 0;
  const numberOfDays = useMemo(() => {
    return calculateDays(startDate, endDate);
  }, [startDate, endDate]);

  const totalAmount = useMemo(() => {
    return calculateTotalAmount(numberOfDays, pricePerDay);
  }, [numberOfDays, pricePerDay]);

  // Real-time double booking conflict check
  const bookingConflict = useMemo(() => {
    if (!selectedVehicleId || !startDate || !endDate) return null;
    return checkBookingOverlap(
      existingRentals,
      selectedVehicleId,
      startDate,
      endDate,
      currentId
    );
  }, [existingRentals, selectedVehicleId, startDate, endDate, currentId]);

  // Lookup customer name for the conflict alert
  const conflictingCustomerName = useMemo(() => {
    if (!bookingConflict) return null;
    const c = customerList.find((item) => String(item.id) === String(bookingConflict.customerId));
    return c ? c.name : `Customer #${bookingConflict.customerId}`;
  }, [bookingConflict, customerList]);

  // Suggested next available date after conflict
  const suggestedNextDate = useMemo(() => {
    if (!bookingConflict || !bookingConflict.endDate) return null;
    try {
      const d = new Date(bookingConflict.endDate + 'T00:00:00');
      d.setDate(d.getDate() + 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    } catch {
      return null;
    }
  }, [bookingConflict]);

  // Customer Identity Conflict Detection
  // If email matches Customer A and licence matches Customer B, prevent silent merge
  const customerIdentityConflict = useMemo(() => {
    if (customerMode === 'existing') return null;
    const emailClean = customerForm.email?.trim().toLowerCase();
    const licClean = customerForm.licenseNumber?.trim().toUpperCase();

    if (!emailClean || !licClean) return null;

    const matchedByEmail = customerList.find(
      (c) => c.email && c.email.trim().toLowerCase() === emailClean
    );
    const matchedByLic = customerList.find(
      (c) => c.licenseNumber && c.licenseNumber.trim().toUpperCase() === licClean
    );

    if (matchedByEmail && matchedByLic && String(matchedByEmail.id) !== String(matchedByLic.id)) {
      return {
        emailCustomer: matchedByEmail,
        licCustomer: matchedByLic,
      };
    }
    return null;
  }, [customerMode, customerList, customerForm.email, customerForm.licenseNumber]);

  // Real-time Customer Recognition / Duplicate Prevention
  // Checks if the entered email or driving licence already exists in customerList
  const matchedExistingCustomer = useMemo(() => {
    if (customerMode === 'existing') {
      return customerList.find((c) => String(c.id) === String(selectedExistingCustomerId)) || null;
    }
    if (customerIdentityConflict) return null;

    const emailClean = customerForm.email?.trim().toLowerCase();
    const licClean = customerForm.licenseNumber?.trim().toUpperCase();

    if (!emailClean && !licClean) return null;

    const matchedByEmail = emailClean
      ? customerList.find((c) => c.email && c.email.trim().toLowerCase() === emailClean)
      : null;
    const matchedByLic = licClean
      ? customerList.find((c) => c.licenseNumber && c.licenseNumber.trim().toUpperCase() === licClean)
      : null;

    return matchedByEmail || matchedByLic || null;
  }, [customerMode, customerList, selectedExistingCustomerId, customerIdentityConflict, customerForm.email, customerForm.licenseNumber]);

  // Filtered vehicles for visual picker
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const term = vehicleSearch.toLowerCase().trim();
      const matchesSearch =
        !term ||
        v.name?.toLowerCase().includes(term) ||
        v.brand?.toLowerCase().includes(term) ||
        v.registrationNumber?.toLowerCase().includes(term) ||
        v.fuelType?.toLowerCase().includes(term);

      const matchesCategory =
        vehicleCategoryFilter === 'All' || v.type === vehicleCategoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [vehicles, vehicleSearch, vehicleCategoryFilter]);

  // Field change handlers
  const handleCustomerFieldChange = (e) => {
    const { name, value } = e.target;
    setCustomerForm((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    setApiError(null);
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSelectVehicle = (vId) => {
    setSelectedVehicleId(String(vId));
    if (errors.vehicleId) {
      setErrors((prev) => ({ ...prev, vehicleId: '' }));
    }
    setTouched((prev) => ({ ...prev, vehicleId: true }));
    setShowVehiclePicker(false);
  };

  const applyDurationPreset = (days) => {
    const start = startDate || today;
    const computedEnd = computeEndDateFromDuration(start, days);
    setStartDate(start);
    setEndDate(computedEnd);
    if (errors.endDate) {
      setErrors((prev) => ({ ...prev, endDate: '' }));
    }
  };

  // Handle switching to existing customer from dropdown
  const handleExistingCustomerSelect = (e) => {
    const custId = e.target.value;
    setSelectedExistingCustomerId(custId);
    const found = customerList.find((c) => String(c.id) === String(custId));
    if (found) {
      setCustomerForm({
        name: found.name || '',
        email: found.email || '',
        phone: found.phone || '',
        licenseNumber: found.licenseNumber || '',
        address: found.address || '',
      });
    }
    if (errors.customerId) {
      setErrors((prev) => ({ ...prev, customerId: '' }));
    }
  };

  // Client-side validation before opening review modal
  const validateForm = () => {
    const errs = {};

    // 1. Vehicle validation
    if (!selectedVehicleId) {
      errs.vehicleId = 'Please select a vehicle from the fleet.';
    }

    // 2. Dates validation
    if (!startDate) {
      errs.startDate = 'Pickup date is required.';
    } else if (!isEdit && startDate < today) {
      errs.startDate = 'Pickup date cannot be in the past.';
    }

    if (!endDate) {
      errs.endDate = 'Return date is required.';
    } else if (startDate && endDate < startDate) {
      errs.endDate = 'Return date must be on or after the pickup date.';
    }

    if (startDate && endDate && numberOfDays <= 0) {
      errs.endDate = 'Invalid rental duration selected.';
    }

    // 3. Conflict validation
    if (bookingConflict) {
      errs.conflict = `Selected dates overlap with an existing booking for this vehicle (${formatDate(bookingConflict.startDate)} to ${formatDate(bookingConflict.endDate)}).`;
    }

    // 4. Customer validation
    if (customerMode === 'existing') {
      if (!selectedExistingCustomerId) {
        errs.customerId = 'Please select an existing customer record.';
      }
    } else {
      if (!customerForm.name.trim()) {
        errs.name = 'Full name is required.';
      } else if (customerForm.name.trim().length < 2) {
        errs.name = 'Full name must be at least 2 characters.';
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!customerForm.email.trim()) {
        errs.email = 'Email address is required.';
      } else if (!emailRegex.test(customerForm.email.trim())) {
        errs.email = 'Please enter a valid email address (e.g. name@example.com).';
      }

      const phoneClean = (customerForm.phone || '').replace(/\D/g, '');
      if (!customerForm.phone.trim()) {
        errs.phone = 'Phone number is required.';
      } else if (phoneClean.length !== 10) {
        errs.phone = 'Phone number must be exactly 10 digits.';
      }

      if (!customerForm.licenseNumber.trim()) {
        errs.licenseNumber = 'Driving licence number is required.';
      }

      if (!customerForm.address.trim()) {
        errs.address = 'Residential address is required.';
      }

      if (customerIdentityConflict) {
        errs.customerConflict = `Identity Conflict: The email (${customerForm.email}) belongs to customer "${customerIdentityConflict.emailCustomer.name}", while driving licence (${customerForm.licenseNumber}) belongs to customer "${customerIdentityConflict.licCustomer.name}". Please correct customer details.`;
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Open Review Modal
  const handleProceedToReview = (e) => {
    e.preventDefault();
    const isValid = validateForm();
    if (isValid) {
      setIsReviewModalOpen(true);
    } else {
      // Touch all fields to show validation feedback
      setTouched({
        vehicleId: true,
        startDate: true,
        endDate: true,
        name: true,
        email: true,
        phone: true,
        licenseNumber: true,
        address: true,
        customerId: true,
      });
    }
  };

  // Final Confirmation Execution
  const handleConfirmBooking = async () => {
    setIsSubmittingBooking(true);
    setApiError(null);

    try {
      // 0. Identity Conflict Check
      if (customerIdentityConflict) {
        throw new Error(
          `Customer Identity Conflict: The email (${customerForm.email}) belongs to "${customerIdentityConflict.emailCustomer.name}", while driving licence (${customerForm.licenseNumber}) belongs to "${customerIdentityConflict.licCustomer.name}". Silently merging conflicting profiles is blocked.`
        );
      }

      // 1. Conflict Re-Check immediately before creating rental from API
      // Note: Application-level conflict checking against latest rentals
      const latestRentals = await getRentals();
      const freshConflict = checkBookingOverlap(
        latestRentals,
        selectedVehicleId,
        startDate,
        endDate,
        currentId
      );

      if (freshConflict) {
        throw new Error(
          `Booking Conflict: Vehicle ${selectedVehicle?.name} was just booked by another reservation from ${formatDate(freshConflict.startDate)} to ${formatDate(freshConflict.endDate)}. Please pick different dates.`
        );
      }

      // If custom onSubmit was provided (e.g. for EditRental), delegate to it
      if (isEdit && onSubmit) {
        const payload = {
          customerId: selectedExistingCustomerId || (matchedExistingCustomer ? matchedExistingCustomer.id : null),
          vehicleId: String(selectedVehicleId),
          startDate,
          endDate,
          numberOfDays: Number(numberOfDays),
          pricePerDay: Number(pricePerDay),
          totalAmount: Number(totalAmount),
          status: status || 'Active',
          createdAt: initialData?.createdAt || today,
        };
        await onSubmit(payload);
        setIsReviewModalOpen(false);
        setIsSubmittingBooking(false);
        return;
      }

      // 2. Customer Identification / Registration
      let customerIdToUse = null;

      if (customerMode === 'existing' && selectedExistingCustomerId) {
        customerIdToUse = String(selectedExistingCustomerId);
      } else if (matchedExistingCustomer) {
        // Reuse matching customer record without creating duplicate
        customerIdToUse = String(matchedExistingCustomer.id);
      } else {
        // Register new customer in /customers
        const newCustomerPayload = {
          id: String(Date.now()),
          name: customerForm.name.trim(),
          email: customerForm.email.trim().toLowerCase(),
          phone: customerForm.phone.replace(/\D/g, ''),
          licenseNumber: customerForm.licenseNumber.trim().toUpperCase(),
          address: customerForm.address.trim(),
          createdAt: today,
        };

        const createdCust = await addCustomer(newCustomerPayload);
        customerIdToUse = String(createdCust?.id || newCustomerPayload.id);

        // Update local customer list
        setNewRegisteredCustomers((prev) => [...prev, createdCust || newCustomerPayload]);
      }

      // 3. Create Rental Transaction in /rentals
      const rentalPayload = {
        id: String(Date.now()),
        vehicleId: String(selectedVehicleId),
        customerId: String(customerIdToUse),
        startDate,
        endDate,
        numberOfDays: Number(numberOfDays),
        pricePerDay: Number(pricePerDay),
        totalAmount: Number(totalAmount),
        status: status || (startDate <= today ? 'Active' : 'Upcoming'),
        createdAt: today,
      };

      const createdRental = await addRental(rentalPayload);
      const bookingId = createdRental?.id || rentalPayload.id;

      // 4. Update vehicle status to 'Rented' if the booking starts today and is Active
      if (rentalPayload.status === 'Active' && selectedVehicle?.status === 'Available') {
        try {
          await updateVehicle(selectedVehicle.id, {
            ...selectedVehicle,
            status: 'Rented',
          });
        } catch (vehErr) {
          console.warn('Vehicle status update non-fatal warning:', vehErr);
        }
      }

      // 5. Save confirmed booking data and show success confirmation modal
      setConfirmedBookingData({
        bookingId,
        rental: createdRental || rentalPayload,
        vehicle: selectedVehicle,
        customer: matchedExistingCustomer || {
          ...customerForm,
          id: customerIdToUse,
        },
      });

      setIsReviewModalOpen(false);
      setIsSuccessModalOpen(true);
    } catch (err) {
      console.error('Booking submission failed:', err);
      setApiError(
        err.message || 'API request failed. Unable to create booking on JSON Server.'
      );
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  return (
    <>
      <form className="booking-portal-form" onSubmit={handleProceedToReview} noValidate>
        {/* API Error Notification */}
        {apiError && (
          <div className="alert alert-danger d-flex align-items-center mb-4 shadow-sm" role="alert">
            <span className="me-2 fs-4">⚠️</span>
            <div className="flex-grow-1">
              <strong>Booking Error:</strong> {apiError}
            </div>
            <button
              type="button"
              className="btn-close btn-close-white ms-2"
              onClick={() => setApiError(null)}
              aria-label="Close"
            />
          </div>
        )}

        {/* Double-Booking Conflict Alert */}
        {bookingConflict && (
          <div className="alert alert-danger d-flex align-items-start mb-4 shadow-sm" role="alert">
            <span className="me-3 fs-3">⛔</span>
            <div className="flex-grow-1">
              <h5 className="alert-heading mb-1 font-bold">Booking Conflict Detected</h5>
              <p className="mb-2">
                <strong>{selectedVehicle?.brand} {selectedVehicle?.name}</strong> is already booked by{' '}
                <strong>{conflictingCustomerName}</strong> for dates{' '}
                <span className="badge bg-danger text-white px-2 py-1 ms-1">
                  {formatDate(bookingConflict.startDate)} → {formatDate(bookingConflict.endDate)}
                </span>
                .
              </p>
              <p className="text-secondary small mb-2">
                <em>Overlap rule active: requestedStart &le; existingEnd &amp;&amp; requestedEnd &ge; existingStart. Double-bookings are strictly prevented.</em>
              </p>
              {suggestedNextDate && (
                <div className="mt-2">
                  <span className="me-2 text-white">Suggested alternative start:</span>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-light"
                    onClick={() => {
                      setStartDate(suggestedNextDate);
                      setEndDate(computeEndDateFromDuration(suggestedNextDate, numberOfDays || 1));
                    }}
                  >
                    👉 Shift Booking to {formatDate(suggestedNextDate)}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==========================================================
            STEP 1: VEHICLE SELECTION
           ========================================================== */}
        <div className="card bg-dark border-secondary mb-4 shadow-sm">
          <div className="card-header bg-dark bg-gradient border-secondary py-3 d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-primary rounded-circle p-2 fs-6">1</span>
              <div>
                <h4 className="mb-0 text-white font-semibold">Select Fleet Vehicle <span className="text-danger">*</span></h4>
                <small className="text-secondary">Choose vehicle to rent; daily pricing updates automatically.</small>
              </div>
            </div>
            {selectedVehicle && (
              <button
                type="button"
                className="btn btn-sm btn-outline-info"
                onClick={() => setShowVehiclePicker(!showVehiclePicker)}
              >
                {showVehiclePicker ? '▲ Hide Fleet' : '▼ Change Vehicle'}
              </button>
            )}
          </div>

          <div className="card-body p-4">
            {/* Selected Vehicle Display Card */}
            {selectedVehicle ? (
              <div className="row g-3 align-items-center bg-black bg-opacity-40 p-3 rounded border border-secondary mb-3">
                <div className="col-12 col-md-3">
                  <img
                    src={selectedVehicle.image || 'https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&w=400&q=80'}
                    alt={selectedVehicle.name}
                    className="img-fluid rounded shadow-sm w-100"
                    style={{ maxHeight: '160px', objectFit: 'cover' }}
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=400&q=80';
                    }}
                  />
                </div>
                <div className="col-12 col-md-6">
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <span className="badge bg-primary text-uppercase">{selectedVehicle.type}</span>
                    <span className={`badge ${selectedVehicle.status === 'Available' ? 'bg-success' : 'bg-warning'}`}>
                      {selectedVehicle.status}
                    </span>
                    <span className="text-secondary small">Reg: {selectedVehicle.registrationNumber}</span>
                  </div>
                  <h3 className="text-white mb-2">{selectedVehicle.brand} {selectedVehicle.name}</h3>
                  <div className="d-flex flex-wrap gap-3 text-secondary small">
                    <span>⛽ {selectedVehicle.fuelType}</span>
                    <span>⚙️ {selectedVehicle.transmission}</span>
                    <span>💺 {selectedVehicle.seats} Seats</span>
                    <span>📅 Model: {selectedVehicle.model}</span>
                  </div>
                </div>
                <div className="col-12 col-md-3 text-md-end">
                  <span className="text-secondary d-block small">Rental Rate</span>
                  <div className="fs-3 fw-bold text-primary">{formatCurrency(selectedVehicle.pricePerDay)}</div>
                  <span className="text-secondary small">/ day</span>
                </div>
              </div>
            ) : (
              <div className="alert alert-warning mb-3">
                ⚠️ No vehicle selected yet. Please choose an available vehicle below to proceed with booking.
              </div>
            )}

            {/* Expandable / Initial Vehicle Picker */}
            {showVehiclePicker && (
              <div className="vehicle-picker-container mt-3">
                {/* Search & Category Filter Tabs */}
                <div className="row g-2 mb-3">
                  <div className="col-12 col-md-6">
                    <div className="btn-group w-100" role="group">
                      {['All', 'Car', 'SUV', 'Motorcycle'].map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          className={`btn btn-sm ${vehicleCategoryFilter === cat ? 'btn-primary' : 'btn-outline-secondary'}`}
                          onClick={() => setVehicleCategoryFilter(cat)}
                        >
                          {cat === 'All' ? 'All Types' : cat}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="col-12 col-md-6">
                    <input
                      type="text"
                      className="form-control form-control-sm bg-dark text-white border-secondary"
                      placeholder="🔍 Search fleet by name, brand, or reg..."
                      value={vehicleSearch}
                      onChange={(e) => setVehicleSearch(e.target.value)}
                    />
                  </div>
                </div>

                {/* Fleet Card Gallery Grid */}
                <div className="row row-cols-1 row-cols-sm-2 row-cols-lg-3 g-3">
                  {filteredVehicles.map((v) => {
                    const isSelected = String(selectedVehicleId) === String(v.id);
                    const isUnavailable = v.status === 'Maintenance';

                    return (
                      <div key={v.id} className="col">
                        <div
                          className={`card h-100 bg-black bg-opacity-50 border ${
                            isSelected ? 'border-primary ring-2 shadow' : 'border-secondary'
                          } ${isUnavailable ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                          onClick={() => !isUnavailable && handleSelectVehicle(v.id)}
                          style={{ cursor: isUnavailable ? 'not-allowed' : 'pointer' }}
                        >
                          <img
                            src={v.image || 'https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&w=400&q=80'}
                            alt={v.name}
                            className="card-img-top"
                            style={{ height: '140px', objectFit: 'cover' }}
                            onError={(e) => {
                              e.target.src = 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=400&q=80';
                            }}
                          />
                          <div className="card-body p-3">
                            <div className="d-flex justify-content-between align-items-start mb-1">
                              <span className="badge bg-secondary small">{v.type}</span>
                              <span className={`badge ${v.status === 'Available' ? 'bg-success' : 'bg-warning'}`}>
                                {v.status}
                              </span>
                            </div>
                            <h6 className="card-title text-white mb-1 font-semibold">{v.brand} {v.name}</h6>
                            <div className="small text-secondary mb-2">{v.registrationNumber} • {v.fuelType}</div>
                            <div className="d-flex justify-content-between align-items-center mt-2 pt-2 border-top border-secondary">
                              <span className="fw-bold text-primary">{formatCurrency(v.pricePerDay)}<small className="text-secondary">/day</small></span>
                              <span className={`badge ${isSelected ? 'bg-primary' : 'bg-dark border border-secondary text-light'}`}>
                                {isSelected ? '✓ Selected' : 'Choose'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Standard Accessible Dropdown */}
            <div className="mt-3">
              <label className="form-label text-secondary small" htmlFor="vehicleIdSelect">
                Standard Vehicle Selector <span className="text-danger">*</span>
              </label>
              <select
                id="vehicleIdSelect"
                className={`form-select bg-dark text-white border-secondary ${
                  touched.vehicleId && errors.vehicleId ? 'is-invalid' : ''
                }`}
                value={selectedVehicleId}
                onChange={(e) => handleSelectVehicle(e.target.value)}
                onBlur={() => handleBlur('vehicleId')}
                disabled={isLoading}
              >
                <option value="">-- Choose Vehicle from Fleet --</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id} disabled={v.status === 'Maintenance'}>
                    {v.brand} {v.name} ({v.type} | {v.registrationNumber}) — {formatCurrency(v.pricePerDay)}/day [{v.status}]
                  </option>
                ))}
              </select>
              {touched.vehicleId && errors.vehicleId && (
                <div className="invalid-feedback d-block">{errors.vehicleId}</div>
              )}
            </div>
          </div>
        </div>

        {/* ==========================================================
            STEP 2: RENTAL SCHEDULE & INCLUSIVE CALCULATION
           ========================================================== */}
        <div className="card bg-dark border-secondary mb-4 shadow-sm">
          <div className="card-header bg-dark bg-gradient border-secondary py-3">
            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-primary rounded-circle p-2 fs-6">2</span>
              <div>
                <h4 className="mb-0 text-white font-semibold">Rental Dates & Automatic Pricing <span className="text-danger">*</span></h4>
                <small className="text-secondary">Select pickup and return dates. Rental fee calculates automatically with inclusive-day convention.</small>
              </div>
            </div>
          </div>

          <div className="card-body p-4">
            {/* Quick Duration Preset Pills */}
            <div className="mb-4">
              <label className="form-label text-secondary small d-block mb-2">Quick Duration Presets:</label>
              <div className="d-flex flex-wrap gap-2">
                {[
                  { label: '1 Day', days: 1 },
                  { label: 'Weekend (2D)', days: 2 },
                  { label: '3 Days', days: 3 },
                  { label: '5 Days', days: 5 },
                  { label: '1 Week (7D)', days: 7 },
                  { label: '2 Weeks (14D)', days: 14 },
                  { label: '1 Month (30D)', days: 30 },
                ].map((preset) => (
                  <button
                    key={preset.days}
                    type="button"
                    className={`btn btn-sm ${
                      numberOfDays === preset.days ? 'btn-primary' : 'btn-outline-secondary'
                    }`}
                    onClick={() => applyDurationPreset(preset.days)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Pickers Grid */}
            <div className="row g-3">
              <div className="col-12 col-md-4">
                <label className="form-label text-white" htmlFor="startDateInput">
                  Pickup Date <span className="text-danger">*</span>
                </label>
                <input
                  type="date"
                  id="startDateInput"
                  className={`form-control bg-dark text-white border-secondary ${
                    touched.startDate && errors.startDate ? 'is-invalid' : ''
                  }`}
                  min={!isEdit ? today : undefined}
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (errors.startDate) setErrors((prev) => ({ ...prev, startDate: '' }));
                  }}
                  onBlur={() => handleBlur('startDate')}
                  disabled={isLoading}
                />
                {touched.startDate && errors.startDate && (
                  <div className="invalid-feedback">{errors.startDate}</div>
                )}
                <small className="text-secondary">Pickup must be today or future.</small>
              </div>

              <div className="col-12 col-md-4">
                <label className="form-label text-white" htmlFor="endDateInput">
                  Return Date <span className="text-danger">*</span>
                </label>
                <input
                  type="date"
                  id="endDateInput"
                  className={`form-control bg-dark text-white border-secondary ${
                    touched.endDate && errors.endDate ? 'is-invalid' : ''
                  }`}
                  min={startDate || (!isEdit ? today : undefined)}
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    if (errors.endDate) setErrors((prev) => ({ ...prev, endDate: '' }));
                  }}
                  onBlur={() => handleBlur('endDate')}
                  disabled={isLoading}
                />
                {touched.endDate && errors.endDate && (
                  <div className="invalid-feedback">{errors.endDate}</div>
                )}
                <small className="text-secondary">Return must be on or after pickup.</small>
              </div>

              <div className="col-12 col-md-4">
                <label className="form-label text-white" htmlFor="statusSelect">
                  Booking Status
                </label>
                <select
                  id="statusSelect"
                  className="form-select bg-dark text-white border-secondary"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  disabled={isLoading}
                >
                  <option value="Active">Active (Vehicle Dispatched)</option>
                  <option value="Upcoming">Upcoming (Advance Booking)</option>
                  {isEdit && <option value="Completed">Completed (Returned)</option>}
                  {isEdit && <option value="Cancelled">Cancelled</option>}
                </select>
                <small className="text-secondary">Default is Active for immediate hire.</small>
              </div>
            </div>

            {/* Live Pricing Breakdown Card */}
            <div className="card bg-black bg-opacity-60 border-primary mt-4 p-3 shadow">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="text-white mb-0 d-flex align-items-center gap-2">
                  <span>🧾</span> Rental Cost Summary
                </h5>
                <span className="badge bg-primary text-uppercase">Auto-Calculated</span>
              </div>

              <div className="row g-2 text-white">
                <div className="col-6 col-md-3">
                  <span className="text-secondary small d-block">Price Per Day</span>
                  <strong className="fs-5">{formatCurrency(pricePerDay)}</strong>
                </div>
                <div className="col-6 col-md-3">
                  <span className="text-secondary small d-block">Rental Duration</span>
                  <strong className="fs-5">{numberOfDays} {numberOfDays === 1 ? 'Day' : 'Days'} <small className="text-secondary">(inclusive)</small></strong>
                </div>
                <div className="col-12 col-md-6 text-md-end">
                  <span className="text-secondary small d-block">Total Rental Cost</span>
                  <div className="fs-3 fw-bold text-success">{formatCurrency(totalAmount)}</div>
                </div>
              </div>

              <div className="mt-3 pt-2 border-top border-secondary text-secondary small d-flex justify-content-between">
                <span>
                  Formula: <code>Rental Amount = Number of Rental Days × Price Per Day</code>
                </span>
                <span>
                  {numberOfDays > 0 && pricePerDay > 0
                    ? `${numberOfDays} Days × ${formatCurrency(pricePerDay)} = ${formatCurrency(totalAmount)}`
                    : 'Select vehicle & valid dates to see total'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ==========================================================
            STEP 3: CUSTOMER REGISTRATION / IDENTIFICATION
           ========================================================== */}
        <div className="card bg-dark border-secondary mb-4 shadow-sm">
          <div className="card-header bg-dark bg-gradient border-secondary py-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-primary rounded-circle p-2 fs-6">3</span>
              <div>
                <h4 className="mb-0 text-white font-semibold">Customer Details <span className="text-danger">*</span></h4>
                <small className="text-secondary">Register as part of booking. No login or password required.</small>
              </div>
            </div>

            {/* Mode Toggle Pills */}
            <div className="btn-group btn-group-sm" role="group">
              <button
                type="button"
                className={`btn ${customerMode === 'register' ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => setCustomerMode('register')}
              >
                📝 Customer Registration
              </button>
              <button
                type="button"
                className={`btn ${customerMode === 'existing' ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => setCustomerMode('existing')}
              >
                👤 Returning Customer Lookup
              </button>
            </div>
          </div>

          <div className="card-body p-4">
            {/* Returning Customer Recognition Alert */}
            {matchedExistingCustomer && customerMode === 'register' && (
              <div className="alert alert-success d-flex align-items-center mb-3 py-2 shadow-sm" role="alert">
                <span className="me-2 fs-5">🎉</span>
                <div className="flex-grow-1 small">
                  <strong>Existing Customer Profile Matched:</strong> We found an existing profile for{' '}
                  <strong>{matchedExistingCustomer.name}</strong> ({matchedExistingCustomer.email} | DL: {matchedExistingCustomer.licenseNumber}).
                  This booking will be automatically linked to your existing record without creating duplicate customers.
                </div>
              </div>
            )}

            {/* Customer Identity Conflict Alert */}
            {customerIdentityConflict && customerMode === 'register' && (
              <div className="alert alert-danger d-flex align-items-start mb-3 py-3 shadow-sm border border-danger" role="alert">
                <span className="me-2 fs-4">⚠️</span>
                <div className="flex-grow-1">
                  <strong className="d-block mb-1 text-danger-emphasis">Customer Identity Conflict Detected</strong>
                  <p className="mb-1 small">
                    The email address <code>{customerForm.email}</code> is registered to <strong>{customerIdentityConflict.emailCustomer.name}</strong>, while the driving licence <code>{customerForm.licenseNumber}</code> belongs to customer <strong>{customerIdentityConflict.licCustomer.name}</strong>.
                  </p>
                  <small className="text-secondary">
                    Please provide matching credentials, or choose the returning customer from the lookup dropdown. Conflicting profiles cannot be silently merged.
                  </small>
                </div>
              </div>
            )}

            {/* Mode 1: Returning Customer Dropdown Picker */}
            {customerMode === 'existing' && (
              <div className="mb-4 p-3 bg-black bg-opacity-40 rounded border border-secondary">
                <label className="form-label text-white" htmlFor="existingCustomerSelect">
                  Select Registered Customer Profile <span className="text-danger">*</span>
                </label>
                <select
                  id="existingCustomerSelect"
                  className={`form-select bg-dark text-white border-secondary ${
                    touched.customerId && errors.customerId ? 'is-invalid' : ''
                  }`}
                  value={selectedExistingCustomerId}
                  onChange={handleExistingCustomerSelect}
                  onBlur={() => handleBlur('customerId')}
                >
                  <option value="">-- Choose Existing Client Profile --</option>
                  {customerList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — Phone: {c.phone} | DL: {c.licenseNumber} ({c.email})
                    </option>
                  ))}
                </select>
                {touched.customerId && errors.customerId && (
                  <div className="invalid-feedback">{errors.customerId}</div>
                )}
                <small className="text-secondary d-block mt-1">
                  Or switch to "Customer Registration" above to register new client details.
                </small>
              </div>
            )}

            {/* Mode 2: Form Inputs (Always editable / prefillable) */}
            <div className="row g-3">
              {/* Full Name */}
              <div className="col-12 col-md-6">
                <label className="form-label text-white" htmlFor="custName">
                  Full Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  id="custName"
                  name="name"
                  placeholder="e.g. Jitendra Meher"
                  className={`form-control bg-dark text-white border-secondary ${
                    touched.name && errors.name ? 'is-invalid' : ''
                  }`}
                  value={customerForm.name}
                  onChange={handleCustomerFieldChange}
                  onBlur={() => handleBlur('name')}
                  disabled={isLoading}
                />
                {touched.name && errors.name && (
                  <div className="invalid-feedback">{errors.name}</div>
                )}
              </div>

              {/* Mobile Phone */}
              <div className="col-12 col-md-6">
                <label className="form-label text-white" htmlFor="custPhone">
                  Phone Number (10 digits) <span className="text-danger">*</span>
                </label>
                <input
                  type="tel"
                  id="custPhone"
                  name="phone"
                  maxLength={10}
                  placeholder="9876543210"
                  className={`form-control bg-dark text-white border-secondary ${
                    touched.phone && errors.phone ? 'is-invalid' : ''
                  }`}
                  value={customerForm.phone}
                  onChange={handleCustomerFieldChange}
                  onBlur={() => handleBlur('phone')}
                  disabled={isLoading}
                />
                {touched.phone && errors.phone && (
                  <div className="invalid-feedback">{errors.phone}</div>
                )}
              </div>

              {/* Email Address */}
              <div className="col-12 col-md-6">
                <label className="form-label text-white" htmlFor="custEmail">
                  Email Address <span className="text-danger">*</span>
                </label>
                <input
                  type="email"
                  id="custEmail"
                  name="email"
                  placeholder="e.g. jitendra@example.com"
                  className={`form-control bg-dark text-white border-secondary ${
                    touched.email && errors.email ? 'is-invalid' : ''
                  }`}
                  value={customerForm.email}
                  onChange={handleCustomerFieldChange}
                  onBlur={() => handleBlur('email')}
                  disabled={isLoading}
                />
                {touched.email && errors.email && (
                  <div className="invalid-feedback">{errors.email}</div>
                )}
                <small className="text-secondary">Used as unique customer identifier for returning bookings.</small>
              </div>

              {/* Driving Licence */}
              <div className="col-12 col-md-6">
                <label className="form-label text-white" htmlFor="custLicense">
                  Driving Licence Number <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  id="custLicense"
                  name="licenseNumber"
                  placeholder="e.g. AP0120220012345"
                  className={`form-control bg-dark text-white border-secondary text-uppercase ${
                    touched.licenseNumber && errors.licenseNumber ? 'is-invalid' : ''
                  }`}
                  value={customerForm.licenseNumber}
                  onChange={(e) => {
                    handleCustomerFieldChange({
                      target: { name: 'licenseNumber', value: e.target.value.toUpperCase() },
                    });
                  }}
                  onBlur={() => handleBlur('licenseNumber')}
                  disabled={isLoading}
                />
                {touched.licenseNumber && errors.licenseNumber && (
                  <div className="invalid-feedback">{errors.licenseNumber}</div>
                )}
                <small className="text-secondary">Government-issued driving license for insurance verification.</small>
              </div>

              {/* Full Address */}
              <div className="col-12">
                <label className="form-label text-white" htmlFor="custAddress">
                  Address <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  id="custAddress"
                  name="address"
                  placeholder="Street Address, City, State, PIN"
                  className={`form-control bg-dark text-white border-secondary ${
                    touched.address && errors.address ? 'is-invalid' : ''
                  }`}
                  value={customerForm.address}
                  onChange={handleCustomerFieldChange}
                  onBlur={() => handleBlur('address')}
                  disabled={isLoading}
                />
                {touched.address && errors.address && (
                  <div className="invalid-feedback">{errors.address}</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ==========================================================
            SUBMISSION ACTIONS
           ========================================================== */}
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 pt-2">
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => navigate('/rentals')}
            disabled={isLoading || isSubmittingBooking}
          >
            ← Cancel &amp; Back to Rentals
          </button>

          <button
            type="submit"
            className={`btn px-4 py-2 fs-6 fw-bold ${
              bookingConflict ? 'btn-secondary disabled' : 'btn-primary'
            }`}
            disabled={isLoading || isSubmittingBooking || Boolean(bookingConflict)}
          >
            📋 Review Booking &amp; Confirm
          </button>
        </div>
      </form>

      {/* ==========================================================
          STEP 4: BOOKING REVIEW MODAL (Confirmation Preview)
         ========================================================== */}
      {isReviewModalOpen && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(8px)' }}
          tabIndex="-1"
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-dialog modal-lg modal-dialog-centered" role="document">
            <div className="modal-content bg-dark text-white border-secondary shadow-lg">
              <div className="modal-header border-secondary bg-black bg-opacity-40">
                <h5 className="modal-title font-bold text-white d-flex align-items-center gap-2">
                  <span>📋</span> Review &amp; Confirm Booking
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  aria-label="Close"
                  onClick={() => setIsReviewModalOpen(false)}
                  disabled={isSubmittingBooking}
                />
              </div>

              <div className="modal-body p-4">
                {apiError && (
                  <div className="alert alert-danger mb-3" role="alert">
                    ⚠️ {apiError}
                  </div>
                )}

                {/* Section 1: Vehicle Info */}
                <div className="p-3 bg-black bg-opacity-50 rounded border border-secondary mb-3">
                  <div className="d-flex align-items-center gap-3">
                    <img
                      src={selectedVehicle?.image || 'https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&w=400&q=80'}
                      alt={selectedVehicle?.name}
                      style={{ width: '90px', height: '65px', objectFit: 'cover' }}
                      className="rounded border border-secondary"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=400&q=80';
                      }}
                    />
                    <div>
                      <span className="badge bg-primary text-uppercase me-2">{selectedVehicle?.type}</span>
                      <span className="text-secondary small">Reg: {selectedVehicle?.registrationNumber}</span>
                      <h4 className="text-white mb-0 mt-1">{selectedVehicle?.brand} {selectedVehicle?.name}</h4>
                    </div>
                  </div>
                </div>

                {/* Section 2: Rental Dates & Days */}
                <div className="row g-2 mb-3">
                  <div className="col-12 col-md-6">
                    <div className="p-3 bg-black bg-opacity-40 rounded border border-secondary h-100">
                      <span className="text-secondary small d-block">Pickup Date</span>
                      <strong className="fs-6 text-white">{formatDate(startDate)}</strong>
                      <span className="text-secondary small d-block mt-2">Return Date</span>
                      <strong className="fs-6 text-white">{formatDate(endDate)}</strong>
                    </div>
                  </div>
                  <div className="col-12 col-md-6">
                    <div className="p-3 bg-black bg-opacity-40 rounded border border-secondary h-100">
                      <span className="text-secondary small d-block">Rental Duration</span>
                      <strong className="fs-5 text-white">{numberOfDays} {numberOfDays === 1 ? 'Day' : 'Days'}</strong>
                      <span className="text-secondary small d-block mt-2">Rate Per Day</span>
                      <strong className="fs-6 text-white">{formatCurrency(pricePerDay)} / day</strong>
                    </div>
                  </div>
                </div>

                {/* Section 3: Customer Details */}
                <div className="p-3 bg-black bg-opacity-40 rounded border border-secondary mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="text-secondary small font-semibold">CUSTOMER REGISTRATION DETAILS</span>
                    <span className={`badge ${matchedExistingCustomer ? 'bg-success' : 'bg-info'}`}>
                      {matchedExistingCustomer ? 'Existing Profile' : 'New Customer Registration'}
                    </span>
                  </div>
                  <div className="row g-2 text-white small">
                    <div className="col-6"><strong>Name:</strong> {customerForm.name}</div>
                    <div className="col-6"><strong>Mobile:</strong> {customerForm.phone}</div>
                    <div className="col-6"><strong>Email:</strong> {customerForm.email}</div>
                    <div className="col-6"><strong>DL No:</strong> {customerForm.licenseNumber}</div>
                    <div className="col-12"><strong>Address:</strong> {customerForm.address}</div>
                  </div>
                </div>

                {/* Section 4: Total & Conflict Verification */}
                <div className="p-3 bg-black bg-opacity-60 rounded border border-primary text-white d-flex justify-content-between align-items-center">
                  <div>
                    <span className="text-secondary small d-block">Total Payable Amount</span>
                    <div className="fs-3 fw-bold text-success">{formatCurrency(totalAmount)}</div>
                    <small className="text-secondary">Inclusive of all rental charges</small>
                  </div>
                  <div className="text-end">
                    <span className="badge bg-success py-2 px-3 d-flex align-items-center gap-1">
                      <span>✓</span> Conflict Check: Clean
                    </span>
                  </div>
                </div>
              </div>

              <div className="modal-footer border-secondary bg-black bg-opacity-40">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsReviewModalOpen(false)}
                  disabled={isSubmittingBooking}
                >
                  ← Edit Details
                </button>
                <button
                  type="button"
                  className="btn btn-primary fw-bold px-4"
                  onClick={handleConfirmBooking}
                  disabled={isSubmittingBooking}
                >
                  {isSubmittingBooking ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                      Creating Reservation...
                    </>
                  ) : (
                    '✓ Confirm Booking'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================================
          STEP 5: BOOKING SUCCESS CONFIRMATION MODAL
         ========================================================== */}
      {isSuccessModalOpen && confirmedBookingData && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.9)', backdropFilter: 'blur(10px)' }}
          tabIndex="-1"
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content bg-dark text-white border-success shadow-lg">
              <div className="modal-header border-secondary bg-success bg-opacity-25 py-3">
                <h5 className="modal-title font-bold text-success d-flex align-items-center gap-2">
                  <span>🎉</span> Booking Confirmed Successfully!
                </h5>
              </div>

              <div className="modal-body p-4 text-center">
                <div
                  className="rounded-circle bg-success bg-opacity-20 text-success d-inline-flex align-items-center justify-content-center mb-3"
                  style={{ width: '70px', height: '70px', fontSize: '2.5rem' }}
                >
                  ✓
                </div>

                <h4 className="text-white mb-1">Reservation Confirmed</h4>
                <p className="text-secondary small mb-3">
                  Unique Booking Reference ID:{' '}
                  <span className="badge bg-primary fs-6 px-3 py-1 ms-1 font-mono">
                    #{confirmedBookingData.bookingId}
                  </span>
                </p>

                <div className="text-start bg-black bg-opacity-50 p-3 rounded border border-secondary mb-3 small">
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-secondary">Vehicle:</span>
                    <strong className="text-white">
                      {confirmedBookingData.vehicle?.brand} {confirmedBookingData.vehicle?.name}
                    </strong>
                  </div>
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-secondary">Customer:</span>
                    <strong className="text-white">{confirmedBookingData.customer?.name}</strong>
                  </div>
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-secondary">Rental Dates:</span>
                    <span className="text-white">
                      {formatDate(confirmedBookingData.rental?.startDate)} → {formatDate(confirmedBookingData.rental?.endDate)}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-secondary">Duration:</span>
                    <span className="text-white">{confirmedBookingData.rental?.numberOfDays} Days</span>
                  </div>
                  <div className="d-flex justify-content-between pt-2 border-top border-secondary mt-2">
                    <span className="text-secondary">Total Paid / Billed:</span>
                    <strong className="text-success fs-6">
                      {formatCurrency(confirmedBookingData.rental?.totalAmount)}
                    </strong>
                  </div>
                </div>

                <p className="text-secondary small mb-0">
                  Your booking record has been committed to JSON Server. Vehicle status has been updated to Rented.
                </p>
              </div>

              <div className="modal-footer border-secondary bg-black bg-opacity-40 d-flex justify-content-between">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => navigate('/vehicles')}
                >
                  🚗 Browse Fleet
                </button>
                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => navigate('/rentals')}
                  >
                    📋 View All Rentals
                  </button>
                  <button
                    type="button"
                    className="btn btn-success btn-sm fw-bold"
                    onClick={() => navigate(`/rentals/${confirmedBookingData.bookingId}`)}
                  >
                    📄 View Rental Details
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default RentalForm;
