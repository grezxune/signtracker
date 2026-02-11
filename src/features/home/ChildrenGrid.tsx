import Link from "next/link";
import type { ChildSummary } from "./types";

export function ChildrenGrid({ childCards, onOpenAdd }: { childCards: ChildSummary[]; onOpenAdd: () => void }) {
  if (childCards.length === 0) {
    return (
      <div className="rounded-xl bg-white p-12 text-center shadow-sm">
        <div className="mb-4 text-6xl">👶</div>
        <h3 className="mb-2 text-xl font-semibold text-gray-800">No children yet</h3>
        <p className="mb-4 text-gray-600">Add your first child to start tracking their ASL progress!</p>
        <button
          data-testid="empty-add-child-open"
          type="button"
          onClick={onOpenAdd}
          className="rounded-lg bg-indigo-600 px-6 py-2 text-white transition hover:bg-indigo-700"
        >
          Add Child
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {childCards.map((child) => (
        <Link
          key={child._id}
          href={`/child/${child._id}`}
          data-testid={`child-card-${child._id}`}
          className="block rounded-xl bg-white p-6 shadow-sm transition hover:shadow-md"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-2xl">
              {child.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-800">{child.name}</h3>
              <p className="text-sm text-gray-600">{child.signCount} signs learned</p>
              {child.role === "shared" && (
                <span className="mt-1 inline-block rounded bg-blue-100 px-2 py-1 text-xs text-blue-700">
                  Shared with you
                </span>
              )}
            </div>
            <div className="text-indigo-500">→</div>
          </div>
        </Link>
      ))}
    </div>
  );
}
