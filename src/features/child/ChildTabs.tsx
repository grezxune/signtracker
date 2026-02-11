export function ChildTabs({
  activeTab,
  onTabChange,
  totalSigns,
  canShare,
}: {
  activeTab: "signs" | "share";
  onTabChange: (tab: "signs" | "share") => void;
  totalSigns: number;
  canShare: boolean;
}) {
  return (
    <div className="mx-auto max-w-5xl px-4 pb-2">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2">
        <button
          data-testid="child-signs-tab"
          type="button"
          onClick={() => onTabChange("signs")}
          className={`whitespace-nowrap rounded-xl px-4 py-3 text-base font-medium transition ${
            activeTab === "signs" ? "bg-indigo-600 text-white shadow-sm" : "bg-white text-gray-700 shadow-sm"
          }`}
        >
          Signs ({totalSigns})
        </button>
        {canShare && (
          <button
            data-testid="child-share-tab"
            type="button"
            onClick={() => onTabChange("share")}
            className={`whitespace-nowrap rounded-xl px-4 py-3 text-base font-medium transition ${
              activeTab === "share" ? "bg-indigo-600 text-white shadow-sm" : "bg-white text-gray-700 shadow-sm"
            }`}
          >
            Share
          </button>
        )}
      </div>
    </div>
  );
}
