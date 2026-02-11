import Link from "next/link";

const errorMessages: Record<string, string> = {
  Configuration: "Authentication is not configured correctly.",
  AccessDenied: "Access was denied.",
  Verification: "Your sign-in link is invalid or expired.",
  Default: "Something went wrong during sign-in.",
};

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const code = params.error ?? "Default";
  const message = errorMessages[code] ?? errorMessages.Default;

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white shadow-sm rounded-2xl p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Sign-in Error</h1>
        <p className="text-gray-600 mt-3">{message}</p>
        <Link
          href="/auth/signin"
          className="inline-flex items-center justify-center mt-6 px-5 py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition"
        >
          Back to Sign In
        </Link>
      </div>
    </main>
  );
}
