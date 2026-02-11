import { useState } from "react";

type AddChildValues = {
  name: string;
  birthDate: string;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unable to create child";
}

export function AddChildPanel({
  onCreate,
  onCancel,
}: {
  onCreate: (values: AddChildValues) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;

    setError(null);
    setIsCreating(true);

    try {
      await onCreate({ name: name.trim(), birthDate });
      setName("");
      setBirthDate("");
    } catch (createError) {
      setError(getErrorMessage(createError));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
      <h3 className="mb-4 font-semibold text-gray-800">Add a Child</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
          <input
            data-testid="child-name-input"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:ring-indigo-500"
            placeholder="Child's name"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Birth Date (optional)</label>
          <input
            data-testid="child-birthdate-input"
            type="date"
            value={birthDate}
            onChange={(event) => setBirthDate(event.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex gap-2">
          <button
            data-testid="add-child-submit"
            type="submit"
            disabled={isCreating}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-white transition hover:bg-indigo-700"
          >
            {isCreating ? "Adding..." : "Add"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg bg-gray-200 px-4 py-2 text-gray-700 transition hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      </form>
    </div>
  );
}
