import type { ChildDetails, PendingInvite } from "./types";

export function ShareTab({
  child,
  shareEmail,
  onShareEmailChange,
  onShare,
  shareError,
  shareSuccess,
  pendingInvites,
  onUnshare,
  onCancelInvite,
}: {
  child: ChildDetails;
  shareEmail: string;
  onShareEmailChange: (value: string) => void;
  onShare: (event: React.FormEvent) => Promise<void>;
  shareError: string;
  shareSuccess: string;
  pendingInvites: PendingInvite[] | undefined;
  onUnshare: (userId: ChildDetails["sharedWith"][number]["id"], email: string) => void;
  onCancelInvite: (inviteId: PendingInvite["id"], email: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h3 className="mb-2 text-lg font-semibold text-gray-800">Share with Family</h3>
        <p className="mb-4 text-sm text-gray-600">Share access to {child.name}&apos;s sign progress.</p>

        <form onSubmit={(event) => void onShare(event)} className="space-y-4">
          <input
            data-testid="share-email-input"
            type="email"
            value={shareEmail}
            onChange={(event) => onShareEmailChange(event.target.value)}
            placeholder="Email address"
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 focus:ring-2 focus:ring-indigo-500"
            required
          />
          {shareError && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-500">{shareError}</div>}
          {shareSuccess && <div className="rounded-xl bg-green-50 p-3 text-sm text-green-600">{shareSuccess}</div>}
          <button data-testid="share-submit" type="submit" className="w-full rounded-xl bg-indigo-600 px-6 py-3 text-base font-medium text-white transition hover:bg-indigo-700">
            Share Access
          </button>
        </form>
      </div>

      {child.sharedWith.length > 0 && (
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-semibold text-gray-800">Shared With</h3>
          <div className="space-y-3">
            {child.sharedWith.map((user) => (
              <div key={user.id} className="flex items-center justify-between border-b border-gray-100 py-2 last:border-0">
                <div className="flex items-center gap-2"><span className="text-gray-700">{user.email}</span><span className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-700">{user.role}</span></div>
                {user.role !== "owner" && <button type="button" onClick={() => onUnshare(user.id, user.email)} className="text-sm font-medium text-red-600">Remove Access</button>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h3 className="mb-3 font-semibold text-gray-800">Pending Invites</h3>
        {!pendingInvites ? (
          <p className="text-sm text-gray-500">Loading invites...</p>
        ) : pendingInvites.length === 0 ? (
          <p className="text-sm text-gray-500">No pending invites.</p>
        ) : (
          <div className="space-y-3">
            {pendingInvites.map((invite) => (
              <div key={invite.id} className="flex items-center justify-between border-b border-gray-100 py-2 last:border-0">
                <div className="flex flex-col">
                  <span className="text-gray-700">{invite.email}</span>
                  <span className="text-xs text-gray-500">Sent {new Date(invite.createdAt).toLocaleDateString()}</span>
                </div>
                <button type="button" onClick={() => onCancelInvite(invite.id, invite.email)} className="text-sm font-medium text-red-600">Cancel Invite</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
