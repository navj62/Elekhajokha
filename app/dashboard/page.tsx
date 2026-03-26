"use client";

import { SignOutButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import React, { useEffect, useState } from "react";

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalCustomers: 0,
    activePledges: 0,
  });

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) =>
        setStats({
          totalCustomers: data.totalCustomers,
          activePledges: data.activePledges,
        })
      );
  }, []);

  return (
    <div className="p-6 space-y-8">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>

        <div className="flex items-center gap-4">
          <UserButton />
          <SignOutButton>
            <button className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
              Sign out
            </button>
          </SignOutButton>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-2xl p-6">
          <p className="text-gray-500 text-sm">Total Customers</p>
          <h2 className="text-3xl font-bold">{stats.totalCustomers}</h2>
        </div>

        <div className="bg-white shadow rounded-2xl p-6">
          <p className="text-gray-500 text-sm">Active Pledges</p>
          <h2 className="text-3xl font-bold">{stats.activePledges}</h2>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-6">

        <Link href="/add-customer">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-2xl hover:scale-105 transition cursor-pointer">
            <h3 className="text-lg font-semibold">Add Customer</h3>
            <p className="text-sm opacity-80">Create new customer entry</p>
          </div>
        </Link>

        <Link href="/customers">
          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-2xl hover:scale-105 transition cursor-pointer">
            <h3 className="text-lg font-semibold">Customers & Pledges</h3>
            <p className="text-sm opacity-80">Manage all records</p>
          </div>
        </Link>

        <Link href="/reports">
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-2xl hover:scale-105 transition cursor-pointer">
            <h3 className="text-lg font-semibold">Reports</h3>
            <p className="text-sm opacity-80">View analytics & exports</p>
          </div>
        </Link>

        <Link href="/profile">
          <div className="bg-gradient-to-r from-gray-700 to-gray-800 text-white p-6 rounded-2xl hover:scale-105 transition cursor-pointer">
            <h3 className="text-lg font-semibold">Profile</h3>
            <p className="text-sm opacity-80">Manage your account</p>
          </div>
        </Link>

      </div>
    </div>
  );
}