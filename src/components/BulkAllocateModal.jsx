'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import CameraCapture from '@/components/CameraCapture';
import { complementBulkGenderCounts } from '@/lib/bulkBooking.mjs';
import {
  BOOKING_MAX_DATE as MAX_DATE,
  BOOKING_MIN_DATE as MIN_DATE,
  BOOKING_WINDOW_LABEL,
  getDefaultBookingDates,
  isWithinBookingWindow,
} from '@/lib/bookingWindow.mjs';

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
  return { ...extra, ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

function initialForm(selectedCount, genderRestriction) {
  return {
    name: '',
    phone: '',
    maleCount: genderRestriction === 'female_only' ? 0 : selectedCount,
    femaleCount: genderRestriction === 'female_only' ? selectedCount : 0,
    ...getDefaultBookingDates(),
  };
}

function formatBedSelection(bedNumbers) {
  if (!bedNumbers.length) return '';
  const ranges = [];
  let start = bedNumbers[0];
  let end = start;
  for (let index = 1; index <= bedNumbers.length; index += 1) {
    const current = bedNumbers[index];
    if (current === end + 1) {
      end = current;
      continue;
    }
    ranges.push(start === end ? String(start) : `${start}–${end}`);
    start = current;
    end = current;
  }
  return ranges.join(', ');
}

export default function BulkAllocateModal({
  open,
  onClose,
  genderRestriction = 'both',
  onSave,
  selectedBedNumbers = [],
  locationId,
  tentIndex,
  blockIndex,
}) {
  const normalizedBeds = useMemo(
    () => Array.from(new Set(selectedBedNumbers.map(Number))).sort((left, right) => left - right),
    [selectedBedNumbers],
  );
  const selectedCount = normalizedBeds.length;
  const [form, setForm] = useState(() => initialForm(selectedCount, genderRestriction));
  const [personPhoto, setPersonPhoto] = useState({ blob: null, dataUrl: null });
  const [aadhaarPhoto, setAadhaarPhoto] = useState({ blob: null, dataUrl: null });
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState(null);
  const dialogRef = useRef(null);

  const isMaleOnly = genderRestriction === 'male_only';
  const isFemaleOnly = genderRestriction === 'female_only';
  const isGenderRestricted = isMaleOnly || isFemaleOnly;
  const totalPeople = Number(form.maleCount) + Number(form.femaleCount);
  const selectionLabel = formatBedSelection(normalizedBeds);

  useEffect(() => {
    if (!open) return;
    setForm(initialForm(selectedCount, genderRestriction));
    setPersonPhoto({ blob: null, dataUrl: null });
    setAadhaarPhoto({ blob: null, dataUrl: null });
    setPending(false);
    setResult(null);
  }, [open, selectedCount, genderRestriction]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape' && !pending) onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, pending]);

  if (!open) return null;

  function handleChange(event) {
    const { name, value } = event.target;
    if (name === 'phone') {
      setForm((current) => ({ ...current, phone: value.replace(/\D/g, '').slice(0, 10) }));
      return;
    }
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleCountChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      ...complementBulkGenderCounts(name, value, selectedCount),
    }));
  }

  function generatePhotoKey(photoType) {
    const safeName = (form.name || 'representative')
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase();
    const firstBed = normalizedBeds[0] || 'selected';
    const suffix = photoType === 'person' ? 'person' : 'identity';
    return `location-${locationId}/tent-${tentIndex}/block-${blockIndex}/bulk-${firstBed}-${Date.now()}-${safeName}-${suffix}.jpg`;
  }

  async function uploadPhoto(blob, photoType, key) {
    const response = await fetch(`${API_BASE_URL}/api/upload-url`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ photoType, locationId, tentIndex, blockIndex, key }),
    });
    if (!response.ok) throw new Error(`Could not prepare the ${photoType} photo upload.`);
    const { uploadUrl } = await response.json();
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/jpeg' },
      body: blob,
    });
    if (!uploadResponse.ok) throw new Error(`Could not upload the ${photoType} photo.`);
    return key;
  }

  const validationErrors = [];
  if (!form.name.trim()) validationErrors.push('Representative name is required');
  if (!/^\d{10}$/.test(form.phone)) validationErrors.push('Enter a valid 10-digit phone number');
  if (!personPhoto.blob) validationErrors.push('Representative photo is required');
  if (!aadhaarPhoto.blob) validationErrors.push('Aadhaar or identity photo is required');
  if (!form.startDate || !isWithinBookingWindow(form.startDate)) validationErrors.push(`Start date must be ${BOOKING_WINDOW_LABEL}`);
  if (!form.endDate || !isWithinBookingWindow(form.endDate)) validationErrors.push(`End date must be ${BOOKING_WINDOW_LABEL}`);
  if (form.startDate && form.endDate && form.endDate < form.startDate) validationErrors.push('End date cannot be before start date');
  if (selectedCount === 0) validationErrors.push('Select at least one bed');
  if (selectedCount > 250) validationErrors.push('Select no more than 250 beds');
  if (totalPeople !== selectedCount) validationErrors.push(`Male and female counts must total ${selectedCount}`);
  if (isMaleOnly && Number(form.femaleCount) > 0) validationErrors.push('This block is male only');
  if (isFemaleOnly && Number(form.maleCount) > 0) validationErrors.push('This block is female only');
  const canBook = validationErrors.length === 0 && !pending && !result;

  async function handleSave() {
    if (!canBook) return;
    setPending(true);
    try {
      const [personPhotoKey, aadhaarPhotoKey] = await Promise.all([
        uploadPhoto(personPhoto.blob, 'person', generatePhotoKey('person')),
        uploadPhoto(aadhaarPhoto.blob, 'aadhaar', generatePhotoKey('aadhaar')),
      ]);
      const saveResult = await onSave({
        name: form.name.trim(),
        phone: form.phone,
        maleCount: Number(form.maleCount),
        femaleCount: Number(form.femaleCount),
        startDate: form.startDate,
        endDate: form.endDate,
        personPhotoKey,
        aadhaarPhotoKey,
        bedNumbers: normalizedBeds,
      });
      setResult(saveResult);
    } catch (error) {
      setResult({ success: [], errors: [{ message: error.message || 'Bulk booking failed.' }] });
    } finally {
      setPending(false);
    }
  }

  if (result) {
    const successfulBookings = result.success || [];
    const errors = result.errors || [];
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" data-preserve-selection="true">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="bulk-result-title" className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
          <div className="border-b border-gray-200 p-5">
            <h3 id="bulk-result-title" className="text-xl font-semibold text-gray-950">Bulk booking result</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            {successfulBookings.length > 0 && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
                <p className="font-semibold">Booked all {successfulBookings.length} selected beds</p>
                <p className="mt-1 text-sm">Beds {formatBedSelection(successfulBookings.map((item) => item.bedNumber))}</p>
              </div>
            )}
            {errors.length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-950">
                <p className="font-semibold">No beds were booked</p>
                {errors.map((error, index) => <p className="mt-1 text-sm" key={`${error.message}-${index}`}>{error.message}</p>)}
              </div>
            )}
          </div>
          <div className="flex justify-end border-t border-gray-200 p-4">
            <button type="button" onClick={onClose} className="min-h-11 rounded-lg bg-gray-950 px-4 text-sm font-medium text-white hover:bg-black">Close</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-stretch justify-center sm:items-center sm:p-4" data-preserve-selection="true">
      <div className="absolute inset-0 bg-black/50" onClick={pending ? undefined : onClose} />
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="bulk-booking-title" className="relative h-full w-full overflow-y-auto bg-white shadow-xl sm:max-h-[94vh] sm:max-w-2xl sm:rounded-2xl">
        {pending && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/95 p-6 text-center">
            <div>
              <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-gray-300 border-t-gray-950" />
              <p className="mt-3 text-sm font-medium text-gray-800">Uploading photos and booking {selectedCount} beds…</p>
              <p className="mt-1 text-xs text-gray-600">The selected range is locked until this finishes.</p>
            </div>
          </div>
        )}

        <div className="border-b border-gray-200 px-5 py-4 sm:px-6">
          <h3 id="bulk-booking-title" className="text-xl font-semibold text-gray-950">Book selected beds</h3>
          <p className="mt-1 text-sm text-gray-600">One representative’s details and both photos will be stored on every booking in this group.</p>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <section className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm font-medium text-gray-950">{selectedCount} selected beds</p>
            <p className="mt-1 text-sm tabular-nums text-gray-600">Beds {selectionLabel}</p>
          </section>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="bulk-name" className="mb-2 block text-sm font-medium text-gray-800">Representative name</label>
              <input id="bulk-name" name="name" value={form.name} onChange={handleChange} disabled={pending} className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-gray-950 placeholder:text-gray-500 focus:border-gray-700 focus:outline-none" placeholder="Full name" />
            </div>
            <div>
              <label htmlFor="bulk-phone" className="mb-2 block text-sm font-medium text-gray-800">Representative phone</label>
              <input id="bulk-phone" name="phone" value={form.phone} onChange={handleChange} disabled={pending} type="tel" inputMode="numeric" maxLength={10} className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-gray-950 placeholder:text-gray-500 focus:border-gray-700 focus:outline-none" placeholder="10-digit phone" />
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-end justify-between gap-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-950">Group count</h4>
                <p className="mt-1 text-xs text-gray-600">Changing either count automatically updates the other.</p>
              </div>
              <p className="text-sm font-medium tabular-nums text-emerald-700">{selectedCount} of {selectedCount} assigned</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="bulk-male-count" className="mb-2 block text-sm font-medium text-gray-800">Male count</label>
                <input id="bulk-male-count" name="maleCount" type="number" inputMode="numeric" min={0} max={selectedCount} value={form.maleCount} onChange={handleCountChange} disabled={pending || isGenderRestricted} className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-gray-950 disabled:bg-gray-100 disabled:text-gray-600" />
              </div>
              <div>
                <label htmlFor="bulk-female-count" className="mb-2 block text-sm font-medium text-gray-800">Female count</label>
                <input id="bulk-female-count" name="femaleCount" type="number" inputMode="numeric" min={0} max={selectedCount} value={form.femaleCount} onChange={handleCountChange} disabled={pending || isGenderRestricted} className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-gray-950 disabled:bg-gray-100 disabled:text-gray-600" />
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="bulk-start-date" className="mb-2 block text-sm font-medium text-gray-800">Start date</label>
              <input id="bulk-start-date" type="date" name="startDate" value={form.startDate} onChange={handleChange} min={MIN_DATE} max={MAX_DATE} disabled={pending} className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-gray-950" />
              <p className="mt-1 text-xs text-gray-600">{BOOKING_WINDOW_LABEL}</p>
            </div>
            <div>
              <label htmlFor="bulk-end-date" className="mb-2 block text-sm font-medium text-gray-800">End date</label>
              <input id="bulk-end-date" type="date" name="endDate" value={form.endDate} onChange={handleChange} min={MIN_DATE} max={MAX_DATE} disabled={pending} className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-gray-950" />
              <p className="mt-1 text-xs text-gray-600">{BOOKING_WINDOW_LABEL}</p>
            </div>
          </section>

          <section className="border-t border-gray-200 pt-5">
            <h4 className="text-sm font-semibold text-gray-950">Representative photos</h4>
            <p className="mb-4 mt-1 text-xs text-gray-600">The same person and identity images will represent all {selectedCount} people.</p>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <CameraCapture label="Representative Photo *" onCapture={(blob, dataUrl) => setPersonPhoto({ blob, dataUrl })} existingPhotoUrl={personPhoto.dataUrl} />
              <CameraCapture label="Aadhaar / Identity Photo *" onCapture={(blob, dataUrl) => setAadhaarPhoto({ blob, dataUrl })} existingPhotoUrl={aadhaarPhoto.dataUrl} />
            </div>
          </section>
        </div>

        <div className="sticky bottom-0 border-t border-gray-200 bg-white px-5 py-4 sm:px-6">
          {validationErrors.length > 0 && <p className="mb-3 text-sm text-red-700">{validationErrors[0]}</p>}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} disabled={pending} className="min-h-11 rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-60">Cancel</button>
            <button type="button" onClick={handleSave} disabled={!canBook} title={!canBook ? validationErrors[0] : undefined} className="min-h-11 rounded-lg bg-gray-950 px-4 text-sm font-medium text-white hover:bg-black disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600">Book {selectedCount} beds</button>
          </div>
        </div>
      </div>
    </div>
  );
}
