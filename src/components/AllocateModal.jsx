'use client';
import { useEffect, useRef, useState } from 'react';

export default function AllocateModal({
  open,
  onClose,
  bedNumber,
  initialData, // null for new; { name, phone, gender, startDate, endDate }
  onSave,
  onDelete,
}) {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    gender: 'Male', // Set default value instead of empty string
    startDate: '',
    endDate: '',
  });
  const ref = useRef(null);

  // Helper function to get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  useEffect(() => {
    if (open) {
      if (initialData) {
        // When editing, use existing data
        setForm({
          name: initialData.name || '',
          phone: initialData.phone || '',
          gender: initialData.gender || 'Male', // Ensure default if not set
          startDate: initialData.startDate || '',
          endDate: initialData.endDate || '',
        });
      } else {
        // When creating new, reset to defaults
        setForm({
          name: '',
          phone: '',
          gender: 'Male', // Explicit default
          startDate: '',
          endDate: '',
        });
      }
    }
  }, [open, initialData]);

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!open) return null;

  const isEdit = Boolean(initialData);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  function handleSave() {
    // Lightweight client validation
    if (!form.name || !form.startDate || !form.endDate) {
      return alert('Name, start & end dates are required');
    }

    const today = getTodayDate();
    
    // Check if start date is in the past
    if (form.startDate < today) {
      return alert('Start date cannot be in the past. Please select today or a future date.');
    }
    
    // Check if end date is before start date
    if (form.endDate < form.startDate) {
      return alert('End date cannot be before start date.');
    }

    // Ensure gender has a value (fallback to Male if somehow empty)
    const payload = {
      ...form,
      gender: form.gender || 'Male'
    };

    onSave(payload);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div ref={ref} className="relative w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          {isEdit ? `Edit allocation — Bed ${bedNumber}` : `Allocate bed — Bed ${bedNumber}`}
        </h3>
        
        {/* Show current date for reference */}
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            <span className="font-medium">Today's date:</span> {getTodayDate()} 
            <span className="text-blue-600 ml-2">(Bookings cannot be made for past dates)</span>
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">Name*</label>
            <input 
              name="name" 
              value={form.name} 
              onChange={handleChange} 
              className="w-full rounded-lg border border-gray-300 p-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none" 
              placeholder="Full name" 
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Phone</label>
            <input 
              name="phone" 
              value={form.phone} 
              onChange={handleChange} 
              className="w-full rounded-lg border border-gray-300 p-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none" 
              placeholder="Optional" 
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Gender*</label>
            <select 
              name="gender" 
              value={form.gender} 
              onChange={handleChange} 
              className="w-full rounded-lg border border-gray-300 p-2 text-gray-900 focus:border-blue-500 focus:outline-none"
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Start date*</label>
            <input 
              type="date" 
              name="startDate" 
              value={form.startDate} 
              onChange={handleChange}
              min={getTodayDate()} // Prevent selecting past dates
              className="w-full rounded-lg border border-gray-300 p-2 text-gray-900 focus:border-blue-500 focus:outline-none" 
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">End date*</label>
            <input 
              type="date" 
              name="endDate" 
              value={form.endDate} 
              onChange={handleChange}
              min={form.startDate || getTodayDate()} // End date should be at least start date
              className="w-full rounded-lg border border-gray-300 p-2 text-gray-900 focus:border-blue-500 focus:outline-none" 
            />
          </div>
        </div>
        <div className="mt-5 flex items-center justify-between">
          {isEdit ? (
            <button onClick={onDelete} className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">Deallocate</button>
          ) : <span />}
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">Cancel</button>
            <button onClick={handleSave} className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-black">{isEdit ? 'Save changes' : 'Allocate'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}