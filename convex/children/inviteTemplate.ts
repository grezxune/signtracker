export function buildInviteEmailHtml({
  inviterName,
  childName,
  appUrl,
}: {
  inviterName: string;
  childName: string;
  appUrl: string;
}) {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>You're Invited! 🎉</h2>
      <p><strong>${inviterName}</strong> has invited you to help track sign language progress for <strong>${childName}</strong> on SignTracker.</p>
      <p>Once you create an account with this email address, you'll automatically get access.</p>
      <p style="margin: 24px 0;">
        <a href="${appUrl}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Open SignTracker
        </a>
      </p>
    </div>
  `;
}
