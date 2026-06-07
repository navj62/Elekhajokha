"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  Plus,
  CheckCircle2,
  Circle,
  Trash2,
  CalendarDays,
  ChevronLeft,
  ListChecks,
} from "lucide-react";
import Link from "next/link";

type Task = {
  id: string;
  text: string;
  done: boolean;
  dueDate?: string | null;
  createdAt: string;
};

type Filter = "all" | "pending" | "done";

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [adding, setAdding] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      if (Array.isArray(data)) setTasks(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTasks(); }, []);

  useEffect(() => {
    if (showAdd) setTimeout(() => inputRef.current?.focus(), 60);
  }, [showAdd]);

  const toggleTask = async (id: string, done: boolean) => {
    setTogglingId(id);
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !done } : t)));
    try {
      await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDone: !done }),
      });
    } catch {
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done } : t)));
    } finally {
      setTogglingId(null);
    }
  };

  const deleteTask = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      if (res.ok) setTasks((prev) => prev.filter((t) => t.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  const addTask = async () => {
    if (!newTitle.trim() || adding) return;
    setAdding(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim(), dueDate: newDueDate || null }),
      });
      if (res.ok) {
        const created = await res.json();
        setTasks((prev) => [created, ...prev]);
        setNewTitle("");
        setNewDueDate("");
        setShowAdd(false);
      }
    } finally {
      setAdding(false);
    }
  };

  const filtered = tasks.filter((t) => {
    if (filter === "pending") return !t.done;
    if (filter === "done") return t.done;
    return true;
  });

  const pendingCount = tasks.filter((t) => !t.done).length;
  const doneCount = tasks.filter((t) => t.done).length;

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function isDueToday(dueDate?: string | null) {
    if (!dueDate) return false;
    const today = new Date();
    const d = new Date(dueDate);
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  }

  function isOverdue(dueDate?: string | null, done?: boolean) {
    if (!dueDate || done) return false;
    return new Date(dueDate) < new Date();
  }

  const filterTabs: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "All", count: tasks.length },
    { key: "pending", label: "Pending", count: pendingCount },
    { key: "done", label: "Completed", count: doneCount },
  ];

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--main-bg)", fontFamily: "'DM Sans', sans-serif" }}
    >
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-[12px] font-bold mb-4 transition-opacity hover:opacity-70"
          style={{ color: "var(--text-secondary)" }}
        >
          <ChevronLeft size={14} />
          Back to Dashboard
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div
                className="w-10 h-10 rounded-[12px] flex items-center justify-center"
                style={{ backgroundColor: "#E8EBD8" }}
              >
                <ListChecks size={20} style={{ color: "#565C3F" }} />
              </div>
              <h1
                className="text-[28px] font-bold tracking-tight"
                style={{ color: "var(--text-primary)" }}
              >
                All Tasks
              </h1>
            </div>
            <p className="text-[13px] font-medium ml-[52px]" style={{ color: "var(--text-secondary)" }}>
              Manage and track your workspace tasks
            </p>
          </div>
          <button
            onClick={() => setShowAdd((s) => !s)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-[12px] text-[12px] font-bold transition-opacity hover:opacity-80"
            style={{ backgroundColor: "#565C3F", color: "#fff" }}
          >
            <Plus size={14} strokeWidth={3} />
            New Task
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div
        className="rounded-[18px] p-0 flex items-center mb-6"
        style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border-light)" }}
      >
        {[
          { label: "Total Tasks", value: tasks.length },
          { label: "Pending", value: pendingCount },
          { label: "Completed", value: doneCount },
        ].map((s, i) => (
          <div
            key={s.label}
            className="flex-1 p-5 flex flex-col items-center relative"
          >
            <span className="text-[10px] font-bold tracking-wider uppercase mb-1" style={{ color: "var(--text-muted)" }}>
              {s.label}
            </span>
            <span className="text-[22px] font-bold" style={{ color: "var(--text-primary)" }}>
              {s.value}
            </span>
            {i < 2 && (
              <div className="absolute right-0 top-4 bottom-4 w-px bg-[var(--border-light)]" />
            )}
          </div>
        ))}
      </div>

      {/* Add Task Panel */}
      {showAdd && (
        <div
          className="rounded-[18px] p-6 mb-6"
          style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border-light)" }}
        >
          <h3 className="text-[14px] font-bold mb-4" style={{ color: "var(--text-primary)" }}>
            New Task
          </h3>
          <div className="space-y-3">
            <input
              ref={inputRef}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addTask();
                if (e.key === "Escape") setShowAdd(false);
              }}
              placeholder="What needs to be done?"
              className="w-full rounded-[10px] px-4 py-2.5 text-[13px] font-medium outline-none transition-all"
              style={{
                backgroundColor: "var(--main-bg)",
                border: "1px solid var(--border-light)",
                color: "var(--text-primary)",
              }}
            />
            <div className="flex items-center gap-3">
              <div
                className="flex items-center gap-2 flex-1 rounded-[10px] px-4 py-2.5"
                style={{ backgroundColor: "var(--main-bg)", border: "1px solid var(--border-light)" }}
              >
                <CalendarDays size={14} style={{ color: "var(--text-muted)" }} />
                <input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="bg-transparent text-[12px] font-medium outline-none flex-1"
                  style={{ color: "var(--text-secondary)" }}
                />
              </div>
              <button
                onClick={() => { setShowAdd(false); setNewTitle(""); setNewDueDate(""); }}
                className="px-4 py-2.5 rounded-[10px] text-[12px] font-bold transition-opacity hover:opacity-70"
                style={{ color: "var(--text-muted)", border: "1px solid var(--border-light)" }}
              >
                Cancel
              </button>
              <button
                onClick={addTask}
                disabled={!newTitle.trim() || adding}
                className="px-5 py-2.5 rounded-[10px] text-[12px] font-bold transition-opacity hover:opacity-80 disabled:opacity-40"
                style={{ backgroundColor: "#565C3F", color: "#fff" }}
              >
                {adding ? "Saving…" : "Add Task"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs + Tasks */}
      <div
        className="rounded-[18px] p-6"
        style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border-light)" }}
      >
        {/* Filter Tabs */}
        <div className="flex items-center gap-2 mb-6">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className="px-4 py-1.5 rounded-full text-[11px] font-bold transition-all duration-150"
              style={{
                backgroundColor: filter === tab.key ? "#565C3F" : "var(--main-bg)",
                color: filter === tab.key ? "#fff" : "var(--text-muted)",
              }}
            >
              {tab.label}
              <span
                className="ml-1.5 px-1.5 py-0.5 rounded-full text-[9px]"
                style={{
                  backgroundColor: filter === tab.key ? "rgba(255,255,255,0.25)" : "var(--border-light)",
                  color: filter === tab.key ? "#fff" : "var(--text-muted)",
                }}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Task list */}
        {loading ? (
          <div className="py-16 text-center text-[13px] font-medium" style={{ color: "var(--text-muted)" }}>
            Loading tasks…
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <ListChecks size={36} className="mx-auto mb-3 opacity-20" style={{ color: "var(--text-muted)" }} />
            <p className="text-[13px] font-medium" style={{ color: "var(--text-muted)" }}>
              {filter === "done" ? "No completed tasks yet." : "No tasks found. Add one above!"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((task, i) => {
              const overdue = isOverdue(task.dueDate, task.done);
              const today = isDueToday(task.dueDate);
              const isLast = i === filtered.length - 1;

              return (
                <div
                  key={task.id}
                  className={`flex items-center gap-3 py-3.5 px-1 group ${!isLast ? "border-b" : ""}`}
                  style={{ borderColor: "var(--border-light)" }}
                >
                  {/* Toggle button */}
                  <button
                    onClick={() => toggleTask(task.id, task.done)}
                    disabled={togglingId === task.id}
                    className="shrink-0 disabled:opacity-60 focus:outline-none"
                  >
                    {task.done ? (
                      <CheckCircle2 size={18} style={{ color: "#565C3F" }} />
                    ) : (
                      <Circle
                        size={18}
                        className="text-[var(--text-muted)] hover:text-[#565C3F] transition-colors"
                      />
                    )}
                  </button>

                  {/* Task text and meta */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[13px] font-semibold leading-snug"
                      style={{
                        color: task.done ? "var(--text-muted)" : "var(--text-primary)",
                        textDecoration: task.done ? "line-through" : "none",
                      }}
                    >
                      {task.text}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
                        Created {formatDate(task.createdAt)}
                      </span>
                      {task.dueDate && (
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{
                            backgroundColor: overdue
                              ? "#FFEBEE"
                              : today
                              ? "#FFF8E1"
                              : "#E8EBD8",
                            color: overdue ? "#E57373" : today ? "#B8983E" : "#565C3F",
                          }}
                        >
                          {overdue ? "Overdue · " : today ? "Due today · " : "Due · "}
                          {formatDate(task.dueDate)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => deleteTask(task.id)}
                    disabled={deletingId === task.id}
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-40 focus:outline-none p-1 rounded-lg hover:bg-red-50"
                  >
                    <Trash2 size={14} className="text-red-400" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
      `}</style>
    </div>
  );
}
