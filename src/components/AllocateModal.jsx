'use client';
import { useEffect, useRef, useState } from 'react';
import Skeleton from '@/components/Skeleton';
import CameraCapture from '@/components/CameraCapture';
import { BOOKING_MAX_DATE as MAX_DATE, BOOKING_MIN_DATE as MIN_DATE, BOOKING_WINDOW_LABEL, isWithinBookingWindow } from '@/lib/bookingWindow.mjs';
import { lookupSaiConnect } from '@/lib/api';
import {
  ACCOMMODATION_CATEGORY_OPTIONS,
  resolveLookupCategoryChoice,
} from '@/lib/accommodationEligibility.mjs';

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

export default function AllocateModal({
  open,
  onClose,
  bedNumber,
  initialData, // null for new; { name, phone, gender, startDate, endDate }
  onSave,
  onDelete,
  onReallocate, // New prop for reallocate functionality
  pending = false, // Add pending prop
  genderRestriction = 'both', // Block-level gender restriction
  locationId,
  tentIndex,
  blockIndex,
  onSaveAndNext, // New prop for save & next functionality
  allowedCategories = ['delegate', 'sevadal', 'devotee'],
  eligibleDelegates = [],
  isAdmin = false,
}) {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    emergencyPhone: '',
    gender: 'Male',
    startDate: '',
    endDate: '',
  });
  const [personPhoto, setPersonPhoto] = useState({ blob: null, dataUrl: null });
  const [aadhaarPhoto, setAadhaarPhoto] = useState({ blob: null, dataUrl: null });
  const [uploading, setUploading] = useState(false); // Local uploading state
  const [uploadProgress, setUploadProgress] = useState(0); // Upload progress percentage
  const [displayProgress, setDisplayProgress] = useState(0); // Animated display progress
  const [preFetchedUrls, setPreFetchedUrls] = useState({ person: null, aadhaar: null }); // Pre-fetched upload URLs
  const [saiIdentifier, setSaiIdentifier] = useState('');
  const [saiLookup, setSaiLookup] = useState({ loading: false, result: null, error: '' });
  const [accommodationCategory, setAccommodationCategory] = useState('devotee');
  const [isCaretaker, setIsCaretaker] = useState(false);
  const [caretakerForAllocationId, setCaretakerForAllocationId] = useState('');
  const [delegateSearch, setDelegateSearch] = useState('');
  const ref = useRef(null);
  const scrollRef = useRef(null); // Ref for scrollable content area
  const topRef = useRef(null); // Ref for top element to scroll to

  // Smooth animation for progress number
  useEffect(() => {
    if (uploadProgress === displayProgress) return;
    
    const duration = 300; // 300ms animation
    const steps = 20;
    const stepValue = (uploadProgress - displayProgress) / steps;
    const stepDuration = duration / steps;
    
    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      if (currentStep >= steps) {
        setDisplayProgress(uploadProgress);
        clearInterval(interval);
      } else {
        setDisplayProgress(prev => Math.round(prev + stepValue));
      }
    }, stepDuration);
    
    return () => clearInterval(interval);
  }, [uploadProgress, displayProgress]);

  // Helper function to get today's date in YYYY-MM-DD format (IST)
  const getTodayDate = () => {
    // Create a new date and manually adjust for IST
    const now = new Date();
    const istOffset = 5.5 * 60; // IST is UTC+5:30
    const istTime = new Date(now.getTime() + (istOffset * 60 * 1000));
    
    // Get the date parts in IST
    const year = istTime.getUTCFullYear();
    const month = String(istTime.getUTCMonth() + 1).padStart(2, '0');
    const day = String(istTime.getUTCDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  };

  // Helper function to format date for display as dd/mm/yyyy
  const formatDateForDisplay = (dateString) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  useEffect(() => {
    if (open) {
      // Scroll modal content to top when bed number changes
      if (topRef.current) {
        topRef.current.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
      
      // Reset uploading state when modal opens OR bed number changes
      setUploading(false);
      setUploadProgress(0);
      setDisplayProgress(0);
      setSaiIdentifier('');
      setSaiLookup({ loading: false, result: null, error: '' });
      setIsCaretaker(Boolean(initialData?.caretakerForAllocationId));
      setCaretakerForAllocationId(initialData?.caretakerForAllocationId ? String(initialData.caretakerForAllocationId) : '');
      setDelegateSearch('');
      setAccommodationCategory(initialData?.accommodationCategory || 'devotee');
      
      // Pre-fetch upload URLs in background (non-blocking)
      prefetchUploadUrls();
      
      if (initialData) {
        setForm({
          name: initialData.name || '',
          phone: initialData.phone || '',
          emergencyPhone: initialData.emergencyPhone || '',
          gender: initialData.gender || 'Male',
          startDate: initialData.startDate || '',
          endDate: initialData.endDate || '',
          status: initialData.status || undefined, // Preserve status for reserved beds
        });
        // Set existing photo URLs if available - MUST reset to avoid stale data
        setPersonPhoto({ 
          blob: null, 
          dataUrl: initialData.personPhotoUrl || null 
        });
        setAadhaarPhoto({ 
          blob: null, 
          dataUrl: initialData.aadhaarPhotoUrl || null 
        });
      } else {
        // Set default gender based on restriction
        let defaultGender = 'Male';
        if (genderRestriction === 'female_only') {
          defaultGender = 'Female';
        } else if (genderRestriction === 'male_only') {
          defaultGender = 'Male';
        }
        
        setForm({
          name: '',
          phone: '',
          emergencyPhone: '',
          gender: defaultGender,
          startDate: '',
          endDate: '',
        });
        setPersonPhoto({ blob: null, dataUrl: null });
        setAadhaarPhoto({ blob: null, dataUrl: null });
      }
    } else {
      // Reset photo state when modal closes to prevent stale data
      setPersonPhoto({ blob: null, dataUrl: null });
      setAadhaarPhoto({ blob: null, dataUrl: null });
    }
  }, [open, bedNumber, initialData, genderRestriction]);

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!open) return null;

  const isEdit = Boolean(initialData);
  const selectedDelegate = eligibleDelegates.find((delegate) => String(delegate.id) === String(caretakerForAllocationId))
    || (initialData?.caretakerForAllocationId ? {
      id: Number(initialData.caretakerForAllocationId),
      name: initialData.caretakerForName || 'Delegate',
      startDate: initialData.startDate,
      endDate: initialData.endDate,
    } : null);
  const normalizedDelegateSearch = delegateSearch.trim().toLowerCase();
  const filteredDelegates = normalizedDelegateSearch
    ? eligibleDelegates.filter((delegate) => (
      delegate.name.toLowerCase().includes(normalizedDelegateSearch)
      || String(delegate.bedNumber).includes(normalizedDelegateSearch)
    ))
    : eligibleDelegates;

  async function handleSaiLookup() {
    if (!saiIdentifier.trim()) {
      setSaiLookup({ loading: false, result: null, error: 'Enter a Sai Connect ID or phone number.' });
      return;
    }
    setSaiLookup({ loading: true, result: null, error: '' });
    try {
      const result = await lookupSaiConnect(saiIdentifier.trim());
      if (!result.matched) {
        setAccommodationCategory('devotee');
        setSaiLookup({ loading: false, result, error: '' });
        return;
      }
      const choice = resolveLookupCategoryChoice(result.verifiedCategories);
      setAccommodationCategory(choice.category);
      setForm((current) => ({
        ...current,
        name: result.fullName || current.name,
        phone: /^\d{10}$/.test(String(result.mobileNo || '')) ? String(result.mobileNo) : current.phone,
      }));
      setSaiLookup({ loading: false, result, error: '' });
    } catch (error) {
      setAccommodationCategory('devotee');
      setSaiLookup({
        loading: false,
        result: {
          matched: false,
          outcome: 'unavailable',
          defaultCategory: 'devotee',
        },
        error: '',
      });
    }
  }

  // Helper functions for gender restriction display
  const getGenderRestrictionInfo = () => {
    switch (genderRestriction) {
      case 'male_only':
        return {
          text: 'This tent is restricted to male guests only',
          icon: '♂️',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-800'
        };
      case 'female_only':
        return {
          text: 'This tent is restricted to female guests only',
          icon: '♀️',
          bgColor: 'bg-pink-50',
          borderColor: 'border-pink-200',
          textColor: 'text-pink-800'
        };
      case 'both':
      default:
        return {
          text: 'This tent accepts all genders',
          icon: '👫',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          textColor: 'text-green-800'
        };
    }
  };

  const genderInfo = getGenderRestrictionInfo();

  // Filter gender options based on tent restrictions
  const getAvailableGenderOptions = () => {
    if (genderRestriction === 'male_only') {
      return [{ value: 'Male', label: 'Male' }];
    }
    if (genderRestriction === 'female_only') {
      return [{ value: 'Female', label: 'Female' }];
    }
    return [
      { value: 'Male', label: 'Male' },
      { value: 'Female', label: 'Female' },
      { value: 'Other', label: 'Other' }
    ];
  };

  const availableGenders = getAvailableGenderOptions();

  function handleChange(e) {
    const { name, value } = e.target;
    // Sanitize phone: digits only, max 10
    if (name === 'phone' || name === 'emergencyPhone') {
      const digits = value.replace(/\D/g, '').slice(0, 10);
      setForm((f) => ({ ...f, [name]: digits }));
      return;
    }
    setForm((f) => ({ ...f, [name]: value }));
  }

  // Helper function to generate S3 key with format: {bedNumber}-{ddmmyyyy}-{hhmm}-{name}-{type}
  function generatePhotoKey(photoType) {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    
    // Sanitize name for file path (remove special characters, replace spaces with hyphens)
    const sanitizedName = (form.name || 'unnamed').replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '-').toLowerCase();
    
    // Map photoType to desired suffix
    const typeSuffix = photoType === 'person' ? 'person' : 'identity';
    
    return `location-${locationId}/tent-${tentIndex}/block-${blockIndex}/${bedNumber}-${dd}${mm}${yyyy}-${hh}${min}-${sanitizedName}-${typeSuffix}.jpg`;
  }

  async function handleSave(saveAndNext = false) {
    if (!form.name || (!isCaretaker && (!form.startDate || !form.endDate || !form.phone))) {
      return alert(isCaretaker ? 'Name is required' : 'Name, phone, start & end dates are required');
    }

    if (!isCaretaker && !/^\d{10}$/.test(form.phone)) {
      return alert('Please enter a valid 10-digit phone number.');
    }

    // Validate Emergency Phone: if provided, must be exactly 10 digits
    const emergencyDigits = form.emergencyPhone.replace(/\D/g, '');
    if (form.emergencyPhone && emergencyDigits.length !== 10) {
      return alert('Emergency phone must be exactly 10 digits.');
    }

    // Validate photos are captured (mandatory for new allocations)
    if (!isEdit && !isCaretaker) {
      if (!personPhoto.blob && !personPhoto.dataUrl) {
        return alert('Person photo is required. Please capture the photo.');
      }
      if (!aadhaarPhoto.blob && !aadhaarPhoto.dataUrl) {
        return alert('Identity photo is required. Please capture the photo.');
      }
    }

    const today = getTodayDate();
    
    // Validate date range
    if (!isCaretaker && !isWithinBookingWindow(form.startDate)) {
      return alert(`Start date must be between ${MIN_DATE} and ${MAX_DATE}.`);
    }
    if (!isCaretaker && !isWithinBookingWindow(form.endDate)) {
      return alert(`End date must be between ${MIN_DATE} and ${MAX_DATE}.`);
    }
    
    // End date cannot be before start date
    if (!isCaretaker && form.endDate < form.startDate) {
      return alert('End date cannot be before start date.');
    }

    // Validate gender restriction
    const selectedGender = form.gender || 'Male';
    if (!isCaretaker && genderRestriction === 'male_only' && selectedGender.toLowerCase() !== 'male') {
      return alert('This tent is restricted to male guests only. Please select Male as the gender.');
    }
    if (!isCaretaker && genderRestriction === 'female_only' && selectedGender.toLowerCase() !== 'female') {
      return alert('This tent is restricted to female guests only. Please select Female as the gender.');
    }

    try {
      setUploading(true);
      setUploadProgress(0);
      setDisplayProgress(0);
      
      console.log('Starting parallel upload + save process...');
      
      // Generate photo keys upfront (don't wait for backend!)
      let personPhotoKey = initialData?.personPhotoKey;
      let aadhaarPhotoKey = initialData?.aadhaarPhotoKey;

      if (personPhoto.blob) {
        personPhotoKey = generatePhotoKey('person');
      }
      if (aadhaarPhoto.blob) {
        aadhaarPhotoKey = generatePhotoKey('aadhaar');
      }

      // Prepare backend payload (we have keys already!)
      const payload = {
        ...form,
        gender: isCaretaker ? undefined : selectedGender,
        emergencyPhone: emergencyDigits || undefined,
        personPhotoKey,
        aadhaarPhotoKey,
        ...(!isEdit ? {
          accommodationCategory,
          saiVerificationToken: saiLookup.result?.verificationToken,
          caretakerForAllocationId: isCaretaker ? Number(caretakerForAllocationId) : undefined,
        } : (isAdmin ? { accommodationCategory } : {})),
      };
      
      if (payload.status) {
        delete payload.status;
      }

      // Upload photos to S3 and save to backend IN PARALLEL! 🚀
      const parallelPromises = [];
      
      if (!isCaretaker && personPhoto.blob) {
        console.log('Uploading person photo with key:', personPhotoKey);
        parallelPromises.push(
          uploadPhotoToS3(personPhoto.blob, 'person', personPhotoKey).then(() => {
            console.log('Person photo uploaded');
            return 'person';
          })
        );
      }
      
      if (!isCaretaker && aadhaarPhoto.blob) {
        console.log('Uploading aadhaar photo with key:', aadhaarPhotoKey);
        parallelPromises.push(
          uploadPhotoToS3(aadhaarPhoto.blob, 'aadhaar', aadhaarPhotoKey).then(() => {
            console.log('Aadhaar photo uploaded');
            return 'aadhaar';
          })
        );
      }
      
      // Add backend save to parallel promises
      setUploadProgress(20);
      parallelPromises.push(
        onSave(payload, saveAndNext).then(() => { // Pass skipClose flag
          console.log('Backend save complete');
          return 'backend';
        })
      );

      // Wait for EVERYTHING in parallel
      console.log('Waiting for all operations (S3 uploads + backend save)...');
      await Promise.all(parallelPromises);
      console.log('All operations complete!');
      setUploadProgress(100);
      
      // If save & next, trigger the next bed opening IMMEDIATELY (modal stays open!)
      if (saveAndNext && onSaveAndNext) {
        onSaveAndNext();
      }
    } catch (error) {
      console.error('Operation failed:', error);
      setUploading(false);
      setUploadProgress(0);
      alert('Failed to save. Please try again.');
    }
  }

  // Pre-fetch upload URLs in background when modal opens
  async function prefetchUploadUrls() {
    try {
      // Fetch both URLs in parallel
      const [personUrlResponse, aadhaarUrlResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/upload-url`, {
          method: 'POST',
          headers: authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ photoType: 'person', locationId, tentIndex, blockIndex })
        }),
        fetch(`${API_BASE_URL}/api/upload-url`, {
          method: 'POST',
          headers: authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ photoType: 'aadhaar', locationId, tentIndex, blockIndex })
        })
      ]);

      if (personUrlResponse.ok && aadhaarUrlResponse.ok) {
        const personData = await personUrlResponse.json();
        const aadhaarData = await aadhaarUrlResponse.json();
        
        setPreFetchedUrls({
          person: personData,
          aadhaar: aadhaarData
        });
      }
    } catch (error) {
      // Silent fail - will fetch on-demand if pre-fetch fails
      console.log('Pre-fetch upload URLs failed, will fetch on-demand:', error);
    }
  }

  // Helper function to upload photo to S3
  async function uploadPhotoToS3(blob, photoType, key) {
    let uploadUrl;
    
    // Use pre-fetched URL if available, otherwise fetch with our key
    if (preFetchedUrls[photoType] && preFetchedUrls[photoType].key === key) {
      console.log(`Using pre-fetched URL for ${photoType}`);
      ({ uploadUrl } = preFetchedUrls[photoType]);
    } else {
      console.log(`Fetching URL with our pre-generated key for ${photoType}`);
      // Fetch with our pre-generated key
      const response = await fetch(`${API_BASE_URL}/api/upload-url`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ photoType, locationId, tentIndex, blockIndex, key })
      });

      if (!response.ok) {
        throw new Error('Failed to get upload URL');
      }

      ({ uploadUrl } = await response.json());
    }

    // Upload directly to S3
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      body: blob,
      headers: {
        'Content-Type': 'image/jpeg'
      }
    });

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload to S3');
    }

    return { key };
  }

  const todayDate = getTodayDate();

  // Prepare validation errors for disabled state explanation
  const validationErrors = (() => {
    const errs = [];
    if (!form.name || !form.name.trim()) errs.push('Name is required');
    if (!isCaretaker && !/^\d{10}$/.test(form.phone)) errs.push('Enter a valid 10-digit phone number');
    if (!isEdit && !isCaretaker && !personPhoto.blob && !personPhoto.dataUrl) errs.push('Person photo is required');
    if (!isEdit && !isCaretaker && !aadhaarPhoto.blob && !aadhaarPhoto.dataUrl) errs.push('Identity photo is required');
    if (!isCaretaker && !form.startDate) errs.push('Start date is required');
    if (!isCaretaker && !form.endDate) errs.push('End date is required');
    if (!isCaretaker && form.startDate && !isWithinBookingWindow(form.startDate)) errs.push(`Start date must be ${BOOKING_WINDOW_LABEL}`);
    if (!isCaretaker && form.endDate && !isWithinBookingWindow(form.endDate)) errs.push(`End date must be ${BOOKING_WINDOW_LABEL}`);
    if (!isCaretaker && form.startDate && form.endDate && form.endDate < form.startDate) errs.push('End date cannot be before start date');
    const selectedGender = form.gender || 'Male';
    if (!isCaretaker && genderRestriction === 'male_only' && selectedGender.toLowerCase() !== 'male') errs.push('This tent is restricted to male guests only');
    if (!isCaretaker && genderRestriction === 'female_only' && selectedGender.toLowerCase() !== 'female') errs.push('This tent is restricted to female guests only');
    if (!isEdit && !isCaretaker && saiLookup.result?.matched && !accommodationCategory) errs.push('Choose Delegate or Sevadal');
    if (!isEdit && !isCaretaker && accommodationCategory && !allowedCategories.includes(accommodationCategory)) {
      errs.push(`This block does not allow ${accommodationCategory} accommodation`);
    }
    if (!isEdit && isCaretaker && !caretakerForAllocationId) errs.push('Choose the Delegate this caretaker supports');
    return errs;
  })();
  const canSave = validationErrors.length === 0 && !pending && !uploading;
  const isProcessing = pending || uploading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4" data-preserve-selection="true" onClick={(e) => e.stopPropagation()}>
      <div className="absolute inset-0 bg-black/40" onClick={!isProcessing ? onClose : undefined} data-preserve-selection="true" />
      <div ref={ref} className="relative w-full max-w-lg max-h-[95vh] flex flex-col rounded-2xl bg-white shadow-xl overflow-hidden" data-preserve-selection="true" onClick={(e) => e.stopPropagation()}>
        <div ref={scrollRef} className="overflow-y-auto flex-1 p-4 sm:p-5">
        {/* Enhanced loading overlay with skeleton and progress */}
        {isProcessing && (
          <div className="absolute inset-0 bg-white/95 rounded-2xl flex flex-col items-center justify-center z-10 p-8">
            <div className="flex flex-col items-center gap-3 mb-6">
              <div className="relative w-20 h-20">
                <svg className="w-20 h-20 transform -rotate-90">
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    stroke="#e5e7eb"
                    strokeWidth="8"
                    fill="none"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    stroke="#3b82f6"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray="226"
                    strokeDashoffset={226 - (226 * uploadProgress) / 100}
                    strokeLinecap="round"
                    style={{
                      transition: 'stroke-dashoffset 0.5s ease-out',
                    }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-blue-600 font-semibold text-sm">
                    {uploading ? `${displayProgress}%` : '✓'}
                  </span>
                </div>
              </div>
              <span className="text-gray-700 font-medium text-center">
                {uploading ? 'Uploading photos...' : (isEdit ? 'Updating allocation...' : 'Allocating bed...')}
              </span>
            </div>
            
            {/* Skeleton form preview */}
            <div className="w-full space-y-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full" />
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          </div>
        )}

        <h3 ref={topRef} className="mb-4 text-base sm:text-lg font-semibold text-gray-900">
          {isEdit ? `Edit allocation — Bed ${bedNumber}` : `Allocate bed — Bed ${bedNumber}`}
        </h3>
        
        {/* Show current date for reference */}
        {!isCaretaker && <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-sm text-blue-800">
            <div className="font-medium">Today&apos;s date (IST): {formatDateForDisplay(todayDate)}</div>
            <div className="text-blue-600 mt-1">(End date must be today or later)</div>
          </div>
        </div>}

        {/* Tent Gender Restriction Info */}
        {!isCaretaker && <div className={`mb-4 p-3 rounded-lg border ${genderInfo.bgColor} ${genderInfo.borderColor}`}>
          <div className={`text-sm ${genderInfo.textColor}`}>
            <div className="font-medium flex items-center gap-2">
              <span className="text-lg">{genderInfo.icon}</span>
              {genderInfo.text}
            </div>
          </div>
        </div>}

        {!isEdit && (
          <section className="mb-4 space-y-3 rounded-xl border border-indigo-200 bg-indigo-50 p-3">
            <div>
              <div className="text-sm font-semibold text-indigo-950">Sai Connect lookup <span className="font-normal text-indigo-700">(optional)</span></div>
              <p className="mt-1 text-xs text-indigo-700">Use a Sai Connect ID or phone number to verify Delegate or Sevadal status. If skipped or not found, the person is saved as a Devotee.</p>
            </div>
            <div className="flex gap-2">
              <input
                value={saiIdentifier}
                onChange={(event) => setSaiIdentifier(event.target.value.replace(/\D/g, '').slice(0, 15))}
                inputMode="numeric"
                placeholder="Sai Connect ID or phone"
                disabled={isProcessing || saiLookup.loading}
                className="min-w-0 flex-1 rounded-lg border border-indigo-200 bg-white p-2 text-sm text-gray-900 outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={handleSaiLookup}
                disabled={isProcessing || saiLookup.loading || !saiIdentifier.trim()}
                className="rounded-lg bg-indigo-700 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-800 disabled:opacity-50"
              >
                {saiLookup.loading ? 'Checking…' : 'Verify'}
              </button>
            </div>
            {saiLookup.result && !saiLookup.result.matched && (
              <div role="status" className="rounded-lg border border-gray-200 bg-white p-3">
                <div className="text-sm font-semibold text-gray-900">Devotee</div>
                <p className="mt-1 text-xs text-gray-600">No Delegate or Sevadal registration was found. Continue as a Devotee.</p>
              </div>
            )}
            {saiLookup.result?.matched && (
              <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <div className="text-sm font-semibold capitalize text-emerald-950">
                  {saiLookup.result.verifiedCategories.length > 1
                    ? 'Delegate or Sevadal'
                    : saiLookup.result.verifiedCategories[0]}
                </div>
                <div className="mt-1 text-xs text-emerald-800">Sai Connect verified: {saiLookup.result.fullName}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {saiLookup.result.verifiedCategories.map((category) => (
                    <span key={category} className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium capitalize text-emerald-800">{category}</span>
                  ))}
                </div>
                {saiLookup.result.verifiedCategories.length > 1 && (
                  <label className="mt-3 block text-xs font-medium text-emerald-900">
                    Book this accommodation as
                    <select
                      value={accommodationCategory}
                      onChange={(event) => setAccommodationCategory(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-emerald-200 bg-white p-2 text-sm text-gray-900"
                    >
                      <option value="">Choose category</option>
                      {saiLookup.result.verifiedCategories.map((category) => (
                        <option key={category} value={category}>{category === 'delegate' ? 'Delegate' : 'Sevadal'}</option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            )}
            {eligibleDelegates.length > 0 && (
              <div className="border-t border-indigo-200 pt-3">
                <label className="flex cursor-pointer items-start gap-2 text-sm text-indigo-950">
                  <input
                    type="checkbox"
                    checked={isCaretaker}
                    onChange={(event) => {
                      setIsCaretaker(event.target.checked);
                      setDelegateSearch('');
                      if (!event.target.checked) setCaretakerForAllocationId('');
                    }}
                    className="mt-0.5 h-4 w-4 accent-indigo-700"
                  />
                  <span><span className="font-medium">Allocate as caretaker</span><span className="block text-xs text-indigo-700">Uses this bed and inherits the Delegate&apos;s stay dates.</span></span>
                </label>
                {isCaretaker && (
                  <div className="mt-2 space-y-2">
                    <label className="block text-xs font-medium text-indigo-900">
                      Search Delegates
                      <input
                        type="search"
                        aria-label="Search Delegates"
                        value={delegateSearch}
                        onChange={(event) => {
                          setDelegateSearch(event.target.value);
                          setCaretakerForAllocationId('');
                        }}
                        placeholder="Name or bed number"
                        className="mt-1 w-full rounded-lg border border-indigo-200 bg-white p-2 text-sm text-gray-900 outline-none focus:border-indigo-500"
                      />
                    </label>
                    <select
                      aria-label="Caretaker for"
                      value={caretakerForAllocationId}
                      onChange={(event) => {
                        setCaretakerForAllocationId(event.target.value);
                        if (event.target.value) setDelegateSearch('');
                      }}
                      className="w-full rounded-lg border border-indigo-200 bg-white p-2 text-sm text-gray-900"
                    >
                      <option value="">Choose Delegate</option>
                      {filteredDelegates.map((delegate) => (
                        <option key={delegate.id} value={delegate.id}>{delegate.name} — Bed {delegate.bedNumber}</option>
                      ))}
                      {filteredDelegates.length === 0 && <option disabled>No matching Delegates</option>}
                    </select>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {isEdit && (
          <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-gray-700">
            <span className="rounded-full bg-gray-100 px-3 py-1 font-medium capitalize">{initialData?.accommodationCategory || 'devotee'}</span>
            {initialData?.caretakerForName && <span>Caretaker for <strong>{initialData.caretakerForName}</strong></span>}
          </div>
        )}

        {isEdit && isAdmin && (
          <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-3">
            <label className="block text-sm font-medium text-gray-800">Accommodation category</label>
            <select
              value={accommodationCategory}
              onChange={(event) => setAccommodationCategory(event.target.value)}
              className="mt-2 w-full rounded-lg border border-gray-300 bg-white p-2 text-sm text-gray-900"
            >
              {initialData?.accommodationCategory === 'delegate' && <option value="delegate" disabled>Delegate (Sai verified)</option>}
              <option value="sevadal">Sevadal</option>
              <option value="devotee">Devotee</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">Delegate status can only be assigned through Sai Connect verification.</p>
          </div>
        )}

        {!isEdit && (
          <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-gray-600">
            <span className="font-medium">Block allows:</span>
            {allowedCategories.map((category) => <span key={category} className="rounded-full bg-gray-100 px-2 py-1 capitalize">{category}</span>)}
            <span className="ml-auto font-medium capitalize text-gray-900">Booking as: {isCaretaker ? `caretaker for ${selectedDelegate?.name || '…'}` : (accommodationCategory || 'choose category')}</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">Name*</label>
            <input 
              name="name" 
              value={form.name} 
              onChange={handleChange} 
              disabled={isProcessing}
              className="w-full rounded-lg border border-gray-300 p-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed" 
              placeholder="Full name" 
            />
          </div>
          {isCaretaker && selectedDelegate && (
            <div className="sm:col-span-2 rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-sm text-indigo-900">
              <span className="font-medium">Stay dates:</span> {formatDateForDisplay(selectedDelegate.startDate)} to {formatDateForDisplay(selectedDelegate.endDate)} — copied from {selectedDelegate.name}
            </div>
          )}
          {!isCaretaker && <>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Phone{isCaretaker ? ' (Optional)' : '*'}</label>
            <input 
              name="phone" 
              value={form.phone} 
              onChange={handleChange} 
              disabled={isProcessing}
              type="tel"
              inputMode="numeric"
              pattern="\\d{10}"
              maxLength={10}
              className="w-full rounded-lg border border-gray-300 p-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed" 
              placeholder="10-digit phone" 
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Emergency Phone (Optional)</label>
            <input 
              name="emergencyPhone" 
              value={form.emergencyPhone} 
              onChange={handleChange} 
              disabled={isProcessing}
              type="tel"
              inputMode="numeric"
              pattern="\\d{10}"
              maxLength={10}
              className="w-full rounded-lg border border-gray-300 p-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed" 
              placeholder="10-digit phone" 
            />
            <p className="text-xs text-gray-500 mt-1">Alternative contact number</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Gender{isCaretaker ? ' (Optional)' : '*'}</label>
            <select 
              name="gender" 
              value={form.gender} 
              onChange={handleChange} 
              disabled={isProcessing || isCaretaker}
              className="w-full rounded-lg border border-gray-300 p-2 text-gray-900 focus:border-blue-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              {availableGenders.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            {genderRestriction !== 'both' && (
              <p className="text-xs text-gray-500 mt-1">Limited by tent restriction</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Start date{isCaretaker ? '' : '*'}</label>
            <input 
              type="date" 
              name="startDate" 
              value={form.startDate} 
              onChange={handleChange}
              min={MIN_DATE}
              max={MAX_DATE}
              disabled={isProcessing || isCaretaker}
              className="w-full rounded-lg border border-gray-300 p-2 text-gray-900 focus:border-blue-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed" 
            />
            <p className="text-xs text-gray-500 mt-1">{isCaretaker ? 'Copied from the selected Delegate' : BOOKING_WINDOW_LABEL}</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">End date{isCaretaker ? '' : '*'}</label>
            <input 
              type="date" 
              name="endDate" 
              value={form.endDate} 
              onChange={handleChange}
              min={MIN_DATE}
              max={MAX_DATE}
              disabled={isProcessing || isCaretaker}
              className="w-full rounded-lg border border-gray-300 p-2 text-gray-900 focus:border-blue-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed" 
            />
            <p className="text-xs text-gray-500 mt-1">{isCaretaker ? 'Copied from the selected Delegate' : BOOKING_WINDOW_LABEL}</p>
          </div>
          </>}

          {/* Photo Capture Section */}
          {!isCaretaker && <div className="sm:col-span-2 space-y-4 mt-4">
            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">📸 Photo Verification*</h4>
              
              <CameraCapture
                key={`person-${bedNumber}-${open}-${initialData?.personPhotoUrl || 'new'}`}
                label="Person Photo"
                onCapture={(blob, dataUrl) => setPersonPhoto({ blob, dataUrl })}
                existingPhotoUrl={initialData?.personPhotoUrl || null}
                autoOpen={!isEdit} // Auto-open for new bookings
              />
              
              <div className="mt-4">
                <CameraCapture
                  key={`aadhaar-${bedNumber}-${open}-${initialData?.aadhaarPhotoUrl || 'new'}`}
                  label="Identity Card Photo"
                  onCapture={(blob, dataUrl) => setAadhaarPhoto({ blob, dataUrl })}
                  existingPhotoUrl={initialData?.aadhaarPhotoUrl || null}
                  autoOpen={!isEdit} // Auto-open for new bookings
                />
              </div>
            </div>
          </div>}
        </div>
        
        <div className="mt-5 sticky bottom-0 bg-white pt-3 pb-3 flex items-center justify-between border-t">
          {!canSave && (
            <div className="text-xs text-red-600 space-y-1">
              <div className="font-medium">Can’t save yet:</div>
              <ul className="list-disc pl-4">
                {validationErrors.map((e, i) => (<li key={i}>{e}</li>))}
              </ul>
            </div>
          )}
          {isEdit ? (
            <div className="flex gap-2">
              <button 
                onClick={onDelete} 
                disabled={isProcessing}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Deallocate
              </button>
              {onReallocate && (
                <button 
                  onClick={() => {
                    onReallocate();
                    onClose();
                  }} 
                  disabled={isProcessing}
                  className="rounded-lg border border-blue-500 bg-blue-50 px-3 py-2 text-sm text-blue-700 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reallocate
                </button>
              )}
            </div>
          ) : <span />}
          <div className="flex gap-2">
            <button 
              onClick={onClose} 
              disabled={isProcessing}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            {!isEdit && !isCaretaker && onSaveAndNext && (
              <button 
                onClick={() => handleSave(true)} 
                disabled={!canSave}
                title={!canSave ? validationErrors[0] : 'Save and open next free bed'}
                className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isProcessing && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                Save & Next
              </button>
            )}
            <button 
              onClick={() => handleSave(false)} 
              disabled={!canSave}
              title={!canSave ? validationErrors[0] : undefined}
              className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isProcessing && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
              {isEdit ? 'Save changes' : 'Allocate'}
            </button>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
