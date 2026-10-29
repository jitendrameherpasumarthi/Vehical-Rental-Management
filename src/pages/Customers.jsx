import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCustomers, deleteCustomer, getRentals } from '../services/api';
import { formatDate } from '../utils/rentalUtils';
import SearchBar from '../components/SearchBar';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import ConfirmModal from '../components/ConfirmModal';
import Toast from '../components/Toast';

function Customers() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const fetchCustomersData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [customersData, rentalsData] = await Promise.all([
        getCustomers(),
        getRentals(),
      ]);
      setCustomers(customersData || []);
      setRentals(rentalsData || []);
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError(err.message || 'Failed to fetch customers from API. Please ensure JSON Server is running on port 3000.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomersData();
  }, [fetchCustomersData]);

  // Filter customers by search term
  const filteredCustomers = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return customers;

    return customers.filter(
      (c) =>
        (c.name && c.name.toLowerCase().includes(term)) ||
        (c.email && c.email.toLowerCase().includes(term)) ||
        (c.phone && c.phone.includes(term)) ||
        (c.licenseNumber && c.licenseNumber.toLowerCase().includes(term)) ||
        (c.address && c.address.toLowerCase().includes(term))
    );
  }, [customers, searchTerm]);

  // Count active/total rentals per customer
  const getCustomerRentalStats = (customerId) => {
    const custRentals = rentals.filter((r) => String(r.customerId) === String(customerId));
    const active = custRentals.filter((r) => r.status === 'Active').length;
    return {
      total: custRentals.length,
      active,
    };
  };

  const promptDeleteCustomer = (customer) => {
    const stats = getCustomerRentalStats(customer.id);
    if (stats.active > 0) {
      setToast({
        message: `Cannot delete "${customer.name}" because they have ${stats.active} active vehicle rental(s).`,
        type: 'error',
      });
      return;
    }
    setCustomerToDelete(customer);
  };

  const handleConfirmDelete = async () => {
    if (!customerToDelete) return;
    setIsDeleting(true);
    try {
      await deleteCustomer(customerToDelete.id);
      setToast({
        message: `Customer "${customerToDelete.name}" deleted successfully.`,
        type: 'success',
      });
      setCustomerToDelete(null);
      await fetchCustomersData();
    } catch (err) {
      console.error('Error deleting customer:', err);
      setToast({
        message: 'Failed to delete customer. Please check server.',
        type: 'error',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="customers-page">
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'success' })}
      />

      <ConfirmModal
        isOpen={Boolean(customerToDelete)}
        title="Delete Customer"
        message={`Are you sure you want to delete customer record for "${customerToDelete?.name}" (${customerToDelete?.email})?`}
        confirmText={isDeleting ? 'Deleting...' : 'Delete Customer'}
        confirmVariant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setCustomerToDelete(null)}
      />

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Customer Directory</h1>
          <p className="page-subtitle">
            Manage client profiles, driving license verification, and contact records.
          </p>
        </div>
        <div className="header-actions">
          <Link to="/customers/add" className="btn btn-primary">
            + Register New Customer
          </Link>
        </div>
      </div>

      {/* Search Bar */}
      <div className="filters-card">
        <SearchBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          placeholder="Search by name, email, 10-digit phone, or license number..."
          onReset={() => setSearchTerm('')}
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <Loading message="Loading customer records..." size="large" />
      ) : error ? (
        <div className="error-card">
          <span className="error-icon">⚠️</span>
          <h3>Error Loading Customers</h3>
          <p>{error}</p>
          <button type="button" className="btn btn-primary" onClick={fetchCustomersData}>
            Retry
          </button>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <EmptyState
          icon="👥"
          title={customers.length === 0 ? 'No Customers Registered' : 'No Matching Customers'}
          description={
            customers.length === 0
              ? 'Register your first customer to enable vehicle rentals.'
              : 'Try searching with a different name, phone number, or email.'
          }
          actionLabel={customers.length === 0 ? '+ Register Customer' : 'Clear Search'}
          onAction={customers.length === 0 ? () => navigate('/customers/add') : () => setSearchTerm('')}
        />
      ) : (
        <div className="table-card">
          <div className="table-responsive">
            <table className="data-table table table-dark table-hover align-middle">
              <thead>
                <tr>
                  <th>Customer Name</th>
                  <th>Contact Info</th>
                  <th>Driving License</th>
                  <th>Address</th>
                  <th>Rentals</th>
                  <th>Registered</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => {
                  const stats = getCustomerRentalStats(customer.id);
                  return (
                    <tr key={customer.id}>
                      <td>
                        <div className="user-profile-cell">
                          <div className="user-avatar-badge">
                            {customer.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="user-full-name">{customer.name}</span>
                            <span className="user-id-sub">ID: #{customer.id}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="contact-cell">
                          <span className="contact-email">✉️ {customer.email}</span>
                          <span className="contact-phone">📞 {customer.phone}</span>
                        </div>
                      </td>
                      <td>
                        <span className="license-badge">{customer.licenseNumber}</span>
                      </td>
                      <td>
                        <span className="address-cell" title={customer.address}>
                          {customer.address}
                        </span>
                      </td>
                      <td>
                        <div className="rental-count-cell">
                          <span className="badge-neutral">{stats.total} Total</span>
                          {stats.active > 0 && (
                            <span className="badge-warning font-semibold">{stats.active} Active</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="text-muted">{formatDate(customer.createdAt)}</span>
                      </td>
                      <td>
                        <div className="table-action-btns">
                          <Link
                            to={`/customers/edit/${customer.id}`}
                            className="btn btn-secondary btn-xs"
                            title="Edit Customer"
                          >
                            Edit
                          </Link>
                          <button
                            type="button"
                            className="btn btn-danger-outline btn-xs"
                            onClick={() => promptDeleteCustomer(customer)}
                            title="Delete Customer"
                          >
                            Delete
                          </button>
                          <Link
                            to={`/rentals/add`}
                            className="btn btn-outline btn-xs"
                            title="Create Rental for this customer"
                          >
                            + Rent
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default Customers;
