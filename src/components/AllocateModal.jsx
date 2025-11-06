'use client';
import { useEffect, useRef, useState } from 'react';
import Skeleton from '@/components/Skeleton';
import CameraCapture from '@/components/CameraCapture';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function AllocateModal({
  open,
  onClose,
  bedNumber,
  initialData, // null for new; { name, phone, gender, startDate, endDate }
  onSave,
  onDelete,
  pending = false, // Add pending prop
  genderRestriction = 'both', // Block-level gender restriction
  locationId,
  tentIndex,
  blockIndex,
}) {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    aadharNumber: '',
    gender: 'Male',
    startDate: '',
    endDate: '',
  });
  const [personPhoto, setPersonPhoto] = useState({ blob: null, dataUrl: null });
  const [aadhaarPhoto, setAadhaarPhoto] = useState({ blob: null, dataUrl: null });
  const ref = useRef(null);

  const MIN_DATE = '2025-11-03';
  const MAX_DATE = '2025-11-24';

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
      if (initialData) {
        setForm({
          name: initialData.name || '',
          phone: initialData.phone || '',
          aadharNumber: initialData.aadharNumber || '',
          gender: initialData.gender || 'Male',
          startDate: initialData.startDate || '',
          endDate: initialData.endDate || '',
          status: initialData.status || undefined, // Preserve status for reserved beds
        });
        // Set existing photo URLs if available
        if (initialData.personPhotoUrl) {
          setPersonPhoto({ blob: null, dataUrl: initialData.personPhotoUrl });
        } else {
          setPersonPhoto({ blob: null, dataUrl: null });
        }
        if (initialData.aadhaarPhotoUrl) {
          setAadhaarPhoto({ blob: null, dataUrl: initialData.aadhaarPhotoUrl });
        } else {
          setAadhaarPhoto({ blob: null, dataUrl: null });
        }
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
          aadharNumber: '',
          gender: defaultGender,
          startDate: '',
          endDate: '',
        });
        setPersonPhoto({ blob: null, dataUrl: null });
        setAadhaarPhoto({ blob: null, dataUrl: null });
      }
    }
  }, [open, initialData, genderRestriction]);

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!open) return null;

  const isEdit = Boolean(initialData);

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
    if (name === 'phone') {
      const digits = value.replace(/\D/g, '').slice(0, 10);
      setForm((f) => ({ ...f, phone: digits }));
      return;
    }
    // Format Aadhar: digits only, max 12, display with spaces every 4 digits
    if (name === 'aadharNumber') {
      const digits = value.replace(/\D/g, '').slice(0, 12);
      const formatted = digits.replace(/(\d{4})(\d{0,4})(\d{0,4})/, (match, g1, g2, g3) => {
        return [g1, g2, g3].filter(Boolean).join(' ');
      });
      setForm((f) => ({ ...f, aadharNumber: formatted }));
      return;
    }
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function handleSave() {
    if (!form.name || !form.startDate || !form.endDate || !form.phone) {
      return alert('Name, phone, start & end dates are required');
    }

    // Validate phone: exactly 10 digits
    if (!/^\d{10}$/.test(form.phone)) {
      return alert('Please enter a valid 10-digit phone number.');
    }

    // Validate Aadhar: if provided, must be exactly 12 digits
    const aadharDigits = form.aadharNumber.replace(/\D/g, '');
    if (form.aadharNumber && aadharDigits.length !== 12) {
      return alert('Aadhar number must be exactly 12 digits.');
    }

    // Validate photos are captured (mandatory for new allocations)
    if (!isEdit) {
      if (!personPhoto.blob && !personPhoto.dataUrl) {
        return alert('Person photo is required. Please capture the photo.');
      }
      if (!aadhaarPhoto.blob && !aadhaarPhoto.dataUrl) {
        return alert('Aadhaar photo is required. Please capture the photo.');
      }
    }

    const today = getTodayDate();
    
    // Validate date range
    if (form.startDate < MIN_DATE || form.startDate > MAX_DATE) {
      return alert(`Start date must be between ${MIN_DATE} and ${MAX_DATE}.`);
    }
    if (form.endDate < MIN_DATE || form.endDate > MAX_DATE) {
      return alert(`End date must be between ${MIN_DATE} and ${MAX_DATE}.`);
    }
    
    // End date cannot be before start date
    if (form.endDate < form.startDate) {
      return alert('End date cannot be before start date.');
    }

    // Validate gender restriction
    const selectedGender = form.gender || 'Male';
    if (genderRestriction === 'male_only' && selectedGender.toLowerCase() !== 'male') {
      return alert('This tent is restricted to male guests only. Please select Male as the gender.');
    }
    if (genderRestriction === 'female_only' && selectedGender.toLowerCase() !== 'female') {
      return alert('This tent is restricted to female guests only. Please select Female as the gender.');
    }

    try {
      // Upload photos to S3 if new photos were captured
      let personPhotoKey = initialData?.personPhotoKey;
      let aadhaarPhotoKey = initialData?.aadhaarPhotoKey;

      if (personPhoto.blob) {
        const uploadResult = await uploadPhotoToS3(personPhoto.blob, 'person');
        personPhotoKey = uploadResult.key;
      }

      if (aadhaarPhoto.blob) {
        const uploadResult = await uploadPhotoToS3(aadhaarPhoto.blob, 'aadhaar');
        aadhaarPhotoKey = uploadResult.key;
      }

      const payload = {
        ...form,
        gender: selectedGender,
        aadharNumber: aadharDigits || undefined, // Send without spaces, omit if empty
        personPhotoKey,
        aadhaarPhotoKey
      };
      
      // Remove status from payload if it exists (backend doesn't need it for update)
      if (payload.status) {
        delete payload.status;
      }

      onSave(payload);
    } catch (error) {
      console.error('Photo upload failed:', error);
      alert('Failed to upload photos. Please try again.');
    }
  }

  // Helper function to upload photo to S3
  async function uploadPhotoToS3(blob, photoType) {
    // Get pre-signed upload URL from backend
    const response = await fetch(`${API_BASE_URL}/api/upload-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        photoType,
        locationId,
        tentIndex,
        blockIndex
      })
    });

    if (!response.ok) {
      throw new Error('Failed to get upload URL');
    }

    const { uploadUrl, key } = await response.json();

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
    if (!/^\d{10}$/.test(form.phone)) errs.push('Enter a valid 10-digit phone number');
    if (!isEdit && !personPhoto.blob && !personPhoto.dataUrl) errs.push('Person photo is required');
    if (!isEdit && !aadhaarPhoto.blob && !aadhaarPhoto.dataUrl) errs.push('Aadhaar photo is required');
    if (!form.startDate) errs.push('Start date is required');
    if (!form.endDate) errs.push('End date is required');
    if (form.startDate && (form.startDate < MIN_DATE || form.startDate > MAX_DATE)) errs.push('Start date must be Nov 3-24, 2025');
    if (form.endDate && (form.endDate < MIN_DATE || form.endDate > MAX_DATE)) errs.push('End date must be Nov 3-24, 2025');
    if (form.startDate && form.endDate && form.endDate < form.startDate) errs.push('End date cannot be before start date');
    const selectedGender = form.gender || 'Male';
    if (genderRestriction === 'male_only' && selectedGender.toLowerCase() !== 'male') errs.push('This tent is restricted to male guests only');
    if (genderRestriction === 'female_only' && selectedGender.toLowerCase() !== 'female') errs.push('This tent is restricted to female guests only');
    return errs;
  })();
  const canSave = validationErrors.length === 0 && !pending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4" data-preserve-selection="true" onClick={(e) => e.stopPropagation()}>
      <div className="absolute inset-0 bg-black/40" onClick={!pending ? onClose : undefined} data-preserve-selection="true" />
      <div ref={ref} className="relative w-full max-w-lg max-h-[95vh] flex flex-col rounded-2xl bg-white shadow-xl overflow-hidden" data-preserve-selection="true" onClick={(e) => e.stopPropagation()}>
        <div className="overflow-y-auto flex-1 p-4 sm:p-5">
        {/* Enhanced loading overlay with skeleton */}
        {pending && (
          <div className="absolute inset-0 bg-white/95 rounded-2xl flex flex-col items-center justify-center z-10 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-6 h-6 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-gray-700 font-medium">
                {isEdit ? 'Updating allocation...' : 'Allocating bed...'}
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

        <h3 className="mb-4 text-base sm:text-lg font-semibold text-gray-900">
          {isEdit ? `Edit allocation — Bed ${bedNumber}` : `Allocate bed — Bed ${bedNumber}`}
        </h3>
        
        {/* Show current date for reference */}
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-sm text-blue-800">
            <div className="font-medium">Today's date (IST): {formatDateForDisplay(todayDate)}</div>
            <div className="text-blue-600 mt-1">(End date must be today or later)</div>
          </div>
        </div>

        {/* Tent Gender Restriction Info */}
        <div className={`mb-4 p-3 rounded-lg border ${genderInfo.bgColor} ${genderInfo.borderColor}`}>
          <div className={`text-sm ${genderInfo.textColor}`}>
            <div className="font-medium flex items-center gap-2">
              <span className="text-lg">{genderInfo.icon}</span>
              {genderInfo.text}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">Name*</label>
            <input 
              name="name" 
              value={form.name} 
              onChange={handleChange} 
              disabled={pending}
              className="w-full rounded-lg border border-gray-300 p-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed" 
              placeholder="Full name" 
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Phone*</label>
            <input 
              name="phone" 
              value={form.phone} 
              onChange={handleChange} 
              disabled={pending}
              type="tel"
              inputMode="numeric"
              pattern="\\d{10}"
              maxLength={10}
              className="w-full rounded-lg border border-gray-300 p-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed" 
              placeholder="10-digit phone" 
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Aadhar Number (Optional)</label>
            <input 
              name="aadharNumber" 
              value={form.aadharNumber} 
              onChange={handleChange} 
              disabled={pending}
              type="tel"
              inputMode="numeric"
              maxLength={14}
              className="w-full rounded-lg border border-gray-300 p-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed" 
              placeholder="1234 5678 9012" 
            />
            <p className="text-xs text-gray-500 mt-1">12 digits (optional)</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Gender*</label>
            <select 
              name="gender" 
              value={form.gender} 
              onChange={handleChange} 
              disabled={pending}
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
            <label className="mb-1 block text-sm font-medium text-gray-700">Start date*</label>
            <input 
              type="date" 
              name="startDate" 
              value={form.startDate} 
              onChange={handleChange}
              min={MIN_DATE}
              max={MAX_DATE}
              disabled={pending}
              className="w-full rounded-lg border border-gray-300 p-2 text-gray-900 focus:border-blue-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed" 
            />
            <p className="text-xs text-gray-500 mt-1">Nov 3-24, 2025</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">End date*</label>
            <input 
              type="date" 
              name="endDate" 
              value={form.endDate} 
              onChange={handleChange}
              min={MIN_DATE}
              max={MAX_DATE}
              disabled={pending}
              className="w-full rounded-lg border border-gray-300 p-2 text-gray-900 focus:border-blue-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed" 
            />
            <p className="text-xs text-gray-500 mt-1">Nov 3-24, 2025</p>
          </div>

          {/* Photo Capture Section */}
          <div className="sm:col-span-2 space-y-4 mt-4">
            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">📸 Photo Verification*</h4>
              
              <CameraCapture
                label="Person Photo"
                onCapture={(blob, dataUrl) => setPersonPhoto({ blob, dataUrl })}
                existingPhotoUrl={personPhoto.dataUrl}
              />
              
              <div className="mt-4">
                <CameraCapture
                  label="Aadhaar Card Photo"
                  onCapture={(blob, dataUrl) => setAadhaarPhoto({ blob, dataUrl })}
                  existingPhotoUrl={aadhaarPhoto.dataUrl}
                />
              </div>
            </div>
          </div>
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
            <button 
              onClick={onDelete} 
              disabled={pending}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Deallocate
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <button 
              onClick={onClose} 
              disabled={pending}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave} 
              disabled={!canSave}
              title={!canSave ? validationErrors[0] : undefined}
              className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {pending && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
              {isEdit ? 'Save changes' : 'Allocate'}
            </button>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}