import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getVehicleById, getVehicles, updateVehicle } from '../services/api';
import VehicleForm from '../components/VehicleForm';
import Loading from '../components/Loading';
import Toast from '../components/Toast';

function EditVehicle() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [vehicle, setVehicle] = useState(null);
  const [existingVehicles, setExistingVehicles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  useEffect(() => {
    const loadVehicleData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [vehicleData, allVehicles] = await Promise.all([
          getVehicleById(id),
          getVehicles(),
        ]);
        if (!vehicleData) {
          setError(`Vehicle #${id} was not found.`);
        } else {
          setVehicle(vehicleData);
          setExistingVehicles(allVehicles || []);
        }
      } catch (err) {
        console.error('Error fetching vehicle for edit:', err);
        setError('Failed to fetch vehicle details from the API.');
      } finally {
        setIsLoading(false);
      }
    };

    loadVehicleData();
  }, [id]);

  const handleSubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      const updatedData = {
        ...formData,
        id: String(id),
      };

      await updateVehicle(id, updatedData);
      setToast({
        message: `Vehicle "${updatedData.brand} ${updatedData.name}" updated successfully!`,
        type: 'success',
      });

      setTimeout(() => {
        navigate('/vehicles');
      }, 1000);
    } catch (err) {
      console.error('Error updating vehicle:', err);
      setToast({
        message: 'Failed to update vehicle details. Please try again.',
        type: 'error',
      });
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <Loading message="Loading vehicle details for editing..." size="large" />;
  }

  if (error) {
    return (
      <div className="error-card">
        <span className="error-icon">⚠️</span>
        <h3>Vehicle Not Found</h3>
        <p>{error}</p>
        <button type="button" className="btn btn-secondary" onClick={() => navigate('/vehicles')}>
          Back to Vehicles
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
          <h1 className="page-title">Edit Vehicle #{id}</h1>
          <p className="page-subtitle">
            Update specification, pricing, or status for {vehicle?.brand} {vehicle?.name}.
          </p>
        </div>
      </div>

      <VehicleForm
        initialData={vehicle}
        onSubmit={handleSubmit}
        isLoading={isSubmitting}
        existingVehicles={existingVehicles}
        currentId={id}
        isEdit={true}
      />
    </div>
  );
}

export default EditVehicle;
