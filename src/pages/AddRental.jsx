import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getVehicles, getCustomers, getRentals, addRental, updateVehicle } from '../services/api';
import RentalForm from '../components/RentalForm';
import Loading from '../components/Loading';
import Toast from '../components/Toast';

function AddRental() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedVehicleId = searchParams.get('vehicleId') || '';

  const [vehicles, setVehicles] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [existingRentals, setExistingRentals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  useEffect(() => {
    const loadPrerequisites = async () => {
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
        setExistingRentals(rentalsData || []);
      } catch (err) {
        console.error('Error loading rental form prerequisites:', err);
        setError('Failed to load customers and fleet vehicles from JSON Server.');
      } finally {
        setIsLoading(false);
      }
    };

    loadPrerequisites();
  }, []);

  const handleSubmit = async (rentalData) => {
    setIsSubmitting(true);
    try {
      const newId = String(Date.now());
      const newRental = {
        ...rentalData,
        id: newId,
      };

      const created = await addRental(newRental);
      const createdId = created?.id || newId;

      // If the rental is Active today, update the vehicle status to 'Rented'
      if (newRental.status === 'Active') {
        const targetVehicle = vehicles.find((v) => String(v.id) === String(newRental.vehicleId));
        if (targetVehicle && targetVehicle.status === 'Available') {
          await updateVehicle(targetVehicle.id, {
            ...targetVehicle,
            status: 'Rented',
          });
        }
      }

      setToast({
        message: `Rental booking #${createdId} created successfully!`,
        type: 'success',
      });

      setTimeout(() => {
        navigate('/rentals');
      }, 1000);
    } catch (err) {
      console.error('Error creating rental:', err);
      setToast({
        message: 'Failed to create rental. Please check the JSON Server connection.',
        type: 'error',
      });
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <Loading message="Loading fleet vehicles and customers for rental..." size="large" />;
  }

  if (error) {
    return (
      <div className="error-card">
        <span className="error-icon">⚠️</span>
        <h3>Error Loading Data</h3>
        <p>{error}</p>
        <button type="button" className="btn btn-secondary" onClick={() => navigate('/rentals')}>
          Back to Rentals
        </button>
      </div>
    );
  }

  return (
    <div className="form-page-container">
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'success' })}
      />

      <div className="page-header">
        <div>
          <h1 className="page-title">Vehicle Reservation &amp; Booking</h1>
          <p className="page-subtitle">
            Select your vehicle, pick rental dates, and complete customer registration in one seamless process. No login required.
          </p>
        </div>
      </div>

      <RentalForm
        vehicles={vehicles}
        customers={customers}
        existingRentals={existingRentals}
        onSubmit={handleSubmit}
        isLoading={isSubmitting}
        isEdit={false}
        preselectedVehicleId={preselectedVehicleId}
      />
    </div>
  );
}

export default AddRental;
