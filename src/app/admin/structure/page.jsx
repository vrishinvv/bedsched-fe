"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import {
  createStructureBlock,
  createStructureTent,
  fetchAdminStructure,
  updateStructureBlock,
  updateStructureLocation,
  updateStructureTent,
} from '@/lib/api';
import {
  BLOCK_TYPE_OPTIONS,
  StructureFormError,
  validateBlockForm,
  validateStructureName,
} from '@/lib/structureManagement.mjs';

function NameEditor({ value, label, saving, onSave, onError }) {
  const [name, setName] = useState(value || '');

  useEffect(() => setName(value || ''), [value]);

  const submit = async (event) => {
    event.preventDefault();
    try {
      const normalized = validateStructureName(name, `${label} name`);
      if (normalized === value) return;
      await onSave(normalized);
    } catch (error) {
      onError(error);
    }
  };

  return (
    <form onSubmit={submit} className="flex min-w-0 flex-1 items-center gap-2">
      <input
        aria-label={`${label} name`}
        value={name}
        onChange={(event) => setName(event.target.value)}
        maxLength={100}
        className="min-w-0 flex-1 rounded-md border border-white/15 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
      />
      <button
        type="submit"
        disabled={saving || name.trim() === (value || '')}
        className="rounded-md border border-blue-400/40 px-3 py-2 text-xs font-medium text-blue-200 hover:bg-blue-500/10 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {saving ? 'Saving…' : 'Rename'}
      </button>
    </form>
  );
}

