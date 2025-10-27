'use client';
import { useEffect, useRef, useState } from 'react';
import Skeleton from '@/components/Skeleton';

export default function BulkAllocateModal({
  open,
  onClose,
  genderRestriction,
  onSave,
}) {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    maleCount: 0,
    femaleCount: 0,
    startDate: '',
    endDate: '',
  });
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState(null); // { success: [], errors: [] }
  const ref = useRef(null);

  // Helper function to get today's date in YYYY-MM-DD format (IST)
  const getTodayDate = () => {
    const now = new Date();
    const istOffset = 5.5 * 60;
    const istTime = new Date(now.getTime() + (istOffset * 60 * 1000));
    
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
      setForm({
        name: '',
        phone: '',
        maleCount: 0,
        femaleCount: 0,
        startDate: '',
        endDate: '',
      });
      setResult(null);
      setPending(false);
    }
  }, [open]);

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape' && !pending) onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, pending]);

  if (!open) return null;

  const isMaleOnly = genderRestriction === 'male_only';
  const isFemaleOnly = genderRestriction === 'female_only';
  const isMixed = genderRestriction === 'both';

  function handleChange(e) {
    const { name, value } = e.target;
    if (name === 'phone') {
      const digits = value.replace(/\D/g, '').slice(0, 10);
      setForm((f) => ({ ...f, phone: digits }));
      return;
    }
    setForm((f) => ({ ...f, [name]: value }));
  }

  function handleNumberChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: Math.max(0, parseInt(value) || 0) }));
  }

  async function handleSave() {
    if (!form.name || !form.startDate || !form.endDate || !form.phone) {
      return alert('Name, phone, start & end dates are required');
    }

    if (!/^\d{10}$/.test(form.phone)) {
      return alert('Please enter a valid 10-digit phone number.');
    }

    const today = getTodayDate();
    
    if (form.endDate < today) {
      return alert('End date must be today or in the future.');
    }
    
    if (form.endDate < form.startDate) {
      return alert('End date cannot be before start date.');
    }

    const totalCount = (isMixed ? (form.maleCount + form.femaleCount) : (isMaleOnly ? form.maleCount : form.femaleCount));
    
    if (totalCount <= 0) {
      return alert('Please specify at least one person to book.');
    }

    setPending(true);
    try {
      const result = await onSave({
        name: form.name,
        phone: form.phone,
        maleCount: isMaleOnly || isMixed ? form.maleCount : 0,
        femaleCount: isFemaleOnly || isMixed ? form.femaleCount : 0,
        startDate: form.startDate,
        endDate: form.endDate,
      });
      
      setResult(result);
    } catch (e) {
      setResult({ success: [], errors: [{ message: e.message }] });
    } finally {
      setPending(false);
    }
  }

  const todayDate = getTodayDate();

  // Explain disabled state and pre-validate inputs
  const validationErrors = (() => {
    const errs = [];
    if (!form.name || !form.name.trim()) errs.push('Name is required');
    if (!/^\d{10}$/.test(form.phone)) errs.push('Enter a valid 10-digit phone number');
    if (!form.startDate) errs.push('Start date is required');
    if (!form.endDate) errs.push('End date is required');
    if (form.endDate && form.endDate < todayDate) errs.push('End date must be today or later');
    if (form.startDate && form.endDate && form.endDate < form.startDate) errs.push('End date cannot be before start date');
    const totalCount = (isMixed ? (form.maleCount + form.femaleCount) : (isMaleOnly ? form.maleCount : form.femaleCount));
    if (totalCount <= 0) errs.push('Specify at least 1 person to book');
    return errs;
  })();
  const canBook = validationErrors.length === 0 && !pending && !result;

  // Show results
  if (result) {
    const hasSuccess = result.success && result.success.length > 0;
    const hasErrors = result.errors && result.errors.length > 0;
    
    return (
      <div className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <div ref={ref} className="relative w-full h-full sm:h-auto sm:max-w-lg rounded-none sm:rounded-2xl bg-white p-4 sm:p-6 shadow-xl overflow-y-auto">
          <h3 className="mb-4 text-xl font-semibold text-gray-900">
            Booking Results
          </h3>

          {hasSuccess && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h4 className="text-lg font-semibold text-green-700">Successfully Booked ({result.success.length})</h4>
              </div>
              <div className="space-y-2 bg-green-50 border border-green-200 rounded-lg p-4">
                {result.success.map((booking, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="font-medium text-green-900">Bed {booking.bedNumber}</span>
                    <span className="text-green-700">{booking.gender} - {booking.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {hasErrors && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h4 className="text-lg font-semibold text-red-700">Errors ({result.errors.length})</h4>
              </div>
              <div className="space-y-2 bg-red-50 border border-red-200 rounded-lg p-4">
                {result.errors.map((error, idx) => (
                  <div key={idx} className="text-sm text-red-700">
                    {error.bedNumber && <span className="font-medium">Bed {error.bedNumber}: </span>}
                    {error.message}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="sticky bottom-0 bg-white pt-3 pb-3 flex justify-end border-t">
            <button 
              onClick={onClose}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={!pending ? onClose : undefined} />
      <div ref={ref} className="relative w-full h-full sm:h-auto sm:max-w-lg rounded-none sm:rounded-2xl bg-white p-4 sm:p-5 shadow-xl overflow-y-auto">
        {/* Loading overlay */}
        {pending && (
          <div className="absolute inset-0 bg-white/95 rounded-2xl flex flex-col items-center justify-center z-10 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-6 h-6 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-gray-700 font-medium">Booking beds...</span>
            </div>
            
            <div className="w-full space-y-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full" />
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          </div>
        )}

        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Bulk Book Beds
        </h3>

        {/* Tent restriction info */}
        <div className={`mb-4 p-3 rounded-lg border ${
          isMaleOnly ? 'bg-blue-50 border-blue-200' :
          isFemaleOnly ? 'bg-pink-50 border-pink-200' :
          'bg-green-50 border-green-200'
        }`}>
          <div className={`text-sm font-medium ${
            isMaleOnly ? 'text-blue-800' :
            isFemaleOnly ? 'text-pink-800' :
            'text-green-800'
          }`}>
            {isMaleOnly ? '♂️ Male Only Tent' :
             isFemaleOnly ? '♀️ Female Only Tent' :
             '👫 All Genders Accepted'}
          </div>
        </div>
        
        {/* Current date info */}
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-sm text-blue-800">
            <div className="font-medium">Today's date (IST): {formatDateForDisplay(todayDate)}</div>
            <div className="text-blue-600 mt-1">(End date must be today or later)</div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {/* Name */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Name*</label>
            <input 
              name="name" 
              value={form.name} 
              onChange={handleChange} 
              disabled={pending}
              className="w-full rounded-lg border border-gray-300 p-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed" 
              placeholder="Full name (same for all bookings)" 
            />
          </div>

          {/* Phone */}
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

          {/* Count inputs */}
          <div className="grid grid-cols-2 gap-3">
            {(isMaleOnly || isMixed) && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Male Count*</label>
                <input 
                  type="number"
                  name="maleCount" 
                  value={form.maleCount} 
                  onChange={handleNumberChange} 
                  min="0"
                  step="1"
                  inputMode="numeric"
                  disabled={pending}
                  className="w-full rounded-lg border border-gray-300 p-2 text-gray-900 focus:border-blue-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed" 
                />
              </div>
            )}
            {(isFemaleOnly || isMixed) && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Female Count*</label>
                <input 
                  type="number"
                  name="femaleCount" 
                  value={form.femaleCount} 
                  onChange={handleNumberChange} 
                  min="0"
                  step="1"
                  inputMode="numeric"
                  disabled={pending}
                  className="w-full rounded-lg border border-gray-300 p-2 text-gray-900 focus:border-blue-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed" 
                />
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
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
            </div>
          </div>
        </div>
        
        <div className="mt-5 sticky bottom-0 bg-white pt-3 pb-3 flex items-center justify-between gap-2 border-t">
          {!canBook && !result && (
            <div className="text-xs text-red-600 space-y-1">
              <div className="font-medium">Can’t book yet:</div>
              <ul className="list-disc pl-4">
                {validationErrors.map((e, i) => (<li key={i}>{e}</li>))}
              </ul>
            </div>
          )}
          <button 
            onClick={onClose} 
            disabled={pending}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave} 
            disabled={!canBook}
            title={!canBook ? validationErrors[0] : undefined}
            className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {pending && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
            Book Beds
          </button>
        </div>
      </div>
    </div>
  );
}
