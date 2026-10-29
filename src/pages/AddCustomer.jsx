import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCustomers, addCustomer } from '../services/api';
import CustomerForm from '../components/CustomerForm';
import Toast from '../components/Toast';

function AddCustomer() {
  const navigate = useNavigate();
  const [existingCustomers, setExistingCustomers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const data = await getCustomers();
        setExistingCustomers(data || []);
      } catch (err) {
        console.error('Error fetching customers:', err);
      }
    };
    loadCustomers();
  }, []);

  const handleSubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      const newId = String(Date.now());
      const newCustomer = {
        ...formData,
        id: newId,
      };

      await addCustomer(newCustomer);
      setToast({
        message: `Customer "${newCustomer.name}" registered successfully!`,
        type: 'success',
      });

      setTimeout(() => {
        navigate('/customers');
      }, 1000);
    } catch (err) {
      console.error('Error adding customer:', err);
      setToast({
        message: 'Failed to add customer. Please check the JSON Server connection.',
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
          <h1 className="page-title">Register Customer</h1>
          <p className="page-subtitle">
            Add client information, valid driver license, and contact details for rental verification.
          </p>
        </div>
      </div>

      <CustomerForm
        onSubmit={handleSubmit}
        isLoading={isSubmitting}
        existingCustomers={existingCustomers}
        isEdit={false}
      />
    </div>
  );
}

export default AddCustomer;
