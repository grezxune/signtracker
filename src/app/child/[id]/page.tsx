"use client";

import { useSession } from "next-auth/react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Select, ConfidenceSelect } from "@/components/ui/Select";

export default function ChildPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const childId = id as Id<"children">;
  const { data: session, status } = useSession();
  const router = useRouter();
  const email = session?.user?.email ?? undefined;
  
  const child = useQuery(api.children.get, { childId, email });
  const stats = useQuery(api.signs.getStats, { childId, email });
  const signsByCategory = useQuery(api.signs.listByCategory, { childId, email });
  const categories = useQuery(api.signLookup.getCategories, {});
  
  const updateSign = useMutation(api.signs.updateKnown);
  const removeSign = useMutation(api.signs.removeKnown);
  const toggleFavorite = useMutation(api.signs.toggleFavorite);
  const updateAlias = useMutation(api.signs.updateAlias);
  const updateSignName = useMutation(api.signs.updateSignName);
  const shareChild = useMutation(api.children.share);
  const addKnownSign = useMutation(api.signs.addKnown);
  const quickAddSign = useAction(api.signLookup.quickAdd);
  
  const [activeTab, setActiveTab] = useState<"signs" | "share">("signs");
  const [shareEmail, setShareEmail] = useState("");
  const [shareError, setShareError] = useState("");
  const [shareSuccess, setShareSuccess] = useState("");
  
  // Search state for adding signs
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("General");
  const [addingSign, setAddingSign] = useState(false);
  const [addError, setAddError] = useState("");
  const [addSuccess, setAddSuccess] = useState("");
  
  // Dictionary search results (shows existing dictionary entries)
  const dictionaryResults = useQuery(
    api.signLookup.browseDictionary, 
    searchQuery.trim().length >= 2 
      ? { search: searchQuery.trim(), limit: 10, childId }
      : "skip"
  );
  
  // Track expanded accordions - start with all expanded
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(["Favorites", ...(signsByCategory?.allCategories || [])])
  );
  
  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };
  
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600 text-lg">Loading...</div>
      </div>
    );
  }
  
  if (!session) {
    router.push("/auth/signin");
    return null;
  }
  
  if (child === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600 text-lg">Loading...</div>
      </div>
    );
  }
  
  if (child === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-6">
          <h2 className="text-xl font-semibold text-gray-800">Child not found</h2>
          <Link href="/" className="text-indigo-600 hover:underline mt-4 inline-block text-lg">
            Go back
          </Link>
        </div>
      </div>
    );
  }
  
  const handleAddFromDictionary = async (sign: any) => {
    if (!email) return;
    
    try {
      await addKnownSign({
        email,
        childId,
        signId: sign.signId,
        signName: sign.name,
        signCategory: sign.category,
      });
      setAddSuccess(`Added "${sign.name}" to ${child.name}'s signs!`);
      setSearchQuery("");
      setShowSearchResults(false);
      setTimeout(() => setAddSuccess(""), 3000);
    } catch (err: any) {
      setAddError(err.message || "Failed to add sign");
      setTimeout(() => setAddError(""), 3000);
    }
  };
  
  const handleCreateNewSign = async () => {
    if (!email || !searchQuery.trim()) return;
    
    setAddingSign(true);
    setAddError("");
    setAddSuccess("");
    
    try {
      await quickAddSign({
        email,
        childId,
        searchQuery: searchQuery.trim(),
        category: selectedCategory !== "all" ? selectedCategory : undefined,
      });
      setAddSuccess(`Added "${searchQuery.trim()}" to ${child.name}'s signs!`);
      setSearchQuery("");
      setShowSearchResults(false);
      setTimeout(() => setAddSuccess(""), 3000);
    } catch (err: any) {
      setAddError(err.message || "Failed to add sign");
      setTimeout(() => setAddError(""), 3000);
    } finally {
      setAddingSign(false);
    }
  };
  
  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setShareError("");
    setShareSuccess("");
    
    try {
      const result = await shareChild({ email, childId, shareWithEmail: shareEmail });
      if (result?.status === "invited") {
        setShareSuccess(`Invite sent to ${shareEmail}! They'll get access when they create an account.`);
      } else {
        setShareSuccess(`Shared with ${shareEmail}!`);
      }
      setShareEmail("");
    } catch (err: any) {
      setShareError(err.message || "Failed to share");
    }
  };
  
  const allCategoryOptions = categories || ["General"];
  const categoriesWithSigns = signsByCategory?.allCategories || [];
  const totalSigns = child.signs?.length || 0;
  
  // Check if search query matches any dictionary result
  const hasExactMatch = dictionaryResults?.some(
    (s: any) => s.name.toLowerCase() === searchQuery.toLowerCase().trim()
  );
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Mobile optimized */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="p-2 -ml-2 text-gray-600 hover:text-gray-800 text-xl">
                ←
              </Link>
              <h1 className="text-xl font-bold text-gray-800 truncate">{child.name}</h1>
            </div>
            <Link
              href="/dictionary"
              className="text-indigo-600 hover:text-indigo-800 font-medium text-sm"
            >
              📚 Dictionary
            </Link>
          </div>
        </div>
      </header>
      
      {/* Stats - Mobile grid */}
      {stats && (
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-white rounded-xl shadow-sm p-3 text-center">
              <div className="text-2xl font-bold text-indigo-600">{stats.total}</div>
              <div className="text-gray-600 text-xs">Total</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.byConfidence.mastered}</div>
              <div className="text-gray-600 text-xs">Mastered</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-3 text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.byConfidence.familiar}</div>
              <div className="text-gray-600 text-xs">Familiar</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-3 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.recentCount}</div>
              <div className="text-gray-600 text-xs">This Week</div>
            </div>
          </div>
        </div>
      )}
      
      {/* Tabs - Mobile scrollable */}
      <div className="max-w-5xl mx-auto px-4 pb-2">
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
          <button
            onClick={() => setActiveTab("signs")}
            className={`px-4 py-3 rounded-xl transition whitespace-nowrap text-base font-medium ${
              activeTab === "signs" 
                ? "bg-indigo-600 text-white shadow-sm" 
                : "bg-white text-gray-700 shadow-sm"
            }`}
          >
            Signs ({totalSigns})
          </button>
          {child.role === "owner" && (
            <button
              onClick={() => setActiveTab("share")}
              className={`px-4 py-3 rounded-xl transition whitespace-nowrap text-base font-medium ${
                activeTab === "share" 
                  ? "bg-indigo-600 text-white shadow-sm" 
                  : "bg-white text-gray-700 shadow-sm"
              }`}
            >
              Share
            </button>
          )}
        </div>
      </div>
      
      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 py-4">
        {/* KNOWN SIGNS TAB */}
        {activeTab === "signs" && (
          <div className="space-y-4">
            {/* Search Bar to Add Signs */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSearchResults(e.target.value.trim().length >= 2);
                  }}
                  onFocus={() => {
                    if (searchQuery.trim().length >= 2) {
                      setShowSearchResults(true);
                    }
                  }}
                  placeholder="Search for a sign to add..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-gray-900 bg-white text-base"
                />
                
                {/* Search Results Dropdown */}
                {showSearchResults && searchQuery.trim().length >= 2 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-200 z-20 max-h-80 overflow-y-auto">
                    {/* Dictionary Results */}
                    {dictionaryResults && dictionaryResults.length > 0 && (
                      <div className="p-2">
                        <div className="text-xs text-gray-500 uppercase px-2 py-1">From Dictionary</div>
                        {dictionaryResults.map((sign: any) => (
                          <div
                            key={sign._id}
                            className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg"
                          >
                            <div>
                              <span className="font-medium text-gray-800">{sign.name}</span>
                              {sign.category && (
                                <span className="text-sm text-gray-500 ml-2">({sign.category})</span>
                              )}
                            </div>
                            {sign.isKnown ? (
                              <span className="text-green-600 text-sm font-medium">✓ Added</span>
                            ) : (
                              <button
                                onClick={() => handleAddFromDictionary(sign)}
                                className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700"
                              >
                                + Add
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Create New Option */}
                    {!hasExactMatch && (
                      <div className="border-t border-gray-100 p-3">
                        <div className="text-xs text-gray-500 uppercase mb-2">Create New</div>
                        <div className="flex items-center gap-2">
                          <Select
                            value={selectedCategory}
                            onChange={setSelectedCategory}
                            options={(allCategoryOptions || []).filter(Boolean).map((cat) => ({ value: cat as string, label: cat as string }))}
                            placeholder="Category"
                          />
                          <button
                            onClick={handleCreateNewSign}
                            disabled={addingSign}
                            className="bg-green-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 whitespace-nowrap"
                          >
                            {addingSign ? "Adding..." : `+ Create "${searchQuery.trim()}"`}
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {/* Close button */}
                    <div className="border-t border-gray-100 p-2">
                      <button
                        onClick={() => setShowSearchResults(false)}
                        className="w-full text-gray-500 text-sm py-2 hover:text-gray-700"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Success/Error Messages */}
              {addSuccess && (
                <div className="mt-3 text-green-600 text-sm p-3 bg-green-50 rounded-xl">{addSuccess}</div>
              )}
              {addError && (
                <div className="mt-3 text-red-500 text-sm p-3 bg-red-50 rounded-xl">{addError}</div>
              )}
            </div>
            
            {/* Signs List */}
            {totalSigns === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                <div className="text-6xl mb-4">🤟</div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">No signs yet</h3>
                <p className="text-gray-600 mb-6">Search above to add signs, or browse the dictionary!</p>
                <Link
                  href="/dictionary"
                  className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 transition text-base font-medium"
                >
                  📚 Browse Dictionary
                </Link>
              </div>
            ) : signsByCategory ? (
              <div className="space-y-3">
                {/* Favorites Accordion */}
                {signsByCategory.favorites.length > 0 && (
                  <CategoryAccordion
                    title="⭐ Favorites"
                    count={signsByCategory.favorites.length}
                    isExpanded={expandedCategories.has("Favorites")}
                    onToggle={() => toggleCategory("Favorites")}
                  >
                    <div className="space-y-2">
                      {signsByCategory.favorites.map((sign: any) => (
                        <SignCard
                          key={sign._id}
                          sign={sign}
                          email={email}
                          onUpdate={updateSign}
                          onRemove={removeSign}
                          onToggleFavorite={toggleFavorite}
                          onUpdateAlias={updateAlias}
                          onUpdateSignName={updateSignName}
                        />
                      ))}
                    </div>
                  </CategoryAccordion>
                )}
                
                {/* Category Accordions */}
                {categoriesWithSigns.map((category) => {
                  const signs = signsByCategory.categories[category];
                  if (!signs || signs.length === 0) return null;
                  
                  return (
                    <CategoryAccordion
                      key={category}
                      title={category}
                      count={signs.length}
                      isExpanded={expandedCategories.has(category)}
                      onToggle={() => toggleCategory(category)}
                    >
                      <div className="space-y-2">
                        {signs.map((sign: any) => (
                          <SignCard
                            key={sign._id}
                            sign={sign}
                            email={email}
                            onUpdate={updateSign}
                            onRemove={removeSign}
                            onToggleFavorite={toggleFavorite}
                            onUpdateAlias={updateAlias}
                            onUpdateSignName={updateSignName}
                          />
                        ))}
                      </div>
                    </CategoryAccordion>
                  );
                })}
              </div>
            ) : (
              <div className="text-gray-600 text-center py-8">Loading signs...</div>
            )}
          </div>
        )}
        
        {/* SHARE TAB */}
        {activeTab === "share" && child.role === "owner" && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm p-5">
              <h3 className="font-semibold text-gray-800 mb-2 text-lg">Share with Family</h3>
              <p className="text-gray-600 text-sm mb-4">
                Share access to {child.name}&apos;s sign progress.
              </p>
              
              <form onSubmit={handleShare} className="space-y-4">
                <input
                  type="email"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  placeholder="Email address"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-gray-900 bg-white text-base"
                  required
                />
                
                {shareError && (
                  <div className="text-red-500 text-sm p-3 bg-red-50 rounded-xl">{shareError}</div>
                )}
                {shareSuccess && (
                  <div className="text-green-600 text-sm p-3 bg-green-50 rounded-xl">{shareSuccess}</div>
                )}
                
                <button
                  type="submit"
                  className="w-full bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 transition font-medium text-base"
                >
                  Share Access
                </button>
              </form>
            </div>
            
            {child.sharedWith && child.sharedWith.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-5">
                <h3 className="font-semibold text-gray-800 mb-3">Shared With</h3>
                <div className="space-y-3">
                  {child.sharedWith.map((user: any) => (
                    <div key={user.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <span className="text-gray-700">{user.email}</span>
                      <span className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
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

// Category Accordion Component
function CategoryAccordion({ 
  title, 
  count, 
  isExpanded, 
  onToggle, 
  children 
}: { 
  title: string; 
  count: number; 
  isExpanded: boolean; 
  onToggle: () => void; 
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50 transition"
      >
        <div className="flex items-center gap-3">
          <span className={`transition-transform text-lg ${isExpanded ? "rotate-90" : ""}`}>▶</span>
          <span className="font-semibold text-gray-800 text-lg">{title}</span>
          <span className="text-base text-gray-500">({count})</span>
        </div>
      </button>
      {isExpanded && (
        <div className="px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  );
}

// Sign Card Component with Alias & Sign Name Editing
function SignCard({ 
  sign, 
  email, 
  onUpdate, 
  onRemove, 
  onToggleFavorite,
  onUpdateAlias,
  onUpdateSignName,
}: { 
  sign: any; 
  email: string | undefined; 
  onUpdate: any; 
  onRemove: any; 
  onToggleFavorite: any;
  onUpdateAlias: any;
  onUpdateSignName: any;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editAlias, setEditAlias] = useState(sign.alias || "");
  const [editSignName, setEditSignName] = useState(sign.signName || "");
  
  // Generate Lifeprint URL based on original signId (dictionary reference)
  const lifeprintUrl = sign.lifeprintUrl || `https://www.lifeprint.com/asl101/pages-signs/${sign.signId.charAt(0).toLowerCase()}/${sign.signId.toLowerCase().replace(/\s+/g, "-")}.htm`;
  
  const displayName = sign.alias || sign.signName;
  const hasAlias = !!sign.alias && sign.alias !== sign.signName;
  
  const handleSave = async () => {
    if (!email) return;
    
    // Update alias if changed
    const newAlias = editAlias.trim();
    if (newAlias !== (sign.alias || "")) {
      await onUpdateAlias({ 
        email, 
        knownSignId: sign._id, 
        alias: newAlias || null 
      });
    }
    
    // Update sign name if changed
    const newSignName = editSignName.trim();
    if (newSignName && newSignName !== sign.signName) {
      await onUpdateSignName({
        email,
        knownSignId: sign._id,
        signName: newSignName,
      });
    }
    
    setIsEditing(false);
  };
  
  const handleCancel = () => {
    setEditAlias(sign.alias || "");
    setEditSignName(sign.signName || "");
    setIsEditing(false);
  };
  
  if (isEditing) {
    return (
      <div className="border-2 border-indigo-200 rounded-xl p-4 bg-indigo-50">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nickname (what your child says)
            </label>
            <input
              type="text"
              value={editAlias}
              onChange={(e) => setEditAlias(e.target.value)}
              placeholder="e.g., dada, num-nums"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-base text-gray-900 bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sign Name (the actual sign)
            </label>
            <input
              type="text"
              value={editSignName}
              onChange={(e) => setEditSignName(e.target.value)}
              placeholder="e.g., father, food"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-base text-gray-900 bg-white"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-medium"
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-white">
      {/* Top row: name and actions */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {/* Display name + alias indicator */}
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold text-gray-800 text-lg">{displayName}</h4>
            {hasAlias && (
              <span className="text-sm text-gray-500">
                (sign: {sign.signName})
              </span>
            )}
          </div>
        </div>
        
        {/* Action buttons - large touch targets */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => email && onToggleFavorite({ email, knownSignId: sign._id })}
            className={`p-2 text-2xl ${sign.favorite ? "text-yellow-500" : "text-gray-300"}`}
            title={sign.favorite ? "Remove from favorites" : "Add to favorites"}
          >
            ★
          </button>
          <button
            onClick={() => setIsEditing(true)}
            className="p-2 text-xl text-gray-400 hover:text-gray-600"
            title="Edit"
          >
            ✏️
          </button>
        </div>
      </div>
      
      {/* Bottom row: badges and link */}
      <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <ConfidenceSelect
            value={sign.confidence || "learning"}
            onChange={(value) => email && onUpdate({ 
              email,
              knownSignId: sign._id, 
              confidence: value as any 
            })}
          />
          
          <a
            href={lifeprintUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-indigo-600 font-medium px-3 py-1.5 bg-indigo-50 rounded-full"
          >
            Learn Sign →
          </a>
        </div>
        
        <button
          onClick={() => email && onRemove({ email, knownSignId: sign._id })}
          className="p-2 text-red-400 hover:text-red-600 text-lg"
          title="Remove"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}
