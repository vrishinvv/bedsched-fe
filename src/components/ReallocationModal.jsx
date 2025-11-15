'use client';
import { useEffect, useState } from 'react';
import Skeleton from '@/components/Skeleton';

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
    'Content-Type': 'application/json',
    ...(extra || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// Format date to IST (dd/mm/yyyy)
function formatDateIST(dateString) {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
}

export default function ReallocationModal({
  open,
  onClose,
  allocationId,
  currentAllocation, // { name, location, tent, block, bed, startDate, endDate }
  onReallocate,
  pending = false,
}) {
  const [step, setStep] = useState(1); // 1=location, 2=tent, 3=block, 4=bed
  const [loading, setLoading] = useState(false);
  
  // Selection state
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedTent, setSelectedTent] = useState(null);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [selectedBed, setSelectedBed] = useState(null);
  
  // Options state
  const [locations, setLocations] = useState([]);
  const [tents, setTents] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [availableBeds, setAvailableBeds] = useState([]);
  
  // Allocation info for display
  const [allocationInfo, setAllocationInfo] = useState(null);

  useEffect(() => {
    if (open && allocationId) {
      // Reset state when modal opens
      setStep(1);
      setSelectedLocation(null);
      setSelectedTent(null);
      setSelectedBlock(null);
      setSelectedBed(null);
      setLocations([]);
      setTents([]);
      setBlocks([]);
      setAvailableBeds([]);
      
      // Load locations
      loadOptions();
    }
  }, [open, allocationId]);

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape' && !pending) onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, pending]);

  if (!open) return null;

  async function loadOptions(locationId, tentId, blockId) {
    if (!allocationId) {
      console.error('Cannot load options: allocationId is missing');
      return;
    }
    
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (locationId) params.append('location_id', locationId);
      if (tentId) params.append('tent_id', tentId);
      if (blockId) params.append('block_id', blockId);

      const response = await fetch(
        `${API_BASE_URL}/api/allocations/${allocationId}/reallocate-options?${params}`,
        {
          headers: authHeaders(),
        }
      );

      if (!response.ok) throw new Error('Failed to load options');

      const data = await response.json();
      
      // Store allocation info
      if (data.allocation) {
        setAllocationInfo(data.allocation);
      }

      // Update state based on step
      if (data.step === 'locations') {
        setLocations(data.locations || []);
      } else if (data.step === 'tents') {
        setTents(data.tents || []);
      } else if (data.step === 'blocks') {
        setBlocks(data.blocks || []);
      } else if (data.step === 'beds') {
        setAvailableBeds(data.available_beds || []);
      }
    } catch (error) {
      console.error('Failed to load options:', error);
      alert('Failed to load options. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleLocationSelect(location) {
    setSelectedLocation(location);
    setSelectedTent(null);
    setSelectedBlock(null);
    setSelectedBed(null);
    setStep(2);
    loadOptions(location.id);
  }

  function handleTentSelect(tent) {
    setSelectedTent(tent);
    setSelectedBlock(null);
    setSelectedBed(null);
    setStep(3);
    loadOptions(selectedLocation.id, tent.id);
  }

  function handleBlockSelect(block) {
    setSelectedBlock(block);
    setSelectedBed(null);
    setStep(4);
    loadOptions(selectedLocation.id, selectedTent.id, block.id);
  }

  function handleBedSelect(bedNumber) {
    setSelectedBed(bedNumber);
  }

  function handleBack() {
    if (step === 2) {
      setStep(1);
      setSelectedLocation(null);
      loadOptions();
    } else if (step === 3) {
      setStep(2);
      setSelectedTent(null);
      loadOptions(selectedLocation.id);
    } else if (step === 4) {
      setStep(3);
      setSelectedBlock(null);
      loadOptions(selectedLocation.id, selectedTent.id);
    }
  }

  async function handleConfirmReallocation() {
    if (!selectedLocation || !selectedTent || !selectedBlock || !selectedBed) {
      return alert('Please select all options before confirming');
    }

    try {
      await onReallocate({
        newLocationId: selectedLocation.id,
        newTentId: selectedTent.id,
        newBlockId: selectedBlock.id,
        newBedNumber: selectedBed,
      });
    } catch (error) {
      console.error('Reallocation failed:', error);
      // Error is handled in parent
    }
  }

  const canConfirm = selectedLocation && selectedTent && selectedBlock && selectedBed;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-black/40" onClick={!pending ? onClose : undefined} />
      <div className="relative w-full max-w-3xl max-h-[95vh] sm:max-h-[90vh] flex flex-col rounded-lg sm:rounded-2xl bg-white shadow-xl overflow-hidden">
        
        {/* Loading overlay */}
        {pending && (
          <div className="absolute inset-0 bg-white/95 rounded-2xl flex flex-col items-center justify-center z-10 p-8">
            <div className="flex flex-col items-center gap-3 mb-6">
              <div className="relative w-16 h-16">
                <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              </div>
              <span className="text-gray-700 font-medium text-center">
                Reallocating bed...
              </span>
            </div>
          </div>
        )}

        <div className="overflow-y-auto flex-1 p-4 sm:p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            Reallocate Bed
          </h3>

          {/* Current allocation info */}
          <div className="mb-4 sm:mb-6 p-3 sm:p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg sm:rounded-xl border-2 border-blue-200 shadow-sm">
            <div className="flex items-start gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-blue-500 rounded-lg flex-shrink-0">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 mb-2 sm:mb-3 text-sm sm:text-base">Current Allocation</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
                  <div>
                    <span className="text-gray-600">Name:</span>
                    <div className="font-semibold text-gray-900 truncate">{currentAllocation?.name}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Bed:</span>
                    <div className="font-semibold text-gray-900">#{currentAllocation?.bed}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Location:</span>
                    <div className="font-medium text-gray-800 truncate">{currentAllocation?.location}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Tent:</span>
                    <div className="font-medium text-gray-800 truncate">{currentAllocation?.tent}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Block:</span>
                    <div className="font-medium text-gray-800 truncate">{currentAllocation?.block}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Dates (IST):</span>
                    <div className="font-medium text-gray-800">{formatDateIST(currentAllocation?.startDate)} to {formatDateIST(currentAllocation?.endDate)}</div>
                  </div>
                  {currentAllocation?.createdAt && (
                    <div className="col-span-1 sm:col-span-2">
                      <span className="text-gray-600">Created:</span>
                      <div className="font-medium text-gray-800">{formatDateIST(currentAllocation.createdAt.split('T')[0])} at {new Date(currentAllocation.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Breadcrumb */}
          <div className="mb-4 sm:mb-6 flex items-center justify-between gap-1 sm:gap-2 text-xs sm:text-sm">
            <div className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md sm:rounded-lg ${step >= 1 ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
              <span className="font-semibold">1</span>
              <span className="hidden xs:inline">Location</span>
            </div>
            <div className={`h-0.5 flex-1 ${step >= 2 ? 'bg-blue-500' : 'bg-gray-200'}`}></div>
            <div className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md sm:rounded-lg ${step >= 2 ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
              <span className="font-semibold">2</span>
              <span className="hidden xs:inline">Tent</span>
            </div>
            <div className={`h-0.5 flex-1 ${step >= 3 ? 'bg-blue-500' : 'bg-gray-200'}`}></div>
            <div className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md sm:rounded-lg ${step >= 3 ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
              <span className="font-semibold">3</span>
              <span className="hidden xs:inline">Block</span>
            </div>
            <div className={`h-0.5 flex-1 ${step >= 4 ? 'bg-blue-500' : 'bg-gray-200'}`}></div>
            <div className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md sm:rounded-lg ${step >= 4 ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
              <span className="font-semibold">4</span>
              <span className="hidden xs:inline">Bed</span>
            </div>
          </div>

          {/* Selection summary */}
          {(selectedLocation || selectedTent || selectedBlock || selectedBed) && (
            <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-2 border-green-200 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="font-semibold text-green-900">New Location Selected</div>
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                {selectedLocation && (
                  <div className="px-3 py-1.5 bg-white rounded-lg border border-green-300 text-green-800 font-medium">
                    📍 {selectedLocation.name}
                  </div>
                )}
                {selectedTent && (
                  <div className="px-3 py-1.5 bg-white rounded-lg border border-green-300 text-green-800 font-medium">
                    ⛺ {selectedTent.name}
                  </div>
                )}
                {selectedBlock && (
                  <div className="px-3 py-1.5 bg-white rounded-lg border border-green-300 text-green-800 font-medium">
                    🏗️ {selectedBlock.name}
                  </div>
                )}
                {selectedBed && (
                  <div className="px-3 py-1.5 bg-white rounded-lg border border-green-300 text-green-800 font-medium">
                    🛏️ Bed #{selectedBed}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 1: Select Location */}
          {step === 1 && (
            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-3">Select Location</h4>
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : locations.length === 0 ? (
                <div className="p-4 text-center text-gray-500">No locations available</div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {locations.map((location) => (
                    <button
                      key={location.id}
                      onClick={() => handleLocationSelect(location)}
                      className="group p-4 text-left border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-md transition-all duration-200 bg-white"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{location.name}</div>
                          <div className="text-sm text-gray-500 mt-1">Capacity: {location.capacity} beds</div>
                        </div>
                        <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Select Tent */}
          {step === 2 && (
            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-3">Select Tent in {selectedLocation?.name}</h4>
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : tents.length === 0 ? (
                <div className="p-4 text-center text-gray-500">No tents available</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {tents.map((tent) => (
                    <button
                      key={tent.id}
                      onClick={() => handleTentSelect(tent)}
                      className="group p-4 text-left border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-md transition-all duration-200 bg-white"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{tent.name}</div>
                        <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                      <div className="flex gap-3 text-xs text-gray-600">
                        <span className="px-2 py-1 bg-gray-100 rounded">📏 {tent.size} beds</span>
                        <span className="px-2 py-1 bg-gray-100 rounded">🏗️ {tent.block_count} blocks</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Select Block */}
          {step === 3 && (
            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-3">Select Block in {selectedTent?.name}</h4>
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : blocks.length === 0 ? (
                <div className="p-4 text-center text-gray-500">No blocks available</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {blocks.map((block) => (
                    <button
                      key={block.id}
                      onClick={() => handleBlockSelect(block)}
                      className="group p-4 text-left border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-md transition-all duration-200 bg-white"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{block.name}</div>
                        <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                      <div className="flex gap-3 text-xs text-gray-600">
                        <span className="px-2 py-1 bg-gray-100 rounded">📏 {block.size} beds</span>
                        {block.gender_restriction && block.gender_restriction !== 'both' && (
                          <span className={`px-2 py-1 rounded ${block.gender_restriction === 'male_only' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
                            {block.gender_restriction === 'male_only' ? '♂️ Male only' : '♀️ Female only'}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Select Bed */}
          {step === 4 && (
            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-3">
                Select Available Bed in {selectedBlock?.name}
              </h4>
              {loading ? (
                <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
                  {[...Array(20)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : availableBeds.length === 0 ? (
                <div className="p-6 text-center">
                  <svg className="w-16 h-16 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-gray-500 font-medium">No available beds for the date range</div>
                  <div className="text-sm text-gray-400 mt-1">
                    Dates: {formatDateIST(currentAllocation?.startDate)} to {formatDateIST(currentAllocation?.endDate)}
                  </div>
                  <div className="text-sm text-gray-400">Try selecting a different block</div>
                </div>
              ) : (
                <>
                  <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-sm text-green-800">
                      <span className="font-semibold">{availableBeds.length} beds available</span> for dates {formatDateIST(currentAllocation?.startDate)} to {formatDateIST(currentAllocation?.endDate)}
                    </div>
                  </div>
                  <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
                    {availableBeds.map((bedNumber) => (
                      <button
                        key={bedNumber}
                        onClick={() => handleBedSelect(bedNumber)}
                        className={`aspect-square rounded-lg font-semibold text-sm transition-all duration-200 ${
                          selectedBed === bedNumber
                            ? 'bg-blue-600 text-white shadow-lg scale-110 ring-2 ring-blue-300'
                            : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-blue-400 hover:shadow-md hover:scale-105'
                        }`}
                      >
                        {bedNumber}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gradient-to-r from-gray-50 to-white p-6 border-t shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={pending}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
              >
                Cancel
              </button>
              {step > 1 && (
                <button
                  onClick={handleBack}
                  disabled={pending || loading}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm flex items-center gap-2"
                >
                  <span className="text-lg">←</span>
                  Back
                </button>
              )}
            </div>
            {step === 4 && (
              <button
                onClick={handleConfirmReallocation}
                disabled={!canConfirm || pending}
                className="px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg hover:from-blue-700 hover:to-blue-800 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-400 transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2"
              >
                {pending && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                <span>✓</span>
                Confirm Reallocation
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
