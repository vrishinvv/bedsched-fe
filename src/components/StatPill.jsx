export default function StatPill({ label, value }) {
    return (
        <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
            <span className="opacity-70">{label}</span>
            <span className="text-gray-900">{value}</span>
        </div>
    );
}