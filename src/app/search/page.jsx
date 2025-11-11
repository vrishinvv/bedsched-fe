'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Notification from '@/components/Notification';
import CameraCapture from '@/components/CameraCapture';
import DeallocateModal from '@/components/DeallocateModal';

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
  const [hasSearched, setHasSearched] = useState(false);
  const [showDeallocateModal, setShowDeallocateModal] = useState(false);
  const [deallocatingAllocation, setDeallocatingAllocation] = useState(null);
  const [deallocating, setDeallocating] = useState(false);
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'deallocated'

  // Phone number validation
  const isValidPhone = phoneNumber.length === 10 && /^\d{10}$/.test(phoneNumber);
  const showPhoneError = phoneNumber.length > 0 && !isValidPhone;

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
    
    if (!isValidPhone) return;
    
    // Clear previous notification
    setNotification(null);
    setHasSearched(true);

    setLoading(true);
    setResults([]);
    try {
      const response = await fetch(`${API_BASE_URL}/api/allocations/by-phone/${phoneNumber}`, {
        headers: authHeaders(),
      });

      if (!response.ok) {
        if (response.status === 404) {
          setNotification({ type: 'error', message: 'No bookings found for this phone number' });
          return;
        }
        throw new Error('Search failed');
      }

      const data = await response.json();
      
      if (data.length === 0) {
        setNotification({ type: 'info', message: 'No bookings found for this phone number' });
        setResults([]);
      } else {
        setResults(data);
      }
    } catch (error) {
      console.error('Search error:', error);
      setNotification({ type: 'error', message: error.message || 'Failed to search. Please try again.' });
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [phoneNumber, isValidPhone]);

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

  // Filter results based on active tab
  const filteredResults = useMemo(() => {
    if (activeTab === 'active') {
      return results.filter(r => !r.deleted_at);
    } else {
      return results.filter(r => r.deleted_at);
    }
  }, [results, activeTab]);

  const startDeallocate = useCallback((allocation) => {
    setDeallocatingAllocation(allocation);
    setShowDeallocateModal(true);
  }, []);

  const handleDeallocateConfirm = useCallback(async (wasOccupied, reason) => {
    if (!deallocatingAllocation) return;

    setDeallocating(true);
    setShowDeallocateModal(false);

    try {
      const response = await fetch(`${API_BASE_URL}/api/locations/${deallocatingAllocation.location_id}/tents/${deallocatingAllocation.tent_index}/blocks/${deallocatingAllocation.block_index}/beds/${deallocatingAllocation.bed_number}`, {
        method: 'DELETE',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ wasOccupied, reason }),
      });

      if (!response.ok) throw new Error('Failed to deallocate');

      const reasonText = reason === 'left_early' ? 'left early' : reason === 'no_show' ? 'no-show' : 'booking error';
      setNotification({ type: 'success', message: `Bed ${deallocatingAllocation.bed_number} deallocated successfully (${deallocatingAllocation.name} - ${reasonText})` });

      // Refresh search results
      searchByPhone({ preventDefault: () => {} });
    } catch (error) {
      console.error('Deallocate error:', error);
      setNotification({ type: 'error', message: error.message || 'Failed to deallocate bed' });
    } finally {
      setDeallocating(false);
      setDeallocatingAllocation(null);
    }
  }, [deallocatingAllocation, searchByPhone]);

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
              <div className="min-h-[52px]">
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="Enter 10-digit phone number"
                  inputMode="numeric"
                  maxLength={10}
                  className="w-full p-3 border border-gray-600 bg-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                />
                {showPhoneError && (
                  <p className="text-red-400 text-xs mt-1">Please enter a valid 10-digit phone number</p>
                )}
              </div>
            </div>
            <div className="flex items-start pt-7">
              <button
                type="submit"
                disabled={loading || !isValidPhone}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
              >
                {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                Search
              </button>
            </div>
          </div>
        </form>

        {/* Tabs */}
        {results.length > 0 && (
          <div className="flex gap-2 mb-6 border-b border-gray-700">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-4 py-2 font-medium transition-colors relative ${
                activeTab === 'active'
                  ? 'text-blue-400'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Active Bookings
              {activeTab === 'active' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab('deallocated')}
              className={`px-4 py-2 font-medium transition-colors relative ${
                activeTab === 'deallocated'
                  ? 'text-blue-400'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Deallocated
              {activeTab === 'deallocated' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400"></div>
              )}
            </button>
          </div>
        )}

        {/* No Results Message */}
        {!loading && hasSearched && results.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-lg font-medium text-gray-300">No bookings found</p>
            <p className="text-sm text-gray-500 mt-2">No results found for this phone number</p>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white mb-4">
              {activeTab === 'active' ? 'Active' : 'Deallocated'} Bookings ({filteredResults.length})
            </h2>

            {filteredResults.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p>No {activeTab === 'active' ? 'active' : 'deallocated'} bookings found</p>
              </div>
            ) : (
              filteredResults.map((allocation) => (
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
                          {allocation.tent_index && ` • ${allocation.tent_name || `Tent ${String.fromCharCode(64 + allocation.tent_index)}`} ${allocation.block_name || `Block ${allocation.block_index}`}`}
                        </p>
                        {allocation.deleted_at && (
                          <p className="text-xs text-red-400 mt-1">
                            ⚠️ This booking has been deallocated
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit(allocation)}
                          disabled={allocation.deleted_at}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => startDeallocate(allocation)}
                          disabled={deallocating || allocation.deleted_at}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          🗑️ Deallocate
                        </button>
                      </div>
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
                          allocation.deleted_at ? 'bg-red-100 text-red-800' :
                          allocation.status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {allocation.deleted_at ? 'Deallocated' : allocation.status}
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
            ))
            )}
          </div>
        )}
      </div>

      <DeallocateModal
        open={showDeallocateModal}
        onClose={() => {
          setShowDeallocateModal(false);
          setDeallocatingAllocation(null);
        }}
        onConfirm={handleDeallocateConfirm}
        personName={deallocatingAllocation?.name || 'guest'}
      />
    </>
  );
}
