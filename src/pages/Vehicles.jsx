import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getVehicles, deleteVehicle, getRentals } from '../services/api';
import { getVehicleDynamicStatus } from '../utils/rentalUtils';
import VehicleCard from '../components/VehicleCard';
import SearchBar from '../components/SearchBar';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import ConfirmModal from '../components/ConfirmModal';
import Toast from '../components/Toast';

function Vehicles() {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters and Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [fuelFilter, setFuelFilter] = useState('All');
  const [priceFilter, setPriceFilter] = useState('All');
  const [sortBy, setSortBy] = useState('name-asc');

  // Deletion Modal State
  const [vehicleToDelete, setVehicleToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast Notification State
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const fetchVehiclesData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [vehiclesData, rentalsData] = await Promise.all([
        getVehicles(),
        getRentals(),
      ]);
      setVehicles(vehiclesData || []);
      setRentals(rentalsData || []);
    } catch (err) {
      console.error('Error fetching vehicles:', err);
      setError(err.message || 'Failed to fetch vehicles from API. Please ensure JSON Server is running on port 3000.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVehiclesData();
  }, [fetchVehiclesData]);

  // Filtered and Sorted Vehicles list
  const filteredVehicles = useMemo(() => {
    return vehicles
      .filter((v) => {
        // Search term match across name, brand, registration number
        const term = searchTerm.toLowerCase().trim();
        const matchesSearch =
          !term ||
          (v.name && v.name.toLowerCase().includes(term)) ||
          (v.brand && v.brand.toLowerCase().includes(term)) ||
          (v.registrationNumber && v.registrationNumber.toLowerCase().includes(term));

        // Type filter
        const matchesType = typeFilter === 'All' || v.type === typeFilter;

        // Status filter using dynamic status based on existing rentals
        const dynamicStatus = getVehicleDynamicStatus(v, rentals);
        const matchesStatus = statusFilter === 'All' || dynamicStatus === statusFilter;

        // Fuel filter
        const matchesFuel = fuelFilter === 'All' || v.fuelType === fuelFilter;

        // Price filter
        const price = Number(v.pricePerDay) || 0;
        let matchesPrice = true;
        if (priceFilter === 'under-2000') {
          matchesPrice = price < 2000;
        } else if (priceFilter === '2000-3500') {
          matchesPrice = price >= 2000 && price <= 3500;
        } else if (priceFilter === '3500-5000') {
          matchesPrice = price > 3500 && price <= 5000;
        } else if (priceFilter === 'above-5000') {
          matchesPrice = price > 5000;
        }

        return matchesSearch && matchesType && matchesStatus && matchesFuel && matchesPrice;
      })
      .sort((a, b) => {
        if (sortBy === 'price-low') {
          return Number(a.pricePerDay) - Number(b.pricePerDay);
        }
        if (sortBy === 'price-high') {
          return Number(b.pricePerDay) - Number(a.pricePerDay);
        }
        if (sortBy === 'name-asc') {
          return (a.name || '').localeCompare(a.name || '');
        }
        if (sortBy === 'name-desc') {
          return (b.name || '').localeCompare(a.name || '');
        }
        return 0;
      });
  }, [vehicles, rentals, searchTerm, typeFilter, statusFilter, fuelFilter, priceFilter, sortBy]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setTypeFilter('All');
    setStatusFilter('All');
    setFuelFilter('All');
    setPriceFilter('All');
    setSortBy('name-asc');
  };

  const promptDeleteVehicle = (vehicle) => {
    // Check if vehicle has active rentals
    const hasActiveRentals = rentals.some(
      (r) => String(r.vehicleId) === String(vehicle.id) && r.status === 'Active'
    );

    if (hasActiveRentals) {
      setToast({
        message: `Cannot delete "${vehicle.name}" because it currently has active rental bookings.`,
        type: 'error',
      });
      return;
    }

    setVehicleToDelete(vehicle);
  };

  const handleConfirmDelete = async () => {
    if (!vehicleToDelete) return;
    setIsDeleting(true);
    try {
      await deleteVehicle(vehicleToDelete.id);
      setToast({
        message: `Vehicle "${vehicleToDelete.brand} ${vehicleToDelete.name}" deleted successfully.`,
        type: 'success',
      });
      setVehicleToDelete(null);
      // Refresh list
      await fetchVehiclesData();
    } catch (err) {
      console.error('Error deleting vehicle:', err);
      setToast({
        message: 'Failed to delete vehicle from the server. Please try again.',
        type: 'error',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="vehicles-page">
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'success' })}
      />

      <ConfirmModal
        isOpen={Boolean(vehicleToDelete)}
        title="Delete Vehicle"
        message={`Are you sure you want to delete ${vehicleToDelete?.brand} ${vehicleToDelete?.name} (${vehicleToDelete?.registrationNumber})? This action cannot be undone.`}
        confirmText={isDeleting ? 'Deleting...' : 'Delete Vehicle'}
        confirmVariant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setVehicleToDelete(null)}
      />

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Fleet Vehicles</h1>
          <p className="page-subtitle">
            Manage your rental inventory, pricing, availability, and vehicle details.
          </p>
        </div>
        <div className="header-actions">
          <Link to="/vehicles/add" className="btn btn-primary">
            + Add New Vehicle
          </Link>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="filters-card">
        <SearchBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          placeholder="Search by vehicle name, brand, or registration number..."
          filters={[
            {
              label: 'Type:',
              value: typeFilter,
              onChange: setTypeFilter,
              options: [
                { label: 'All Types', value: 'All' },
                { label: 'Car', value: 'Car' },
                { label: 'SUV', value: 'SUV' },
                { label: 'Motorcycle', value: 'Motorcycle' },
                { label: 'Luxury', value: 'Luxury' },
                { label: 'Van / MPV', value: 'Van' },
                { label: 'Truck', value: 'Truck' },
              ],
            },
            {
              label: 'Status:',
              value: statusFilter,
              onChange: setStatusFilter,
              options: [
                { label: 'All Statuses', value: 'All' },
                { label: 'Available', value: 'Available' },
                { label: 'Rented', value: 'Rented' },
                { label: 'Maintenance', value: 'Maintenance' },
              ],
            },
            {
              label: 'Fuel:',
              value: fuelFilter,
              onChange: setFuelFilter,
              options: [
                { label: 'All Fuels', value: 'All' },
                { label: 'Petrol', value: 'Petrol' },
                { label: 'Diesel', value: 'Diesel' },
                { label: 'Electric', value: 'Electric' },
                { label: 'Hybrid', value: 'Hybrid' },
                { label: 'CNG', value: 'CNG' },
              ],
            },
            {
              label: 'Price:',
              value: priceFilter,
              onChange: setPriceFilter,
              options: [
                { label: 'All Prices', value: 'All' },
                { label: 'Under ₹2,000 / day', value: 'under-2000' },
                { label: '₹2,000 - ₹3,500 / day', value: '2000-3500' },
                { label: '₹3,500 - ₹5,000 / day', value: '3500-5000' },
                { label: 'Above ₹5,000 / day', value: 'above-5000' },
              ],
            },
            {
              label: 'Sort By:',
              value: sortBy,
              onChange: setSortBy,
              options: [
                { label: 'Name (A to Z)', value: 'name-asc' },
                { label: 'Name (Z to A)', value: 'name-desc' },
                { label: 'Price (Low to High)', value: 'price-low' },
                { label: 'Price (High to Low)', value: 'price-high' },
              ],
            },
          ]}
          onReset={handleResetFilters}
        />
      </div>

      {/* Content Area */}
      {isLoading ? (
        <Loading message="Loading fleet vehicles..." size="large" />
      ) : error ? (
        <div className="error-card">
          <span className="error-icon">⚠️</span>
          <h3>Error Loading Vehicles</h3>
          <p>{error}</p>
          <button type="button" className="btn btn-primary" onClick={fetchVehiclesData}>
            Retry
          </button>
        </div>
      ) : filteredVehicles.length === 0 ? (
        <EmptyState
          icon="🚗"
          title={vehicles.length === 0 ? 'No Vehicles in Fleet' : 'No Matching Vehicles'}
          description={
            vehicles.length === 0
              ? 'Get started by adding your first vehicle to the rental portal.'
              : 'Try adjusting your search criteria or resetting filters.'
          }
          actionLabel={vehicles.length === 0 ? '+ Add New Vehicle' : 'Reset Filters'}
          onAction={vehicles.length === 0 ? () => navigate('/vehicles/add') : handleResetFilters}
        />
      ) : (
        <div className="vehicles-grid">
          {filteredVehicles.map((vehicle) => (
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              rentals={rentals}
              onDelete={promptDeleteVehicle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default Vehicles;
