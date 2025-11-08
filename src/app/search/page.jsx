'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Notification from '@/components/Notification';
import CameraCapture from '@/components/CameraCapture';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function getToken() {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem('bs_token');
  } catch {
    return null;
  }
}

function authHeaders(extra = {}) {
  const token = getToken();
  return {
    ...(extra || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export default function SearchPage() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editPhotos, setEditPhotos] = useState({ person: {}, aadhaar: {} });
  const [notification, setNotification] = useState(null);

  const MIN_DATE = '2025-11-03';
  const MAX_DATE = '2025-11-24';

  // Memoized validation function
  const errors = useMemo(() => {
    if (!editingId) return {};

    const newErrors = {};

    if (!editForm.name?.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!editForm.phone || editForm.phone.length !== 10) {
      newErrors.phone = 'Valid 10-digit phone number is required';
    }

    const emergencyDigits = editForm.emergencyPhone?.replace(/\D/g, '');
    if (emergencyDigits && emergencyDigits.length !== 10) {
      newErrors.emergencyPhone = 'Valid 10-digit phone number is required';
    }

    if (!editForm.gender) {
      newErrors.gender = 'Gender is required';
    }

    if (!editForm.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (!editForm.endDate) {
      newErrors.endDate = 'End date is required';
    }

    if (editForm.startDate && editForm.endDate && new Date(editForm.startDate) > new Date(editForm.endDate)) {
      newErrors.endDate = 'End date must be after start date';
    }

    const hasPersonPhoto = editPhotos.person?.blob || editPhotos.person?.dataUrl;

    if (!hasPersonPhoto) {
      newErrors.personPhoto = 'Person photo is required';
    }

    return newErrors;
  }, [editingId, editForm.name, editForm.phone, editForm.emergencyPhone, editForm.gender, editForm.startDate, editForm.endDate, editPhotos.person, editPhotos.aadhaar]);

  const isFormValid = editingId && Object.keys(errors).length === 0;

  const searchByPhone = useCallback(async (e) => {
    e.preventDefault();
    
    if (!/^\d{10}$/.test(phoneNumber)) {
      setNotification({ type: 'error', message: 'Please enter a valid 10-digit phone number' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/allocations/by-phone/${phoneNumber}`, {
        headers: authHeaders(),
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setResults(data);
      
      if (data.length === 0) {
        setNotification({ type: 'info', message: 'No bookings found for this phone number' });
      }
    } catch (error) {
      console.error('Search error:', error);
      setNotification({ type: 'error', message: 'Failed to search. Please try again.' });
    } finally {
      setLoading(false);
    }
  }, [phoneNumber]);

  const startEdit = useCallback((allocation) => {
    setEditingId(allocation.id);
    setEditForm({
      name: allocation.name,
      phone: allocation.phone,
      emergencyPhone: allocation.emergency_phone || '',
      gender: allocation.gender,
      startDate: allocation.start_date,
      endDate: allocation.end_date,
    });
    setEditPhotos({
      person: { blob: null, dataUrl: allocation.personPhotoUrl },
      aadhaar: { blob: null, dataUrl: allocation.aadhaarPhotoUrl },
    });
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditForm({});
    setEditPhotos({ person: {}, aadhaar: {} });
  }, []);

  const uploadPhotoToS3 = useCallback(async (blob, photoType, locationId, tentIndex, blockIndex, name, bedNumber) => {
    const response = await fetch(`${API_BASE_URL}/api/upload-url`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ photoType, locationId, tentIndex, blockIndex, name, bedNumber }),
    });

    if (!response.ok) throw new Error('Failed to get upload URL');

    const { uploadUrl, key } = await response.json();

    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      body: blob,
      headers: { 'Content-Type': 'image/jpeg' },
    });

    if (!uploadResponse.ok) throw new Error('Failed to upload to S3');

    return { key };
  }, []);

  const saveEdit = useCallback(async (allocation) => {
    setSaving(true);
    try {
      // Upload new photos if captured
      let personPhotoKey = allocation.person_photo_key;
      let aadhaarPhotoKey = allocation.aadhaar_photo_key;

      if (editPhotos.person.blob) {
        const result = await uploadPhotoToS3(
          editPhotos.person.blob,
          'person',
          allocation.location_id,
          allocation.tent_index || 0,
          allocation.block_index || 0,
          editForm.name || allocation.name,
          allocation.bed_number
        );
        personPhotoKey = result.key;
      }

      if (editPhotos.aadhaar.blob) {
        const result = await uploadPhotoToS3(
          editPhotos.aadhaar.blob,
          'aadhaar',
          allocation.location_id,
          allocation.tent_index || 0,
          allocation.block_index || 0,
          editForm.name || allocation.name,
          allocation.bed_number
        );
        aadhaarPhotoKey = result.key;
      }

      // Update allocation
      const response = await fetch(`${API_BASE_URL}/api/allocations/${allocation.id}`, {
        method: 'PATCH',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          ...editForm,
          personPhotoKey,
          aadhaarPhotoKey,
        }),
      });

      if (!response.ok) throw new Error('Update failed');

      setNotification({ type: 'success', message: 'Booking updated successfully!' });
      setEditingId(null);
      
      // Refresh results
      searchByPhone({ preventDefault: () => {} });
    } catch (error) {
      console.error('Save error:', error);
      setNotification({ type: 'error', message: 'Failed to save changes' });
    } finally {
      setSaving(false);
    }
  }, [editForm, editPhotos, uploadPhotoToS3, searchByPhone]);

  // Memoized input handlers
  const handleNameChange = useCallback((e) => {
    setEditForm(prev => ({ ...prev, name: e.target.value }));
  }, []);

  const handlePhoneChange = useCallback((e) => {
    setEditForm(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }));
  }, []);

  const handleEmergencyPhoneChange = useCallback((e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
    setEditForm(prev => ({ ...prev, emergencyPhone: digits }));
  }, []);

  const handleGenderChange = useCallback((e) => {
    setEditForm(prev => ({ ...prev, gender: e.target.value }));
  }, []);

  const handleStartDateChange = useCallback((e) => {
    setEditForm(prev => ({ ...prev, startDate: e.target.value }));
  }, []);

  const handleEndDateChange = useCallback((e) => {
    setEditForm(prev => ({ ...prev, endDate: e.target.value }));
  }, []);

  const handlePersonPhotoCapture = useCallback((blob, dataUrl) => {
    setEditPhotos(prev => ({ ...prev, person: { blob, dataUrl } }));
  }, []);

  const handleAadhaarPhotoCapture = useCallback((blob, dataUrl) => {
    setEditPhotos(prev => ({ ...prev, aadhaar: { blob, dataUrl } }));
  }, []);

  return (
    <>
      {notification && (
        <Notification
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}

      <div>
        {/* Page Header */}
        <section className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-900/20 via-indigo-900/20 to-purple-900/20 border border-blue-500/20 p-4 sm:p-6 mb-6">
          <div className="relative">
            <h2 className="text-2xl sm:text-3xl font-bold mb-2 bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-transparent">
              Search Bookings
            </h2>
            <p className="text-sm sm:text-base text-blue-200/80">Find and manage allocations by phone number</p>
          </div>
        </section>

        {/* Search Form */}
        <form onSubmit={searchByPhone} className="mb-8 bg-gray-900/50 backdrop-blur border border-white/10 rounded-lg shadow-md p-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="Enter 10-digit phone number"
                inputMode="numeric"
                maxLength={10}
                className="w-full p-3 border border-gray-600 bg-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
              >
                {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                Search
              </button>
            </div>
          </div>
        </form>

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white mb-4">
              Found {results.length} booking{results.length !== 1 ? 's' : ''}
            </h2>

            {results.map((allocation) => (
              <div key={allocation.id} className="bg-gray-900/50 backdrop-blur border border-white/10 rounded-lg shadow-md p-6">
                {editingId === allocation.id ? (
                  /* Edit Mode */
                  <div className="space-y-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-white">Edit Booking</h3>
                      <div className="flex gap-2">
                        <button
                          onClick={cancelEdit}
                          className="px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-800 text-gray-200"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => saveEdit(allocation)}
                          disabled={!isFormValid || saving}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                          {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-200 mb-1">Name *</label>
                        <input
                          value={editForm.name}
                          onChange={handleNameChange}
                          required
                          className={`w-full p-2 border rounded-lg bg-gray-800 text-white ${errors.name ? 'border-red-500' : 'border-gray-600'}`}
                        />
                        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-200 mb-1">Phone *</label>
                        <input
                          type="tel"
                          inputMode="numeric"
                          value={editForm.phone}
                          onChange={handlePhoneChange}
                          maxLength={10}
                          required
                          className={`w-full p-2 border rounded-lg bg-gray-800 text-white ${errors.phone ? 'border-red-500' : 'border-gray-600'}`}
                        />
                        {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-200 mb-1">Emergency Phone</label>
                        <input
                          type="tel"
                          inputMode="numeric"
                          value={editForm.emergencyPhone}
                          onChange={handleEmergencyPhoneChange}
                          maxLength={10}
                          className={`w-full p-2 border rounded-lg bg-gray-800 text-white placeholder-gray-500 ${errors.emergencyPhone ? 'border-red-500' : 'border-gray-600'}`}
                          placeholder="10-digit phone"
                        />
                        {errors.emergencyPhone && <p className="text-red-500 text-xs mt-1">{errors.emergencyPhone}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-200 mb-1">Gender *</label>
                        <select
                          value={editForm.gender}
                          onChange={handleGenderChange}
                          required
                          className={`w-full p-2 border rounded-lg bg-gray-800 text-white ${errors.gender ? 'border-red-500' : 'border-gray-600'}`}
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                        {errors.gender && <p className="text-red-500 text-xs mt-1">{errors.gender}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-200 mb-1">Start Date *</label>
                        <input
                          type="date"
                          value={editForm.startDate}
                          onChange={handleStartDateChange}
                          min={MIN_DATE}
                          max={MAX_DATE}
                          required
                          className={`w-full p-2 border rounded-lg bg-gray-800 text-white ${errors.startDate ? 'border-red-500' : 'border-gray-600'}`}
                        />
                        {errors.startDate && <p className="text-red-500 text-xs mt-1">{errors.startDate}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-200 mb-1">End Date *</label>
                        <input
                          type="date"
                          value={editForm.endDate}
                          onChange={handleEndDateChange}
                          min={editForm.startDate || MIN_DATE}
                          max={MAX_DATE}
                          required
                          className={`w-full p-2 border rounded-lg bg-gray-800 text-white ${errors.endDate ? 'border-red-500' : 'border-gray-600'}`}
                        />
                        {errors.endDate && <p className="text-red-500 text-xs mt-1">{errors.endDate}</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                      <div>
                        <CameraCapture
                          label="Person Photo *"
                          onCapture={handlePersonPhotoCapture}
                          existingPhotoUrl={editPhotos.person.dataUrl}
                        />
                        {errors.personPhoto && <p className="text-red-500 text-xs mt-1">{errors.personPhoto}</p>}
                      </div>
                      <div>
                        <CameraCapture
                          label="Identity Photo"
                          onCapture={handleAadhaarPhotoCapture}
                          existingPhotoUrl={editPhotos.aadhaar.dataUrl}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* View Mode */
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{allocation.name}</h3>
                        <p className="text-sm text-gray-300">
                          {allocation.location_name} • Bed {allocation.bed_number}
                          {allocation.tent_index && ` • ${allocation.tent_name || `Tent ${allocation.tent_index}`} ${allocation.block_name || `Block ${allocation.block_index}`}`}
                        </p>
                      </div>
                      <button
                        onClick={() => startEdit(allocation)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        ✏️ Edit
                      </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-400">Phone</p>
                        <p className="font-medium text-white">{allocation.phone}</p>
                      </div>
                      {allocation.emergency_phone && (
                        <div>
                          <p className="text-xs text-gray-400">Emergency Phone</p>
                          <p className="font-medium text-white">{allocation.emergency_phone}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-gray-400">Gender</p>
                        <p className="font-medium text-white">{allocation.gender}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Start Date</p>
                        <p className="font-medium text-white">{allocation.start_date}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">End Date</p>
                        <p className="font-medium text-white">{allocation.end_date}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-gray-400">Status</p>
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          allocation.status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {allocation.status}
                        </span>
                      </div>
                    </div>

                    {/* Photos */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      {allocation.personPhotoUrl && (
                        <div>
                          <p className="text-xs text-gray-400 mb-2">Person Photo</p>
                          <img
                            src={allocation.personPhotoUrl}
                            alt="Person"
                            className="w-full rounded-lg border border-gray-600"
                          />
                        </div>
                      )}
                      {allocation.aadhaarPhotoUrl && (
                        <div>
                          <p className="text-xs text-gray-400 mb-2">Identity Photo</p>
                          <img
                            src={allocation.aadhaarPhotoUrl}
                            alt="Identity"
                            className="w-full rounded-lg border border-gray-600"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
