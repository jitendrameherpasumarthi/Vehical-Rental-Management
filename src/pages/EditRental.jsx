import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRentalById, getVehicles, getCustomers, getRentals, updateRental, updateVehicle } from '../services/api';
import RentalForm from '../components/RentalForm';
import Loading from '../components/Loading';
import Toast from '../components/Toast';

function EditRental() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [rental, setRental] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [existingRentals, setExistingRentals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  useEffect(() => {
    const loadRentalData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [rentalData, vehiclesData, customersData, allRentals] = await Promise.all([
          getRentalById(id),
          getVehicles(),
          getCustomers(),
          getRentals(),
        ]);

        if (!rentalData) {
          setError(`Rental booking #${id} was not found.`);
        } else {
          setRental(rentalData);
          setVehicles(vehiclesData || []);
          setCustomers(customersData || []);
          setExistingRentals(allRentals || []);
        }
      } catch (err) {
        console.error('Error fetching rental for editing:', err);
        setError('Failed to fetch rental record from API.');
      } finally {
        setIsLoading(false);
      }
    };

    loadRentalData();
  }, [id]);

  const handleSubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      const updatedRental = {
        ...formData,
        id: String(id),
      };

      await updateRental(id, updatedRental);

      // Automated fleet vehicle status sync
      const targetVehicle = vehicles.find((v) => String(v.id) === String(updatedRental.vehicleId));
      if (targetVehicle) {
        if (updatedRental.status === 'Active' && targetVehicle.status === 'Available') {
          await updateVehicle(targetVehicle.id, {
            ...targetVehicle,
            status: 'Rented',
          });
        } else if (
          (updatedRental.status === 'Completed' || updatedRental.status === 'Cancelled') &&
          targetVehicle.status === 'Rented'
        ) {
          // Check if any other active rentals exist for this vehicle
          const otherActive = existingRentals.some(
            (r) =>
              String(r.id) !== String(id) &&
              String(r.vehicleId) === String(targetVehicle.id) &&
              r.status === 'Active'
          );
          if (!otherActive) {
            await updateVehicle(targetVehicle.id, {
              ...targetVehicle,
              status: 'Available',
            });
          }
        }
      }
      setToast({
        message: `Rental booking #${id} updated successfully!`,
        type: 'success',
      });

      setTimeout(() => {
        navigate('/rentals');
      }, 1000);
    } catch (err) {
      console.error('Error updating rental:', err);
      setToast({
        message: 'Failed to update rental details. Please check server.',
        type: 'error',
      });
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <Loading message="Loading rental details for editing..." size="large" />;
  }

  if (error) {
    return (
      <div className="error-card">
        <span className="error-icon">⚠️</span>
        <h3>Rental Not Found</h3>
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
          <h1 className="page-title">Edit Rental #{id}</h1>
          <p className="page-subtitle">
            Modify booking period, vehicle selection, or rental status. Double-booking check is enforced.
          </p>
        </div>
      </div>

      <RentalForm
        initialData={rental}
        vehicles={vehicles}
        customers={customers}
        existingRentals={existingRentals}
        onSubmit={handleSubmit}
        isLoading={isSubmitting}
        isEdit={true}
        currentId={id}
      />
    </div>
  );
}

export default EditRental;
