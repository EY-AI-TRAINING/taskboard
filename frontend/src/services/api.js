import axios from 'axios'

// Single axios instance for the whole app. Module 02 adds an auth-token
// interceptor here; for Module 01 it is just a configured base URL.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
})

export default api
