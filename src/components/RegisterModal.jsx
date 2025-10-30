'use client';
import { useState, useEffect } from 'react';
import Notification from './Notification';

export default function RegisterModal({ open, onClose, onSuccess, defaultValues = {} , smartReserveFn, locationNames = {} }) {
  const [form, setForm] = useState({
    contactName: defaultValues.contactName || '',
    phone: defaultValues.phone || '',
    isFamily: defaultValues.isFamily ?? false,
    maleCount: defaultValues.maleCount || 0,
    femaleCount: defaultValues.femaleCount || 0,
    startDate: defaultValues.startDate || '',
    endDate: defaultValues.endDate || '',
  });
  const [pending, setPending] = useState(false);
  const [notification, setNotification] = useState(null);
  const [confirmCtx, setConfirmCtx] = useState(null); // { type: 'mixed-blocks'|'split', preview: [...] }
  const [result, setResult] = useState(null); // store reservation result for summary

  const getTodayIST = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

  // Reset modal state on reopen so it doesn't retain old state
  useEffect(() => {
    if (open) {
      setForm({
        contactName: defaultValues.contactName || '',
        phone: defaultValues.phone || '',
        isFamily: defaultValues.isFamily ?? false,
        maleCount: defaultValues.maleCount || 0,
        femaleCount: defaultValues.femaleCount || 0,
        startDate: defaultValues.startDate || '',
        endDate: defaultValues.endDate || '',
      });
      setPending(false);
      setNotification(null);
      setConfirmCtx(null);
      setResult(null);
    }
  }, [open]);

  if (!open) return null;

  const total = Number(form.maleCount || 0) + Number(form.femaleCount || 0);

  const show = (type, message) => setNotification({ type, message });
  const closeNote = () => setNotification(null);

  const handleReserve = async (confirmFallback = false) => {
    try {
      setPending(true);
      setResult(null);
      closeNote(); // Clear any previous notifications immediately
      // Basic validations
      if (!/^\d{10}$/.test(form.phone)) {
        show('error', 'Please enter a valid 10-digit phone number.');
        return;
      }
      if (!form.startDate || !form.endDate) {
        show('error', 'Start and End dates are required.');
        return;
      }
      const today = getTodayIST();
      if (form.endDate < today) {
        show('error', 'End date must be today or later.');
        return;
      }
      if (form.endDate < form.startDate) {
        show('error', 'End date cannot be before start date.');
        return;
      }
      const payload = {
        contactName: form.contactName || undefined,
        phone: form.phone,
        isFamily: !!form.isFamily,
        maleCount: parseInt(form.maleCount || 0, 10),
        femaleCount: parseInt(form.femaleCount || 0, 10),
        startDate: form.startDate,
        endDate: form.endDate,
        confirmFallback,
      };
      const res = await smartReserveFn(payload);
      setResult(res);
      show('success', `Reserved ${res.items?.length || total} seats. Batch: ${res.batchId}`);
      onSuccess?.(res);
    } catch (e) {
      // 409 requires_confirmation path: attached to error.response?.data
      const data = e.response?.data || {};
      if (data.requiresConfirmation) {
        setConfirmCtx({ type: data.requiresConfirmation, preview: data.preview || [] });
        show('warning', data.message || 'Confirmation required to proceed.');
      } else {
        show('error', e.message || 'Failed to reserve');
      }
    } finally {
      setPending(false);
    }
  };

  // Build a list of unmet requirements to explain disabled state
  const validationErrors = (() => {
    const errs = [];
    if (!/^\d{10}$/.test(form.phone)) errs.push('Enter a valid 10-digit phone number');
    if (!form.startDate) errs.push('Start date is required');
    if (!form.endDate) errs.push('End date is required');
    const today = getTodayIST();
    if (form.endDate && form.endDate < today) errs.push('End date must be today or later');
    if (form.startDate && form.endDate && form.endDate < form.startDate) errs.push('End date cannot be before start date');
    if (total <= 0) errs.push('Add at least 1 person (male or female)');
    return errs;
  })();
  const canReserve = validationErrors.length === 0 && !pending && !result && !confirmCtx;

  // Group items by (locationId, tentIndex, blockIndex) with gender breakdown
  const grouped = () => {
    if (!result?.items) return [];
    console.log('Result items:', result.items);
    const map = new Map();
    for (const it of result.items) {
      const loc = result.locationId || it.locationId;
      const key = `${loc}-${it.tentIndex}-${it.blockIndex}`;
      if (!map.has(key)) {
        map.set(key, { total: 0, males: 0, females: 0, others: 0 });
      }
      const entry = map.get(key);
      entry.total += 1;
      if (it.gender === 'Male') entry.males += 1;
      else if (it.gender === 'Female') entry.females += 1;
      else entry.others += 1;
    }
    const grouped = Array.from(map.entries()).map(([k, stats]) => {
      const [loc, tent, block] = k.split('-').map(Number);
      return { locationId: loc, tentIndex: tent, blockIndex: block, ...stats };
    });
    console.log('Grouped data:', grouped);
    return grouped;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="w-full h-full sm:h-auto sm:max-w-xl rounded-none sm:rounded-2xl bg-white shadow-xl overflow-hidden text-gray-900">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 sm:px-6 py-3 sm:py-4">
          <h3 className="text-base sm:text-lg font-semibold text-white">Register Guests (Global Reserve)</h3>
        </div>

        <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-4 overflow-y-auto max-h-[calc(100vh-140px)] sm:max-h-none">
          {pending && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 text-blue-800 p-3 flex items-center gap-3">
              <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
              </svg>
              Processing reservation…
            </div>
          )}

          {result && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-900 p-3">
              <div className="font-semibold mb-2">Reserved Summary (Gender Breakdown)</div>
              <ul className="space-y-2 text-sm">
                {grouped().map((g) => (
                  <li key={`${g.locationId}-${g.tentIndex}-${g.blockIndex}`} className="border-b border-emerald-200 pb-2 last:border-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-semibold">{g.total}</span>
                      <span className="font-medium">
                        {locationNames[g.locationId] ? locationNames[g.locationId] : `Location ${g.locationId}`} • Tent {g.tentIndex} • Block {g.blockIndex}
                      </span>
                    </div>
                    <div className="ml-8 text-xs text-emerald-700 flex gap-3">
                      {g.males > 0 && <span>👨 {g.males} Male{g.males > 1 ? 's' : ''}</span>}
                      {g.females > 0 && <span>👩 {g.females} Female{g.females > 1 ? 's' : ''}</span>}
                      {g.others > 0 && <span>👤 {g.others} Other{g.others > 1 ? 's' : ''}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Contact Name</label>
              <input
                type="text"
                className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900 placeholder-gray-400"
                value={form.contactName}
                onChange={(e)=>setForm(f=>({...f, contactName: e.target.value }))}
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Phone*</label>
              <input
                type="tel"
                className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900 placeholder-gray-400"
                value={form.phone}
                onChange={(e)=>{
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setForm(f=>({...f, phone: digits }));
                }}
                inputMode="numeric"
                pattern="\\d{10}"
                maxLength={10}
                placeholder="10-digit phone"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input id="isFamily" type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" checked={!!form.isFamily} onChange={(e)=>setForm(f=>({...f, isFamily: e.target.checked }))} />
            <label htmlFor="isFamily" className="text-sm text-gray-700">Family (prefer together)</label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Male Count</label>
              <input type="number" min={0} step={1} inputMode="numeric" className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900" value={form.maleCount} onChange={(e)=>{
                const v = parseInt(e.target.value, 10);
                setForm(f=>({...f, maleCount: isNaN(v) ? 0 : Math.max(0, v) }));
              }} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Female Count</label>
              <input type="number" min={0} step={1} inputMode="numeric" className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900" value={form.femaleCount} onChange={(e)=>{
                const v = parseInt(e.target.value, 10);
                setForm(f=>({...f, femaleCount: isNaN(v) ? 0 : Math.max(0, v) }));
              }} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Start Date</label>
              <input type="date" className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900" value={form.startDate} onChange={(e)=>setForm(f=>({...f, startDate: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">End Date</label>
              <input type="date" min={getTodayIST()} className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900" value={form.endDate} onChange={(e)=>setForm(f=>({...f, endDate: e.target.value }))} />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">Total: <span className="font-semibold">{total}</span></div>
            {confirmCtx?.type && (
              <div className="text-xs text-amber-600">Requires confirmation: {confirmCtx.type === 'mixed-blocks' ? 'use mixed blocks' : 'split group'}</div>
            )}
          </div>
        </div>

          <div className="flex items-center justify-between gap-3 border-t px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 sticky bottom-0">
            {/* Explain disabled state */}
            {!canReserve && !result && !pending && (
              <div className="text-xs text-red-600 space-y-1">
                <div className="font-medium">Can't reserve yet:</div>
                <ul className="list-disc pl-4">
                  {validationErrors.map((e, i) => (<li key={i}>{e}</li>))}
                </ul>
              </div>
            )}
          <button onClick={onClose} className="px-3 sm:px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100">{result ? 'Close' : 'Cancel'}</button>
            {!result && !confirmCtx && (
            <button disabled={!canReserve} title={!canReserve ? validationErrors[0] : undefined} onClick={()=>handleReserve(false)} className="px-3 sm:px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">Reserve</button>
          )}
          {!result && confirmCtx && (
            <button disabled={pending} onClick={()=>handleReserve(true)} className="px-3 sm:px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">Proceed Anyway</button>
          )}
        </div>

        <Notification notification={notification} onClose={()=>setNotification(null)} />
      </div>
    </div>
  );
}
