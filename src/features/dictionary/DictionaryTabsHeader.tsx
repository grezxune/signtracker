import Link from "next/link";

export function DictionaryTabsHeader({
  activeTab,
  onTabChange,
}: {
  activeTab: "browse" | "add";
  onTabChange: (tab: "browse" | "add") => void;
}) {
  return (
    <>
      <header className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Link href="/" className="-ml-2 p-2 text-xl text-gray-600 hover:text-gray-800">
            ←
          </Link>
          <h1 className="text-xl font-bold text-gray-800">📚 Sign Dictionary</h1>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-4">
        <div className="flex gap-2">
          <button type="button" onClick={() => onTabChange("browse")} className={`whitespace-nowrap rounded-xl px-4 py-3 text-base font-medium transition ${activeTab === "browse" ? "bg-indigo-600 text-white shadow-sm" : "bg-white text-gray-700 shadow-sm"}`}>Browse Dictionary</button>
          <button type="button" onClick={() => onTabChange("add")} className={`whitespace-nowrap rounded-xl px-4 py-3 text-base font-medium transition ${activeTab === "add" ? "bg-indigo-600 text-white shadow-sm" : "bg-white text-gray-700 shadow-sm"}`}>+ Add New Sign</button>
        </div>
      </div>
    </>
  );
}
