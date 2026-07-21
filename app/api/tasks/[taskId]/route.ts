// app/api/tasks/[taskId]/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { taskId } = await params;
    const body = await req.json();

    if (body.title !== undefined && (typeof body.title !== "string" || body.title.length > 500)) {
      return NextResponse.json({ error: "VALIDATION", message: "Title must be at most 500 characters" }, { status: 400 });
    }

    const task = await prisma.task.findFirst({ where: { id: taskId, userId: user.id } });
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: {
        ...(body.isDone !== undefined ? { isDone: body.isDone } : {}),
        ...(body.title !== undefined ? { title: body.title } : {}),
      },
    });

    return NextResponse.json({
      id: updated.id,
      text: updated.title,
      done: updated.isDone,
      dueDate: updated.dueDate?.toISOString() ?? null,
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (e) {
    console.error("PATCH /api/tasks/[taskId]:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { taskId } = await params;

    const task = await prisma.task.findFirst({ where: { id: taskId, userId: user.id } });
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    await prisma.task.delete({ where: { id: taskId } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/tasks/[taskId]:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