function BlockEditor({ block, saving, onSave, onError }) {
  const [form, setForm] = useState({
    name: block.name || '',
    size: String(block.size),
    genderRestriction: block.genderRestriction,
  });

  useEffect(() => {
    setForm({
      name: block.name || '',
      size: String(block.size),
      genderRestriction: block.genderRestriction,
    });
  }, [block]);

  const submit = async (event) => {
    event.preventDefault();
    try {
      const payload = validateBlockForm(form);
      if (payload.size < block.size) {
        if (payload.size < block.highestActiveBed) {
          throw new StructureFormError(
            `This block cannot be reduced below bed ${block.highestActiveBed} while that bed has an active booking.`,
            'size'
          );
        }
        const confirmed = window.confirm(
          `Reduce ${block.name || `Block ${block.index}`} from ${block.size} to ${payload.size} beds? Historical bookings will be preserved.`
        );
        if (!confirmed) return;
      }
      await onSave(payload);
    } catch (error) {
      onError(error);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-lg border border-white/10 bg-black/20 p-3 md:grid-cols-[minmax(150px,1fr)_110px_150px_auto] md:items-end">
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-400">Block {block.index} name</label>
        <input
          value={form.name}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          maxLength={100}
          className="w-full rounded-md border border-white/15 bg-gray-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-400"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-400">Beds</label>
        <input
          type="number"
          min={1}
          max={10000}
          step={1}
          value={form.size}
          onChange={(event) => setForm((current) => ({ ...current, size: event.target.value }))}
          className="w-full rounded-md border border-white/15 bg-gray-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-400"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-400">Block type</label>
        <select
          value={form.genderRestriction}
          onChange={(event) => setForm((current) => ({ ...current, genderRestriction: event.target.value }))}
          className="w-full rounded-md border border-white/15 bg-gray-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-400"
        >
          {BLOCK_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={saving}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
      <div className="text-xs text-gray-500 md:col-span-4">
        {block.activeAllocations} active booking{block.activeAllocations === 1 ? '' : 's'}
        {block.highestActiveBed > 0 ? ` · highest occupied/reserved bed ${block.highestActiveBed}` : ''}
      </div>
    </form>
  );
}

function AddBlockForm({ tentId, saving, onCreate, onError }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', size: '', genderRestriction: 'both' });

  const submit = async (event) => {
    event.preventDefault();
    try {
      const payload = validateBlockForm(form);
      const created = await onCreate(tentId, payload);
      if (!created) return;
      setForm({ name: '', size: '', genderRestriction: 'both' });
      setOpen(false);
    } catch (error) {
      onError(error);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-dashed border-blue-400/40 px-3 py-2 text-sm text-blue-200 hover:bg-blue-500/10"
      >
        + Add block
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-lg border border-blue-400/20 bg-blue-500/5 p-3 sm:grid-cols-2 lg:grid-cols-[minmax(150px,1fr)_110px_150px_auto] lg:items-end">
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-300">Block name</label>
        <input
          value={form.name}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          placeholder="e.g. East block"
          maxLength={100}
          className="w-full rounded-md border border-white/15 bg-gray-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-400"
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-300">Beds</label>
        <input
          type="number"
          min={1}
          max={10000}
          step={1}
          value={form.size}
          onChange={(event) => setForm((current) => ({ ...current, size: event.target.value }))}
          className="w-full rounded-md border border-white/15 bg-gray-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-400"
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-300">Block type</label>
        <select
          value={form.genderRestriction}
          onChange={(event) => setForm((current) => ({ ...current, genderRestriction: event.target.value }))}
          className="w-full rounded-md border border-white/15 bg-gray-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-400"
        >
          {BLOCK_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50">
          {saving ? 'Adding…' : 'Add'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-white/15 px-3 py-2 text-sm text-gray-300 hover:bg-white/5">
          Cancel
        </button>
      </div>
    </form>
  );
}

function StructureContent() {
  const [locations, setLocations] = useState([]);
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionKey, setActionKey] = useState('');
  const [notice, setNotice] = useState(null);
  const [newTentName, setNewTentName] = useState('');

  const loadStructure = useCallback(async ({ initial = false } = {}) => {
    if (initial) setLoading(true);
    const result = await fetchAdminStructure();
    const nextLocations = result.locations || [];
    setLocations(nextLocations);
    setSelectedLocationId((current) => {
      if (current && nextLocations.some((location) => String(location.id) === String(current))) return current;
      return nextLocations[0] ? String(nextLocations[0].id) : '';
    });
    if (initial) setLoading(false);
  }, []);

  useEffect(() => {
    loadStructure({ initial: true }).catch((error) => {
      setNotice({ type: 'error', text: error.message || 'Failed to load accommodation structure.' });
      setLoading(false);
    });
  }, [loadStructure]);

  const selectedLocation = useMemo(
    () => locations.find((location) => String(location.id) === String(selectedLocationId)) || null,
    [locations, selectedLocationId]
  );

  const runAction = async (key, operation, successText) => {
    setActionKey(key);
    setNotice(null);
    try {
      await operation();
      await loadStructure();
      setNotice({ type: 'success', text: successText });
      return true;
    } catch (error) {
      setNotice({ type: 'error', text: error.message || 'The change could not be saved.' });
      return false;
    } finally {
      setActionKey('');
    }
  };

  const addTent = async (event) => {
    event.preventDefault();
    try {
      const name = validateStructureName(newTentName, 'Tent name');
      const created = await runAction(
        'add-tent',
        () => createStructureTent(selectedLocation.id, { name }),
        `Added ${name}.`
      );
      if (created) setNewTentName('');
    } catch (error) {
      setNotice({ type: 'error', text: error.message || 'The tent could not be added.' });
    }
  };

  const showFormError = (error) => {
    setNotice({ type: 'error', text: error.message || 'Check the form and try again.' });
  };

  if (loading) {
    return <div className="py-20 text-center text-gray-400">Loading accommodation structure…</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Accommodation Setup</h1>
        <p className="mt-1 text-sm text-gray-400">Manage names, tents, blocks, bed counts, and block types.</p>
      </div>

      {notice && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${
          notice.type === 'success'
            ? 'border-green-500/30 bg-green-500/10 text-green-100'
            : 'border-red-500/30 bg-red-500/10 text-red-100'
        }`}>
          {notice.text}
        </div>
      )}

      <section className="rounded-xl border border-white/10 bg-gray-900 p-5 shadow-xl">
        <label htmlFor="structure-location" className="mb-2 block text-sm font-medium text-gray-300">Location</label>
        <select
          id="structure-location"
          value={selectedLocationId}
          onChange={(event) => setSelectedLocationId(event.target.value)}
          className="w-full rounded-lg border border-white/15 bg-gray-950 px-3 py-2.5 text-white outline-none focus:border-blue-400 sm:max-w-md"
        >
          {locations.map((location) => (
            <option key={location.id} value={location.id}>{location.name}</option>
          ))}
        </select>
      </section>

      {selectedLocation ? (
        <>
          <section className="rounded-xl border border-white/10 bg-gray-900 p-5 shadow-xl">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Location name</div>
              <NameEditor
                value={selectedLocation.name}
                label="Location"
                saving={actionKey === `location-${selectedLocation.id}`}
                onSave={(name) => runAction(
                  `location-${selectedLocation.id}`,
                  () => updateStructureLocation(selectedLocation.id, { name }),
                  'Location name updated.'
                )}
                onError={showFormError}
              />
              <div className="whitespace-nowrap rounded-full bg-amber-400/10 px-3 py-1.5 text-xs font-medium text-amber-200">
                {selectedLocation.capacity} beds total
              </div>
            </div>
          </section>

          <div className="space-y-4">
            {selectedLocation.tents.map((tent) => (
              <section key={tent.id} className="rounded-xl border border-white/10 bg-gray-900 shadow-xl">
                <div className="border-b border-white/10 p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <span className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-gray-500">Tent {tent.index}</span>
                    <NameEditor
                      value={tent.name || `Tent ${tent.index}`}
                      label={`Tent ${tent.index}`}
                      saving={actionKey === `tent-${tent.id}`}
                      onSave={(name) => runAction(
                        `tent-${tent.id}`,
                        () => updateStructureTent(tent.id, { name }),
                        'Tent name updated.'
                      )}
                      onError={showFormError}
                    />
                    <span className="whitespace-nowrap rounded-full bg-white/5 px-3 py-1.5 text-xs text-gray-300">{tent.size} beds</span>
                  </div>
                </div>

                <div className="space-y-3 p-5">
                  {tent.blocks.length > 0 ? tent.blocks.map((block) => (
                    <BlockEditor
                      key={block.id}
                      block={block}
                      saving={actionKey === `block-${block.id}`}
                      onSave={(payload) => runAction(
                        `block-${block.id}`,
                        () => updateStructureBlock(block.id, payload),
                        `${payload.name} updated.`
                      )}
                      onError={showFormError}
                    />
                  )) : (
                    <div className="rounded-lg border border-dashed border-white/10 px-4 py-8 text-center text-sm text-gray-500">
                      This tent has no blocks yet.
                    </div>
                  )}

                  <AddBlockForm
                    tentId={tent.id}
                    saving={actionKey === `add-block-${tent.id}`}
                    onCreate={(tentId, payload) => runAction(
                      `add-block-${tentId}`,
                      () => createStructureBlock(tentId, payload),
                      `${payload.name} added.`
                    )}
                    onError={showFormError}
                  />
                </div>
              </section>
            ))}
          </div>

          <section className="rounded-xl border border-dashed border-white/15 bg-gray-900/60 p-5">
            <h2 className="font-semibold text-white">Add tent</h2>
            <p className="mt-1 text-xs text-gray-400">The new tent starts with zero beds; add blocks to define its capacity.</p>
            <form onSubmit={addTent} className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input
                value={newTentName}
                onChange={(event) => setNewTentName(event.target.value)}
                placeholder="Tent name"
                maxLength={100}
                required
                className="min-w-0 flex-1 rounded-md border border-white/15 bg-gray-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-400"
              />
              <button
                type="submit"
                disabled={actionKey === 'add-tent'}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {actionKey === 'add-tent' ? 'Adding…' : 'Add tent'}
              </button>
            </form>
          </section>

          <div className="rounded-lg border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-xs text-amber-100/80">
            Tent and location totals are recalculated automatically from block sizes. Reducing a block never deletes history and is refused if an active or future booking uses a bed above the new limit.
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-white/10 bg-gray-900 px-5 py-10 text-center text-gray-400">No locations found.</div>
      )}
    </div>
  );
}

export default function StructurePage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <StructureContent />
    </ProtectedRoute>
  );
}
