"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useState, use } from "react";
import Link from "next/link";
import { ASL_SIGNS, ASL_CATEGORIES } from "@/lib/asl-dictionary";

export default function ChildPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const childId = id as Id<"children">;
  const child = useQuery(api.children.get, { childId });
  const stats = useQuery(api.signs.getStats, { childId });
  const addSign = useMutation(api.signs.addKnown);
  const updateSign = useMutation(api.signs.updateKnown);
  const removeSign = useMutation(api.signs.removeKnown);
  const shareChild = useMutation(api.children.share);
  
  const [activeTab, setActiveTab] = useState<"signs" | "search" | "share">("signs");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [shareEmail, setShareEmail] = useState("");
  const [shareError, setShareError] = useState("");
  const [shareSuccess, setShareSuccess] = useState("");
  
  if (child === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }
  
  if (child === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800">Child not found</h2>
          <Link href="/" className="text-indigo-600 hover:underline mt-2 inline-block">
            Go back
          </Link>
        </div>
      </div>
    );
  }
  
  const knownSignIds = new Set(child.signs.map((s: any) => s.signId));
  
  const filteredDictionarySigns = ASL_SIGNS.filter((sign) => {
    const matchesSearch = sign.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || sign.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });
  
  const handleAddSign = async (sign: typeof ASL_SIGNS[0]) => {
    await addSign({
      childId,
      signId: sign.id,
      signName: sign.name,
      signCategory: sign.category,
    });
  };
  
  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    setShareError("");
    setShareSuccess("");
    
    try {
      await shareChild({ childId, email: shareEmail });
      setShareSuccess(`Shared with ${shareEmail}!`);
      setShareEmail("");
    } catch (err: any) {
      setShareError(err.message || "Failed to share");
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-gray-600 hover:text-gray-800">
              ← Back
            </Link>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-800">{child.name}</h1>
            </div>
          </div>
        </div>
      </header>
      
      {/* Stats */}
      {stats && (
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm p-4 text-center">
              <div className="text-3xl font-bold text-indigo-600">{stats.total}</div>
              <div className="text-gray-600 text-sm">Total Signs</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 text-center">
              <div className="text-3xl font-bold text-green-600">{stats.byConfidence.mastered}</div>
              <div className="text-gray-600 text-sm">Mastered</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 text-center">
              <div className="text-3xl font-bold text-yellow-600">{stats.byConfidence.familiar}</div>
              <div className="text-gray-600 text-sm">Familiar</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 text-center">
              <div className="text-3xl font-bold text-blue-600">{stats.recentCount}</div>
              <div className="text-gray-600 text-sm">This Week</div>
            </div>
          </div>
        </div>
      )}
      
      {/* Tabs */}
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex gap-1 bg-gray-200 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab("signs")}
            className={`px-4 py-2 rounded-md transition ${
              activeTab === "signs" ? "bg-white shadow-sm" : "hover:bg-gray-300"
            }`}
          >
            Known Signs ({child.signs.length})
          </button>
          <button
            onClick={() => setActiveTab("search")}
            className={`px-4 py-2 rounded-md transition ${
              activeTab === "search" ? "bg-white shadow-sm" : "hover:bg-gray-300"
            }`}
          >
            Find Signs
          </button>
          {child.role === "owner" && (
            <button
              onClick={() => setActiveTab("share")}
              className={`px-4 py-2 rounded-md transition ${
                activeTab === "share" ? "bg-white shadow-sm" : "hover:bg-gray-300"
              }`}
            >
              Share
            </button>
          )}
        </div>
      </div>
      
      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        {activeTab === "signs" && (
          <div className="space-y-4">
            {child.signs.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <div className="text-6xl mb-4">🤟</div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">No signs yet</h3>
                <p className="text-gray-600 mb-4">Start by finding signs to add!</p>
                <button
                  onClick={() => setActiveTab("search")}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition"
                >
                  Find Signs
                </button>
              </div>
            ) : (
              <div className="grid gap-3">
                {child.signs.map((sign: any) => (
                  <div key={sign._id} className="bg-white rounded-xl shadow-sm p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-800">{sign.signName}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          {sign.signCategory && (
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                              {sign.signCategory}
                            </span>
                          )}
                          <span className={`text-xs px-2 py-1 rounded ${
                            sign.confidence === "mastered" ? "bg-green-100 text-green-700" :
                            sign.confidence === "familiar" ? "bg-yellow-100 text-yellow-700" :
                            "bg-blue-100 text-blue-700"
                          }`}>
                            {sign.confidence}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={sign.confidence}
                          onChange={(e) => updateSign({ 
                            knownSignId: sign._id, 
                            confidence: e.target.value as any 
                          })}
                          className="text-sm border border-gray-300 rounded px-2 py-1"
                        >
                          <option value="learning">Learning</option>
                          <option value="familiar">Familiar</option>
                          <option value="mastered">Mastered</option>
                        </select>
                        <button
                          onClick={() => removeSign({ knownSignId: sign._id })}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {activeTab === "search" && (
          <div className="space-y-4">
            {/* Search & Filter */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search signs..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Categories</option>
                  {ASL_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Results */}
            <div className="grid gap-3 md:grid-cols-2">
              {filteredDictionarySigns.map((sign) => {
                const isKnown = knownSignIds.has(sign.id);
                return (
                  <div key={sign.id} className="bg-white rounded-xl shadow-sm p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-800">{sign.name}</h4>
                        <p className="text-gray-600 text-sm">{sign.description}</p>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded mt-2 inline-block">
                          {sign.category}
                        </span>
                      </div>
                      {isKnown ? (
                        <span className="text-green-600 text-sm">✓ Known</span>
                      ) : (
                        <button
                          onClick={() => handleAddSign(sign)}
                          className="bg-indigo-600 text-white px-3 py-1 rounded-lg hover:bg-indigo-700 transition text-sm"
                        >
                          + Add
                        </button>
                      )}
                    </div>
                    {sign.videoUrl && (
                      <a
                        href={sign.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:underline text-sm mt-2 inline-block"
                      >
                        Watch video →
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
            
            {filteredDictionarySigns.length === 0 && (
              <div className="text-center text-gray-600 py-8">
                No signs found matching your search.
              </div>
            )}
          </div>
        )}
        
        {activeTab === "share" && child.role === "owner" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-800 mb-4">Share with Family</h3>
              <p className="text-gray-600 text-sm mb-4">
                Share access to {child.name}'s sign progress with your spouse or family members.
                They'll need to create an account with the email you enter.
              </p>
              
              <form onSubmit={handleShare} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={shareEmail}
                    onChange={(e) => setShareEmail(e.target.value)}
                    placeholder="spouse@example.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                
                {shareError && (
                  <div className="text-red-500 text-sm">{shareError}</div>
                )}
                {shareSuccess && (
                  <div className="text-green-500 text-sm">{shareSuccess}</div>
                )}
                
                <button
                  type="submit"
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
                >
                  Share Access
                </button>
              </form>
            </div>
            
            {/* Currently shared with */}
            {child.sharedWith && child.sharedWith.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="font-semibold text-gray-800 mb-4">Shared With</h3>
                <div className="space-y-2">
                  {child.sharedWith.map((user: any) => (
                    <div key={user.id} className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-700">{user.email}</span>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        {user.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
