import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCustomerById, getCustomers, updateCustomer } from '../services/api';
import CustomerForm from '../components/CustomerForm';
import Loading from '../components/Loading';
import Toast from '../components/Toast';

function EditCustomer() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState(null);
  const [existingCustomers, setExistingCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  useEffect(() => {
    const loadCustomerData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [customerData, allCustomers] = await Promise.all([
          getCustomerById(id),
          getCustomers(),
        ]);

        if (!customerData) {
          setError(`Customer #${id} not found.`);
        } else {
          setCustomer(customerData);
          setExistingCustomers(allCustomers || []);
        }
      } catch (err) {
        console.error('Error fetching customer for edit:', err);
        setError('Failed to fetch customer details from API.');
      } finally {
        setIsLoading(false);
      }
    };

    loadCustomerData();
  }, [id]);

  const handleSubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      const updatedCustomer = {
        ...formData,
        id: String(id),
      };

      await updateCustomer(id, updatedCustomer);
      setToast({
        message: `Customer "${updatedCustomer.name}" updated successfully!`,
        type: 'success',
      });

      setTimeout(() => {
        navigate('/customers');
      }, 1000);
    } catch (err) {
      console.error('Error updating customer:', err);
      setToast({
        message: 'Failed to update customer. Please check server.',
        type: 'error',
      });
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <Loading message="Loading customer details for editing..." size="large" />;
  }

  if (error) {
    return (
      <div className="error-card">
        <span className="error-icon">⚠️</span>
        <h3>Customer Not Found</h3>
        <p>{error}</p>
        <button type="button" className="btn btn-secondary" onClick={() => navigate('/customers')}>
          Back to Customers
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
          <h1 className="page-title">Edit Customer #{id}</h1>
          <p className="page-subtitle">
            Update contact information, license number, or address for {customer?.name}.
          </p>
        </div>
      </div>

      <CustomerForm
        initialData={customer}
        onSubmit={handleSubmit}
        isLoading={isSubmitting}
        existingCustomers={existingCustomers}
        currentId={id}
        isEdit={true}
      />
    </div>
  );
}

export default EditCustomer;
