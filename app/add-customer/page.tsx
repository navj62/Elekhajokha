"use client";

import { useState } from "react";
import SubscriptionGuard from "@/components/SubscriptionGuard";

export default function AddCustomerPage() {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    // Example: send to API
    const res = await fetch("/api/add-customer", {
  method: "POST",
  body: formData,
});


    setLoading(false);

    if (res.ok) {
      alert("Customer added successfully");
      e.currentTarget.reset();
    } else {
      alert("Something went wrong");
    }
  }

  return (
    <SubscriptionGuard featureName="Add Customer">
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Add New Customer</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <label className="block font-medium">Full Name</label>
          <input
            name="name"
            required
            className="w-full border p-2 rounded"
            placeholder="Enter customer name"
          />
        </div>

        {/* Address */}
        <div>
          <label className="block font-medium">Address</label>
          <textarea
            name="address"
            required
            className="w-full border p-2 rounded"
            placeholder="Enter address"
          />
        </div>

        {/* Mobile No */}
        <div>
          <label className="block font-medium">Mobile Number</label>
          <input
            name="mobile"
            type="tel"
            maxLength={10}
            className="w-full border p-2 rounded"
            placeholder="10 digit mobile number"
          />
        </div>

        {/* Aadhaar Number */}
        <div>
          <label className="block font-medium">Aadhaar Number</label>
          <input
            name="aadhaarNo"
            maxLength={12}
            className="w-full border p-2 rounded"
            placeholder="XXXX XXXX XXXX"
          />
        </div>

        {/* Gender */}
        <div>
          <label className="block font-medium">Gender</label>
          <select
            name="gender"
            
            className="w-full border p-2 rounded"
          >
            <option value="">Select</option>
  <option value="Male">Male</option>
  <option value="Female">Female</option>
  <option value="Other">Other</option>
          </select>
        </div>

        {/* User Image */}
        <div>
          <label className="block font-medium">Customer Photo</label>
          <input
            name="userImg"
            type="file"
            accept="image/*"
            
            className="w-full"
          />
        </div>

        {/* ID Proof Image */}
        <div>
          <label className="block font-medium">ID Proof Image</label>
          <input
            name="idProofImg"
            type="file"
            accept="image/*"
            
            className="w-full"
          />
        </div>

        {/* Remarks */}
        <div>
          <label className="block font-medium">Remarks</label>
          <textarea
            name="remarks"
            className="w-full border p-2 rounded"
            placeholder="Optional notes"
          />
        </div>

        {/* Submit */}
        <button
          disabled={loading}
          className="w-full bg-black text-white p-2 rounded hover:opacity-90"
        >
          {loading ? "Saving..." : "Add Customer"}
        </button>
      </form>
    </div>
    </SubscriptionGuard>
  );
}
