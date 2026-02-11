import Link from "next/link";

export function ChildHeader({ childName }: { childName: string }) {
  return (
    <header className="sticky top-0 z-10 bg-white shadow-sm">
      <div className="mx-auto max-w-5xl px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="-ml-2 p-2 text-xl text-gray-600 hover:text-gray-800">
              ←
            </Link>
            <h1 className="truncate text-xl font-bold text-gray-800">{childName}</h1>
          </div>
          <Link href="/dictionary" className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
            📚 Dictionary
          </Link>
        </div>
      </div>
    </header>
  );
}
