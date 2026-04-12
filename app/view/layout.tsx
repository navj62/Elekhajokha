// /app/portal/layout.tsx
// This layout purposefully omits your standard Navigation/Sidebar components
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10">
      {/* Maybe just a simple company logo here */}
      <main className="w-full max-w-4xl px-4">
        {children}
      </main>
    </div>
  );
}