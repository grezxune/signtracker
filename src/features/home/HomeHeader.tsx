import Image from "next/image";
import Link from "next/link";
import { signOut } from "next-auth/react";
import type { Session } from "next-auth";

export function HomeHeader({ session }: { session: Session }) {
  return (
    <header className="bg-white shadow-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <h1 className="text-2xl font-bold text-indigo-600">🤟 SignTracker</h1>
        <div className="flex items-center gap-4">
          <Link href="/dictionary" className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
            📚 Dictionary
          </Link>
          <div className="flex items-center gap-2">
            {session.user?.image && (
              <Image
                src={session.user.image}
                alt=""
                width={32}
                height={32}
                unoptimized
                className="h-8 w-8 rounded-full"
              />
            )}
            <span className="hidden text-sm text-gray-600 sm:inline">
              {session.user?.name || session.user?.email}
            </span>
          </div>
          <button
            type="button"
            onClick={() => signOut()}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}
