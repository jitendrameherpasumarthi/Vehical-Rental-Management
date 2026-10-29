export const API_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || "http://localhost:3000";

let activeApiUrl = API_URL;

// Generate prioritized candidate URLs for connection resilience
export const getCandidateUrls = () => {
  const urls = [activeApiUrl];
  if (activeApiUrl.includes('localhost')) {
    urls.push(activeApiUrl.replace('localhost', '127.0.0.1'));
  } else if (activeApiUrl.includes('127.0.0.1')) {
    urls.push(activeApiUrl.replace('127.0.0.1', 'localhost'));
  }
  // Also try relative URL (which leverages Vite dev proxy) if running in browser
  if (typeof window !== 'undefined' && !urls.includes('')) {
    urls.push('');
  }
  return [...new Set(urls)];
};

// Helper function to check if JSON Server is running and reachable
export const checkServerHealth = async () => {
  const candidateUrls = getCandidateUrls();

  for (const url of candidateUrls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const testUrl = url ? `${url}/vehicles` : '/vehicles';
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (response.ok) {
        activeApiUrl = url;
        return { ok: true, status: response.status, url };
      }
    } catch {
      // Try next candidate
    }
  }

  return {
    ok: false,
    status: 0,
    url: activeApiUrl,
    error: `JSON Server is not reachable at ${activeApiUrl || 'port 3000'}. Please start it with 'npm run server'.`,
  };
};

// Helper function to handle fetch responses and errors with multi-target fallback
const request = async (endpoint, options = {}) => {
  const candidateUrls = getCandidateUrls();
  let lastError = null;

  for (const baseUrl of candidateUrls) {
    const url = `${baseUrl}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
      }
      activeApiUrl = baseUrl;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      return null;
    } catch (error) {
      lastError = error;
      // If it is a server response error (not a network refusal), don't try other hosts
      const isNetworkError =
        error instanceof TypeError &&
        (error.message.includes('fetch') ||
          error.message.includes('NetworkError') ||
          error.message.includes('Failed') ||
          error.message.includes('aborted'));
      if (!isNetworkError) {
        throw error;
      }
      // Continue loop to try next candidate
    }
  }

  console.error(`API Error on [${options.method || 'GET'}] ${endpoint}:`, lastError);

  const enhancedError = new Error(
    `Cannot connect to JSON Server at ${activeApiUrl || 'http://localhost:3000'}. Ensure the server is running on port 3000 ('npm run server') and there are no port conflicts.`
  );
  enhancedError.cause = lastError;
  throw enhancedError;
};

// ==========================================
// Vehicle API Services
// ==========================================
export const getVehicles = async () => {
  return await request('/vehicles');
};

export const getVehicleById = async (id) => {
  return await request(`/vehicles/${id}`);
};

export const addVehicle = async (vehicle) => {
  return await request('/vehicles', {
    method: 'POST',
    body: JSON.stringify(vehicle),
  });
};

export const updateVehicle = async (id, vehicle) => {
  return await request(`/vehicles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(vehicle),
  });
};

export const deleteVehicle = async (id) => {
  return await request(`/vehicles/${id}`, {
    method: 'DELETE',
  });
};

// ==========================================
// Customer API Services
// ==========================================
export const getCustomers = async () => {
  return await request('/customers');
};

export const getCustomerById = async (id) => {
  return await request(`/customers/${id}`);
};

export const addCustomer = async (customer) => {
  return await request('/customers', {
    method: 'POST',
    body: JSON.stringify(customer),
  });
};

export const updateCustomer = async (id, customer) => {
  return await request(`/customers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(customer),
  });
};

export const deleteCustomer = async (id) => {
  return await request(`/customers/${id}`, {
    method: 'DELETE',
  });
};

// ==========================================
// Rental API Services
// ==========================================
export const getRentals = async () => {
  return await request('/rentals');
};

export const getRentalById = async (id) => {
  return await request(`/rentals/${id}`);
};

export const addRental = async (rental) => {
  return await request('/rentals', {
    method: 'POST',
    body: JSON.stringify(rental),
  });
};

export const updateRental = async (id, rental) => {
  return await request(`/rentals/${id}`, {
    method: 'PUT',
    body: JSON.stringify(rental),
  });
};

export const deleteRental = async (id) => {
  return await request(`/rentals/${id}`, {
    method: 'DELETE',
  });
};

export default {
  API_URL,
  checkServerHealth,
  getVehicles,
  getVehicleById,
  addVehicle,
  updateVehicle,
  deleteVehicle,
  getCustomers,
  getCustomerById,
  addCustomer,
  updateCustomer,
  deleteCustomer,
  getRentals,
  getRentalById,
  addRental,
  updateRental,
  deleteRental,
};
