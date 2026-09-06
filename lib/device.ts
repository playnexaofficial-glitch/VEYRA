/**
 * Device ID utility for VEYRA Intelligence.
 * Generates and persists a standard UUID v4 in localStorage on first app load.
 */

const STORAGE_KEY = 'veyra_device_id';

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return '';

  try {
    let id = localStorage.getItem(STORAGE_KEY);
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    // If not found or invalid format, generate a new UUID
    if (!id || !uuidRegex.test(id)) {
      id = generateUUID();
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch (err) {
    console.warn('Could not access localStorage for device_id:', err);
    return generateUUID();
  }
}
