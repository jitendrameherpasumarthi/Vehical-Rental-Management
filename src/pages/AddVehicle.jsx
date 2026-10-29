import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getVehicles, addVehicle } from '../services/api';
import VehicleForm from '../components/VehicleForm';
import Toast from '../components/Toast';

function AddVehicle() {
  const navigate = useNavigate();
  const [existingVehicles, setExistingVehicles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  useEffect(() => {
    const loadVehicles = async () => {
      try {
        const data = await getVehicles();
        setExistingVehicles(data || []);
      } catch (err) {
        console.error('Error loading existing vehicles:', err);
      }
    };
    loadVehicles();
  }, []);

  const handleSubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      // Generate a string ID (e.g. timestamp or numeric string)
      const newId = String(Date.now());
      const newVehicle = {
        ...formData,
        id: newId,
      };

      await addVehicle(newVehicle);
      setToast({
        message: `Vehicle "${newVehicle.brand} ${newVehicle.name}" added successfully!`,
        type: 'success',
      });

      // Brief delay so user sees feedback, then navigate
      setTimeout(() => {
        navigate('/vehicles');
      }, 1000);
    } catch (err) {
      console.error('Error adding vehicle:', err);
      setToast({
        message: 'Failed to add vehicle to JSON Server. Please check API server.',
        type: 'error',
      });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="form-page-container">
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'success' })}
      />

      <div className="page-header">
        <div>
          <h1 className="page-title">Add New Vehicle</h1>
          <p className="page-subtitle">
            Enter the vehicle specification details to add it to the rental fleet.
          </p>
        </div>
      </div>

      <VehicleForm
        onSubmit={handleSubmit}
        isLoading={isSubmitting}
        existingVehicles={existingVehicles}
        isEdit={false}
      />
    </div>
  );
}

export default AddVehicle;
