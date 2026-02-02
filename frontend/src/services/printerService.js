/**
 * Printer Service - API calls per diagnostica stampante
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };
};

/**
 * Ottiene stato stampante e statistiche coda
 */
export const getStatus = async () => {
  const response = await fetch(`${API_URL}/printer/status`, {
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Errore recupero stato stampante');
  }

  return response.json();
};

/**
 * Ottiene coda stampe con filtri opzionali
 */
export const getQueue = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  const url = queryString ? `${API_URL}/printer/queue?${queryString}` : `${API_URL}/printer/queue`;

  const response = await fetch(url, {
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Errore recupero coda stampe');
  }

  return response.json();
};

/**
 * Esegue stampa di test
 */
export const testPrint = async () => {
  const response = await fetch(`${API_URL}/printer/test`, {
    method: 'POST',
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Errore stampa di test');
  }

  return response.json();
};

/**
 * Riprova stampa fallita
 */
export const retryJob = async (jobId) => {
  const response = await fetch(`${API_URL}/printer/retry/${jobId}`, {
    method: 'POST',
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Errore retry stampa');
  }

  return response.json();
};

/**
 * Cancella job dalla coda
 */
export const deleteJob = async (jobId) => {
  const response = await fetch(`${API_URL}/printer/queue/${jobId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Errore cancellazione job');
  }

  return response.json();
};

/**
 * Pulisce tutti i job falliti
 */
export const clearFailed = async () => {
  const response = await fetch(`${API_URL}/printer/clear-failed`, {
    method: 'POST',
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Errore pulizia job falliti');
  }

  return response.json();
};

export default {
  getStatus,
  getQueue,
  testPrint,
  retryJob,
  deleteJob,
  clearFailed
};
