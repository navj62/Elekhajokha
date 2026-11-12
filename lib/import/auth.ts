// lib/import/auth.ts
//
// Import-only identity resolution, the standard pattern of this codebase:
// Clerk session → prisma.user.findUnique({ where: { clerkUserId } }) → the
// internal User.id. Every import query is scoped by that id, never by the
// Clerk id and never by an id from the request.
//
// Server-only. Never creates a user (only /api/access does that).

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import type { ImportAccessUser } from "@/lib/import/subscription";

export type ImportUser = ImportAccessUser & { id: string };

export type ResolvedImportUser =
  | { kind: "unauthenticated" }
  | { kind: "no_user" }
  | { kind: "ok"; user: ImportUser };

export async function resolveImportUser(): Promise<ResolvedImportUser> {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return { kind: "unauthenticated" };

  const user = await prisma.user.findUnique({
    where: { clerkUserId },
    select: {
      id: true,
      subscriptionStatus: true,
      subscriptionEndDate: true,
      subscriptionCreatedAt: true,
      lastGraceExpiredAt: true,
      isActive: true,
      deletedAt: true,
    },
  });
  if (!user) return { kind: "no_user" };

  return { kind: "ok", user };
}
