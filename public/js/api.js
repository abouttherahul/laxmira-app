// API Helper - Automatically includes auth token in all requests

function apiFetch(url, options = {}) {
  const token = localStorage.getItem("token");
  
  // Set default headers
  const headers = {
    "Content-Type": "application/json",
    ...options.headers
  };
  
  // Add Authorization header if token exists
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  // Merge options
  const fetchOptions = {
    ...options,
    headers
  };
  
  return fetch(url, fetchOptions);
}

// Helper for JSON requests
async function apiJson(url, options = {}) {
  const res = await apiFetch(url, options);
  
  // If unauthorized, redirect to login
  if (res.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "/";
    throw new Error("Unauthorized");
  }
  
  return res.json();
}

