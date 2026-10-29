

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, '');

const isProduction = import.meta.env.PROD;

const API_URL =
  configuredApiUrl || (isProduction ? '' : 'http://localhost:3000');


let activeApiUrl = API_URL;

// Build API candidates without sending production API requests
// to the GitHub Pages frontend.
export const getCandidateUrls = () => {
  if (configuredApiUrl) {
    return [configuredApiUrl];
  }

  if (isProduction) {
    return [];
  }

  const urls = [activeApiUrl || 'http://localhost:3000'];

  if (urls[0].includes('localhost')) {
    urls.push(urls[0].replace('localhost', '127.0.0.1'));
  } else if (urls[0].includes('127.0.0.1')) {
    urls.push(urls[0].replace('127.0.0.1', 'localhost'));
  }

  return [...new Set(urls)];
};

const createConfigurationError = () =>
  new Error(
    'Production API is not configured. Set VITE_API_URL to your publicly hosted JSON Server API URL, then rebuild and redeploy the frontend.'
  );

const createHttpError = async (response, url) => {
  const contentType = response.headers.get('content-type') || '';

  let details = '';

  if (contentType.includes('application/json')) {
    try {
      details = JSON.stringify(await response.json());
    } catch {
      details = response.statusText;
    }
  } else {
    // Avoid displaying a large HTML error page in the UI.
    details = response.statusText || 'The server returned a non-JSON response.';
  }

  return new Error(
    `API request failed: HTTP ${response.status} for ${url}. ${details}`
  );
};

const request = async (endpoint, options = {}) => {
  const candidateUrls = getCandidateUrls();

  if (candidateUrls.length === 0) {
    throw createConfigurationError();
  }

  let lastError;

  for (const baseUrl of candidateUrls) {
    const url = `${baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          Accept: 'application/json',
          ...(options.body ? { 'Content-Type': 'application/json' } : {}),
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw await createHttpError(response, url);
      }

      // DELETE requests commonly return 204 No Content.
      if (response.status === 204) {
        activeApiUrl = baseUrl;
        return null;
      }

      const contentType = response.headers.get('content-type') || '';

      if (!contentType.includes('application/json')) {
        throw new Error(
          `Expected JSON from ${url}, but received ${contentType || 'an unknown content type'}. Check your API URL.`
        );
      }

      activeApiUrl = baseUrl;
      return await response.json();
    } catch (error) {
      lastError = error;

      // Retry the alternate localhost address only for network failures.
      if (!(error instanceof TypeError)) {
        throw error;
      }
    }
  }

  console.error(`API error on ${options.method || 'GET'} ${endpoint}:`, lastError);

  throw new Error(
    `Cannot connect to the API. ${lastError?.message || 'Check the API server and network connection.'}`
  );
};

// Check whether the configured JSON Server API is available.
export const checkServerHealth = async () => {
  const candidateUrls = getCandidateUrls();

  if (candidateUrls.length === 0) {
    return {
      ok: false,
      status: 0,
      url: '',
      error:
        'Production API is not configured. Set VITE_API_URL to your hosted JSON Server API URL.',
    };
  }

  let lastError;

  for (const baseUrl of candidateUrls) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(`${baseUrl}/vehicles`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      if (!response.ok) {
        lastError = new Error(`HTTP ${response.status} from ${baseUrl}`);
        continue;
      }

      const contentType = response.headers.get('content-type') || '';

      if (!contentType.includes('application/json')) {
        lastError = new Error(`The API at ${baseUrl} did not return JSON.`);
        continue;
      }

      activeApiUrl = baseUrl;

      return {
        ok: true,
        status: response.status,
        url: baseUrl,
      };
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return {
    ok: false,
    status: 0,
    url: activeApiUrl,
    error:
      lastError?.message ||
      `The API is not reachable at ${activeApiUrl || 'the configured URL'}.`,
  };
};

// ==========================================
// Vehicle API Services
// ==========================================
export const getVehicles = () => request('/vehicles');

export const getVehicleById = (id) =>
  request(`/vehicles/${encodeURIComponent(id)}`);

export const addVehicle = (vehicle) =>
  request('/vehicles', {
    method: 'POST',
    body: JSON.stringify(vehicle),
  });

export const updateVehicle = (id, vehicle) =>
  request(`/vehicles/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(vehicle),
  });

export const deleteVehicle = (id) =>
  request(`/vehicles/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });

// ==========================================
// Customer API Services
// ==========================================
export const getCustomers = () => request('/customers');

export const getCustomerById = (id) =>
  request(`/customers/${encodeURIComponent(id)}`);

export const addCustomer = (customer) =>
  request('/customers', {
    method: 'POST',
    body: JSON.stringify(customer),
  });

export const updateCustomer = (id, customer) =>
  request(`/customers/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(customer),
  });

export const deleteCustomer = (id) =>
  request(`/customers/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });

// ==========================================
// Rental API Services
// ==========================================
export const getRentals = () => request('/rentals');

export const getRentalById = (id) =>
  request(`/rentals/${encodeURIComponent(id)}`);

export const addRental = (rental) =>
  request('/rentals', {
    method: 'POST',
    body: JSON.stringify(rental),
  });

export const updateRental = (id, rental) =>
  request(`/rentals/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(rental),
  });

export const deleteRental = (id) =>
  request(`/rentals/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });

// ==========================================
// Default export
// ==========================================
export default {
  API_URL,
  getCandidateUrls,
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
