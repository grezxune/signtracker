"use client";

import { useSession, signOut } from "next-auth/react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // Sync user to Convex on sign in
  const getOrCreateUser = useMutation(api.users.getOrCreate);
  
  useEffect(() => {
    if (session?.user?.email) {
      getOrCreateUser({
        email: session.user.email,
        name: session.user.name || undefined,
        image: session.user.image || undefined,
      });
    }
  }, [session, getOrCreateUser]);
  
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mb-4"></div>
          <div className="text-white text-lg font-medium">Loading...</div>
        </div>
      </div>
    );
  }
  
  if (!session) {
    router.push("/auth/signin");
    return null;
  }
  
  return <Dashboard session={session} />;
}

function Dashboard({ session }: { session: any }) {
  const email = session.user?.email ?? undefined;
  const children = useQuery(api.children.list, { email }) || [];
  const createChild = useMutation(api.children.create);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newBirthDate, setNewBirthDate] = useState("");
  
  const handleAddChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !email) return;
    
    await createChild({ 
      email,
      name: newName.trim(),
      birthDate: newBirthDate || undefined,
    });
    setNewName("");
    setNewBirthDate("");
    setShowAdd(false);
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-indigo-600">🤟 SignTracker</h1>
          <div className="flex items-center gap-4">
            <Link
              href="/dictionary"
              className="text-indigo-600 hover:text-indigo-800 font-medium text-sm"
            >
              📚 Dictionary
            </Link>
            <div className="flex items-center gap-2">
              {session.user?.image && (
                <img 
                  src={session.user.image} 
                  alt="" 
                  className="w-8 h-8 rounded-full"
                />
              )}
              <span className="text-gray-600 text-sm hidden sm:inline">
                {session.user?.name || session.user?.email}
              </span>
            </div>
            <button
              onClick={() => signOut()}
              className="text-gray-600 hover:text-gray-800 text-sm"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-800">My Children</h2>
          <button
            onClick={() => setShowAdd(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
          >
            + Add Child
          </button>
        </div>
        
        {/* Add Child Form */}
        {showAdd && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h3 className="font-semibold text-gray-800 mb-4">Add a Child</h3>
            <form onSubmit={handleAddChild} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900 bg-white"
                  placeholder="Child's name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Birth Date (optional)</label>
                <input
                  type="date"
                  value={newBirthDate}
                  onChange={(e) => setNewBirthDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900 bg-white"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
        
        {/* Children List */}
        {children.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="text-6xl mb-4">👶</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No children yet</h3>
            <p className="text-gray-600 mb-4">Add your first child to start tracking their ASL progress!</p>
            <button
              onClick={() => setShowAdd(true)}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition"
            >
              Add Child
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {children.map((child: any) => (
              <Link
                key={child._id}
                href={`/child/${child._id}`}
                className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition block"
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center text-2xl">
                    {child.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800 text-lg">{child.name}</h3>
                    <p className="text-gray-600 text-sm">
                      {child.signCount} signs learned
                    </p>
                    {child.role === "shared" && (
                      <span className="inline-block bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded mt-1">
                        Shared with you
                      </span>
                    )}
                  </div>
                  <div className="text-indigo-500">→</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
