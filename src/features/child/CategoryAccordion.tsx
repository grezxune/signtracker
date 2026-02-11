export function CategoryAccordion({
  title,
  count,
  isExpanded,
  onToggle,
  children,
}: {
  title: string;
  count: number;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-4 transition hover:bg-gray-50"
      >
        <div className="flex items-center gap-3">
          <span className={`text-lg transition-transform ${isExpanded ? "rotate-90" : ""}`}>▶</span>
          <span className="text-lg font-semibold text-gray-800">{title}</span>
          <span className="text-base text-gray-500">({count})</span>
        </div>
      </button>
      {isExpanded && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}
