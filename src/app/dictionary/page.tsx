"use client";

import { useSession } from "next-auth/react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/Select";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";

type ChildSummary = {
  _id: Id<"children">;
  name: string;
  signCount: number;
  role: "owner" | "shared";
};

type DictionaryEntry = {
  _id: string;
  signId: string;
  name: string;
  description?: string;
  category?: string;
  lifeprintUrl?: string;
};

function toErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function DictionaryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const children = (useQuery(api.children.list, {}) || []) as ChildSummary[];
  const categories = useQuery(api.signLookup.getCategories, {});
  const isSuperUser = useQuery(api.signLookup.isSuperUser, {});
  
  const addKnownSign = useMutation(api.signs.addKnown);
  const quickAddSign = useAction(api.signLookup.quickAdd);
  const editDictionaryEntry = useMutation(api.signLookup.editDictionaryEntry);
  const deleteDictionaryEntry = useMutation(api.signLookup.deleteDictionaryEntry);
  
  const [activeTab, setActiveTab] = useState<"browse" | "add">("browse");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  
  // New sign form
  const [newSignName, setNewSignName] = useState("");
  const [newSignCategory, setNewSignCategory] = useState("General");
  const [addingSign, setAddingSign] = useState(false);
  const [addError, setAddError] = useState("");
  const [addSuccess, setAddSuccess] = useState("");
  
  // Child selection modal
  const [selectedSign, setSelectedSign] = useState<DictionaryEntry | null>(null);
  const [selectedChildren, setSelectedChildren] = useState<Set<Id<"children">>>(new Set());
  const [addingToChildren, setAddingToChildren] = useState(false);
  
  // Super user dictionary editing
  const [editingDictEntry, setEditingDictEntry] = useState<string | null>(null);
  const [editDictForm, setEditDictForm] = useState({ name: "", description: "", category: "" });
  const [deletingDictEntry, setDeletingDictEntry] = useState<{ signId: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Dictionary browsing
  const dictionary = useQuery(api.signLookup.browseDictionaryGlobal, { 
    category: selectedCategory === "all" ? undefined : selectedCategory,
    search: searchQuery || undefined,
    limit: 100,
  }) as DictionaryEntry[] | undefined;
  
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
  
  const handleAddNewSign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSignName.trim()) return;
    
    setAddingSign(true);
    setAddError("");
    setAddSuccess("");
    
    try {
      // Add to dictionary only (no child selected)
      await quickAddSign({
        searchQuery: newSignName.trim(),
        category: newSignCategory !== "all" ? newSignCategory : undefined,
        dictionaryOnly: true,
      });
      setAddSuccess(`Added "${newSignName.trim()}" to the dictionary!`);
      setNewSignName("");
    } catch (error) {
      setAddError(toErrorMessage(error, "Failed to add sign"));
    } finally {
      setAddingSign(false);
    }
  };
  
  const handleSelectSign = (sign: DictionaryEntry) => {
    setSelectedSign(sign);
    setSelectedChildren(new Set());
  };
  
  const toggleChildSelection = (childId: Id<"children">) => {
    const newSelected = new Set(selectedChildren);
    if (newSelected.has(childId)) {
      newSelected.delete(childId);
    } else {
      newSelected.add(childId);
    }
    setSelectedChildren(newSelected);
  };
  
  const handleAddToChildren = async () => {
    if (!selectedSign || selectedChildren.size === 0) return;
    
    setAddingToChildren(true);
    try {
      for (const childId of selectedChildren) {
        await addKnownSign({
          childId,
          signId: selectedSign.signId,
          signName: selectedSign.name,
          signCategory: selectedSign.category,
        });
      }
      setSelectedSign(null);
      setSelectedChildren(new Set());
    } catch (error) {
      console.error(error);
    } finally {
      setAddingToChildren(false);
    }
  };
  
  const allCategoryOptions = categories || ["General"];
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 -ml-2 text-gray-600 hover:text-gray-800 text-xl">
              ←
            </Link>
            <h1 className="text-xl font-bold text-gray-800">📚 Sign Dictionary</h1>
          </div>
        </div>
      </header>
      
      {/* Tabs */}
      <div className="max-w-5xl mx-auto px-4 py-4">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("browse")}
            className={`px-4 py-3 rounded-xl transition whitespace-nowrap text-base font-medium ${
              activeTab === "browse" 
                ? "bg-indigo-600 text-white shadow-sm" 
                : "bg-white text-gray-700 shadow-sm"
            }`}
          >
            Browse Dictionary
          </button>
          <button
            onClick={() => setActiveTab("add")}
            className={`px-4 py-3 rounded-xl transition whitespace-nowrap text-base font-medium ${
              activeTab === "add" 
                ? "bg-indigo-600 text-white shadow-sm" 
                : "bg-white text-gray-700 shadow-sm"
            }`}
          >
            + Add New Sign
          </button>
        </div>
      </div>
      
      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 pb-8">
        {/* Browse Tab */}
        {activeTab === "browse" && (
          <div className="space-y-4">
            {/* Search & Filter */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="space-y-3">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search signs..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-gray-900 bg-white text-base"
                />
                <Select
                  value={selectedCategory}
                  onChange={setSelectedCategory}
                  options={[
                    { value: "all", label: "All Categories" },
                    ...(allCategoryOptions || []).filter(Boolean).map((cat) => ({ value: cat as string, label: cat as string })),
                  ]}
                  placeholder="All Categories"
                />
              </div>
            </div>
            
            {/* Dictionary Results */}
            {dictionary && dictionary.length > 0 ? (
              <div className="space-y-3">
                {dictionary.map((sign) => (
                  <div key={sign._id} className="bg-white rounded-xl shadow-sm p-4">
                    {/* Edit Mode */}
                    {editingDictEntry === sign.signId ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={editDictForm.name}
                          onChange={(e) => setEditDictForm({ ...editDictForm, name: e.target.value })}
                          placeholder="Sign name"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                        />
                        <input
                          type="text"
                          value={editDictForm.description}
                          onChange={(e) => setEditDictForm({ ...editDictForm, description: e.target.value })}
                          placeholder="Description"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                        />
                        <input
                          type="text"
                          value={editDictForm.category}
                          onChange={(e) => setEditDictForm({ ...editDictForm, category: e.target.value })}
                          placeholder="Category"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              await editDictionaryEntry({
                                signId: sign.signId,
                                name: editDictForm.name || undefined,
                                description: editDictForm.description || undefined,
                                category: editDictForm.category || undefined,
                              });
                              setEditingDictEntry(null);
                            }}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingDictEntry(null)}
                            className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Normal View */
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-800 text-lg">{sign.name}</h4>
                          {sign.description && (
                            <p className="text-gray-600 text-sm mt-1">{sign.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {sign.category && (
                              <span className="text-sm bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                                {sign.category}
                              </span>
                            )}
                            {sign.lifeprintUrl && (
                              <a
                                href={sign.lifeprintUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-indigo-600 font-medium"
                              >
                                Learn Sign →
                              </a>
                            )}
                          </div>
                          {/* Super user controls */}
                          {isSuperUser && (
                            <div className="flex gap-2 mt-3">
                              <button
                                onClick={() => {
                                  setEditDictForm({
                                    name: sign.name,
                                    description: sign.description || "",
                                    category: sign.category || "",
                                  });
                                  setEditingDictEntry(sign.signId);
                                }}
                                className="text-sm text-blue-600 font-medium"
                              >
                                ✏️ Edit
                              </button>
                              <button
                                onClick={() => setDeletingDictEntry({ signId: sign.signId, name: sign.name })}
                                className="text-sm text-red-600 font-medium"
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          )}
                        </div>
                        {children.length > 0 && (
                          <button
                            onClick={() => handleSelectSign(sign)}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition font-medium whitespace-nowrap"
                          >
                            + Add to Child
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : dictionary && dictionary.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                <p className="text-gray-600 mb-4 text-lg">
                  {searchQuery ? `No signs found for "${searchQuery}"` : "No signs in the dictionary yet."}
                </p>
                <button
                  onClick={() => {
                    setNewSignName(searchQuery);
                    setActiveTab("add");
                  }}
                  className="text-indigo-600 font-medium text-lg"
                >
                  Add &quot;{searchQuery || "a new sign"}&quot; to the dictionary →
                </button>
              </div>
            ) : (
              <div className="text-gray-600 text-center py-8">Loading dictionary...</div>
            )}
          </div>
        )}
        
        {/* Add New Sign Tab */}
        {activeTab === "add" && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm p-5">
              <h3 className="font-semibold text-gray-800 mb-2 text-lg">Add a Sign to the Dictionary</h3>
              <p className="text-gray-600 text-sm mb-4">
                Add a new sign that everyone can use. You can add it to your children after.
              </p>
              
              <form onSubmit={handleAddNewSign} className="space-y-4">
                <input
                  type="text"
                  value={newSignName}
                  onChange={(e) => setNewSignName(e.target.value)}
                  placeholder="Enter a word (e.g., 'milk', 'more')"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-gray-900 bg-white text-base"
                />
                <Select
                  value={newSignCategory}
                  onChange={setNewSignCategory}
                  options={(allCategoryOptions || []).filter(Boolean).map((cat) => ({ value: cat as string, label: cat as string }))}
                  placeholder="Select category"
                />
                
                {addError && (
                  <div className="text-red-500 text-sm p-3 bg-red-50 rounded-xl">{addError}</div>
                )}
                {addSuccess && (
                  <div className="text-green-600 text-sm p-3 bg-green-50 rounded-xl">{addSuccess}</div>
                )}
                
                <button
                  type="submit"
                  disabled={addingSign || !newSignName.trim()}
                  className="w-full bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 font-medium text-base"
                >
                  {addingSign ? "Adding..." : "+ Add to Dictionary"}
                </button>
              </form>
            </div>
            
            {/* Common Signs Suggestions */}
            <div className="bg-white rounded-xl shadow-sm p-5">
              <h4 className="font-semibold text-gray-800 mb-3">Common First Signs</h4>
              <div className="flex flex-wrap gap-2">
                {["more", "all done", "milk", "eat", "drink", "help", "please", "thank you", "mom", "dad", "love", "play", "water", "sleep", "bath", "book", "ball", "dog", "cat", "yes", "no"].map((word) => (
                  <button
                    key={word}
                    onClick={() => setNewSignName(word)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition text-base"
                  >
                    {word}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
      
      {/* Child Selection Modal */}
      {selectedSign && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="p-5">
              <h3 className="font-semibold text-gray-800 text-lg mb-1">
                Add &quot;{selectedSign.name}&quot;
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Select which children to add this sign to:
              </p>
              
              {children.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-gray-600 mb-4">You haven&apos;t added any children yet.</p>
                  <Link
                    href="/"
                    className="text-indigo-600 font-medium"
                  >
                    Add a child first →
                  </Link>
                </div>
              ) : (
                <>
                  <div className="space-y-2 mb-4">
                    {children.map((child) => (
                      <button
                        key={child._id}
                        onClick={() => toggleChildSelection(child._id)}
                        className={`w-full p-4 rounded-xl border-2 transition text-left flex items-center gap-3 ${
                          selectedChildren.has(child._id)
                            ? "border-indigo-600 bg-indigo-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          selectedChildren.has(child._id)
                            ? "border-indigo-600 bg-indigo-600"
                            : "border-gray-300"
                        }`}>
                          {selectedChildren.has(child._id) && (
                            <span className="text-white text-sm">✓</span>
                          )}
                        </div>
                        <div className="flex-1">
                          <span className="font-medium text-gray-800">{child.name}</span>
                          <span className="text-gray-500 text-sm ml-2">
                            ({child.signCount} signs)
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={handleAddToChildren}
                      disabled={selectedChildren.size === 0 || addingToChildren}
                      className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-medium disabled:opacity-50"
                    >
                      {addingToChildren 
                        ? "Adding..." 
                        : `Add to ${selectedChildren.size} child${selectedChildren.size !== 1 ? "ren" : ""}`
                      }
                    </button>
                    <button
                      onClick={() => {
                        setSelectedSign(null);
                        setSelectedChildren(new Set());
                      }}
                      className="px-6 bg-gray-200 text-gray-700 py-3 rounded-xl font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Dictionary Entry Confirmation Modal */}
      <ConfirmationModal
        isOpen={deletingDictEntry !== null}
        onClose={() => setDeletingDictEntry(null)}
        onConfirm={async () => {
          if (!deletingDictEntry) return;
          setIsDeleting(true);
          try {
            await deleteDictionaryEntry({ signId: deletingDictEntry.signId });
          } finally {
            setIsDeleting(false);
            setDeletingDictEntry(null);
          }
        }}
        title={`Delete "${deletingDictEntry?.name}"?`}
        message="This will permanently delete the sign from the dictionary and remove it from ALL children's profiles. This action cannot be undone."
        confirmText="Delete Forever"
        cancelText="Keep It"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
