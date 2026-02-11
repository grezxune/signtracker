import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { issueConvexToken } from "@/lib/convex-jwt";

export async function GET() {
  const session = await auth();
  const user = session?.user;

  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const token = await issueConvexToken({
      email: user.email,
      id: user.id,
      name: user.name,
      image: user.image,
    });

    return NextResponse.json(
      { token },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    console.error("Failed to issue Convex token", error);
    return NextResponse.json(
      { error: "Failed to issue token" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
