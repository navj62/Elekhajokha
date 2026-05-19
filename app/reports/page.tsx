// app/reports/page.tsx
import Link from "next/link";

export default function ReportsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Reports</h1>

      <div className="space-x-4">
        <Link href="/reports/customers">
          <button className="bg-blue-500 text-white px-4 py-2 rounded">
            Customer PDF
          </button>
        </Link>

        <Link href="/reports/pledges">
          <button className="bg-green-500 text-white px-4 py-2 rounded">
            Pledge PDF
          </button>
        </Link>
      </div>
    </div>
  );
}