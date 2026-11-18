export function buildReallocationContext(allocation) {
  return {
    name: allocation?.name || 'Guest',
    location: allocation?.location_name || 'Unknown location',
    tent: allocation?.tent_name || `Section ${allocation?.tent_index ?? '—'}`,
    block: allocation?.block_name || `Room ${allocation?.block_index ?? '—'}`,
    bed: allocation?.bed_number,
    startDate: allocation?.start_date,
    endDate: allocation?.end_date,
    createdAt: allocation?.created_at,
    caretakerForName: allocation?.caretaker_for_name,
    caretakerForBedNumber: allocation?.caretaker_for_bed,
    saiConnectAge: allocation?.sai_connect_age,
    isCaretaker: Boolean(allocation?.caretaker_for_allocation_id),
  };
}
