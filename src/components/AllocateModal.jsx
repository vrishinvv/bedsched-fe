'use client';
import { useEffect, useRef, useState } from 'react';
import Skeleton from '@/components/Skeleton';

export default function AllocateModal({
  open,
  onClose,
  bedNumber,
  initialData, // null for new; { name, phone, gender, startDate, endDate }
  onSave,
  onDelete,
  pending = false, // Add pending prop
  tentGenderRestriction = 'both', // New prop for tent's gender restriction
}) {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    gender: 'Male',
    startDate: '',
    endDate: '',
  });
  const ref = useRef(null);

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
          gender: initialData.gender || 'Male',
          startDate: initialData.startDate || '',
          endDate: initialData.endDate || '',
        });
      } else {
        // Set default gender based on tent restriction
        let defaultGender = 'Male';
        if (tentGenderRestriction === 'female_only') {
          defaultGender = 'Female';
        } else if (tentGenderRestriction === 'male_only') {
          defaultGender = 'Male';
        }
        
        setForm({
          name: '',
          phone: '',
          gender: defaultGender,
          startDate: '',
          endDate: '',
        });
      }
    }
  }, [open, initialData, tentGenderRestriction]);

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!open) return null;

  const isEdit = Boolean(initialData);

  // Helper functions for gender restriction display
  const getGenderRestrictionInfo = () => {
    switch (tentGenderRestriction) {
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
    if (tentGenderRestriction === 'male_only') {
      return [{ value: 'Male', label: 'Male' }];
    }
    if (tentGenderRestriction === 'female_only') {
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
    setForm((f) => ({ ...f, [name]: value }));
  }

  function handleSave() {
    if (!form.name || !form.startDate || !form.endDate) {
      return alert('Name, start & end dates are required');
    }

    const today = getTodayDate();
    
    // End date must be today or in the future
    if (form.endDate < today) {
      return alert('End date must be today or in the future.');
    }
    
    // End date cannot be before start date
    if (form.endDate < form.startDate) {
      return alert('End date cannot be before start date.');
    }

    // Validate gender restriction
    const selectedGender = form.gender || 'Male';
    if (tentGenderRestriction === 'male_only' && selectedGender.toLowerCase() !== 'male') {
      return alert('This tent is restricted to male guests only. Please select Male as the gender.');
    }
    if (tentGenderRestriction === 'female_only' && selectedGender.toLowerCase() !== 'female') {
      return alert('This tent is restricted to female guests only. Please select Female as the gender.');
    }

    const payload = {
      ...form,
      gender: selectedGender
    };

    onSave(payload);
  }

  const todayDate = getTodayDate();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={!pending ? onClose : undefined} />
      <div ref={ref} className="relative w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
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

        <h3 className="mb-4 text-lg font-semibold text-gray-900">
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
            <label className="mb-1 block text-sm font-medium text-gray-700">Phone</label>
            <input 
              name="phone" 
              value={form.phone} 
              onChange={handleChange} 
              disabled={pending}
              className="w-full rounded-lg border border-gray-300 p-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed" 
              placeholder="Optional" 
            />
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
            {tentGenderRestriction !== 'both' && (
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
              disabled={pending}
              className="w-full rounded-lg border border-gray-300 p-2 text-gray-900 focus:border-blue-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed" 
            />
            <p className="text-xs text-gray-500 mt-1">Can be any date (past, present, or future)</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">End date*</label>
            <input 
              type="date" 
              name="endDate" 
              value={form.endDate} 
              onChange={handleChange}
              min={todayDate}
              disabled={pending}
              className="w-full rounded-lg border border-gray-300 p-2 text-gray-900 focus:border-blue-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed" 
            />
            <p className="text-xs text-gray-500 mt-1">Must be today or later</p>
          </div>
        </div>
        
        <div className="mt-5 flex items-center justify-between">
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
              disabled={pending}
              className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {pending && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
              {isEdit ? 'Save changes' : 'Allocate'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}