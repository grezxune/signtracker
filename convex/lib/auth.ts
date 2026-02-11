import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type ReadCtx = QueryCtx | MutationCtx;

function getIdentityEmail(identity: { email?: unknown } | null): string | null {
  if (!identity || typeof identity.email !== "string") return null;
  const normalized = identity.email.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

export async function getAuthUser(ctx: ReadCtx): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  const email = getIdentityEmail(identity);
  if (!email) return null;

  return await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", email))
    .first();
}

export async function getAuthUserId(ctx: ReadCtx): Promise<Id<"users"> | null> {
  const user = await getAuthUser(ctx);
  return user?._id ?? null;
}

export async function requireAuth(ctx: ReadCtx): Promise<Doc<"users">> {
  const user = await getAuthUser(ctx);
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

export async function requireAuthUserId(ctx: ReadCtx): Promise<Id<"users">> {
  const user = await requireAuth(ctx);
  return user._id;
}

export async function requireOwnership<T extends { userId: Id<"users"> }>(
  ctx: ReadCtx,
  resource: T | null,
  resourceName = "Resource",
): Promise<T> {
  const userId = await requireAuthUserId(ctx);
  if (!resource || resource.userId !== userId) {
    throw new Error(`${resourceName} not found or access denied`);
  }
  return resource;
}

export async function requirePremium(ctx: ReadCtx): Promise<Doc<"users">> {
  const user = await requireAuth(ctx);
  if (user.role !== "super_user") {
    throw new Error("Premium subscription required");
  }
  return user;
}

export async function hasPremiumAccess(ctx: ReadCtx): Promise<boolean> {
  const user = await getAuthUser(ctx);
  return user?.role === "super_user";
}

export async function syncAuthUser(ctx: MutationCtx): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  const email = getIdentityEmail(identity);

  if (!email) {
    throw new Error("Unauthorized");
  }

  const name = typeof identity?.name === "string" ? identity.name : undefined;
  const image = typeof identity?.pictureUrl === "string" ? identity.pictureUrl : undefined;

  const existing = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", email))
    .first();

  if (!existing) {
    const userId = await ctx.db.insert("users", {
      email,
      name,
      image,
      provider: "nextauth",
      emailVerified: true,
      role: "user",
      createdAt: Date.now(),
    });

    const created = await ctx.db.get(userId);
    if (!created) {
      throw new Error("Failed to create user");
    }
    return created;
  }

  const shouldPatch =
    (name && name !== existing.name) ||
    (image && image !== existing.image) ||
    existing.provider !== "nextauth";

  if (shouldPatch) {
    await ctx.db.patch(existing._id, {
      ...(name ? { name } : {}),
      ...(image ? { image } : {}),
      provider: "nextauth",
      emailVerified: true,
    });

    const patched = await ctx.db.get(existing._id);
    if (!patched) {
      throw new Error("Failed to update user");
    }
    return patched;
  }

  return existing;
}
