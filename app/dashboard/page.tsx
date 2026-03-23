import { SignOutButton, UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import React from 'react'

const page = () => {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* User Section */}
      <div className="flex items-center gap-4">
        <UserButton />
        <SignOutButton />
      </div>

      {/* Navigation Buttons */}
      <div className="grid grid-cols-2 gap-4 mt-6">

        <Link href="/add-customer">
          <button className="w-full bg-blue-500 text-white p-3 rounded-xl hover:bg-blue-600">
            Add Customer
          </button>
        </Link>

        <Link href="/customers">
          <button className="w-full bg-green-500 text-white p-3 rounded-xl hover:bg-green-600">
            Customers
          </button>
        </Link>

        <Link href="/reports">
          <button className="w-full bg-purple-500 text-white p-3 rounded-xl hover:bg-purple-600">
            Reports
          </button>
        </Link>

        <Link href="/profile">
          <button className="w-full bg-gray-700 text-white p-3 rounded-xl hover:bg-gray-800">
            Profile
          </button>
        </Link>

      </div>
    </div>
  )
}

export default page