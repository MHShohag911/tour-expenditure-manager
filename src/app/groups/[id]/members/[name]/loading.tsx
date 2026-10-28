export default function MemberLoading() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      {/* Back Link */}
      <div className="h-5 w-24 bg-gray-200 rounded-md mb-6 animate-pulse" />
      
      {/* Header */}
      <div className="mb-8">
        <div className="h-10 w-48 bg-gray-200 rounded-md mb-2 animate-pulse" />
        <div className="h-5 w-32 bg-gray-200 rounded-md animate-pulse" />
      </div>

      {/* Summary Card */}
      <div className="grid grid-cols-2 gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm md:grid-cols-3 mb-8">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-3 w-20 bg-gray-200 rounded-md animate-pulse" />
            <div className="h-6 w-28 bg-gray-200 rounded-md animate-pulse" />
          </div>
        ))}
      </div>

      {/* Sections (Buttons) */}
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex justify-between items-center rounded-lg border border-gray-200 p-4">
            <div className="h-6 w-40 bg-gray-200 rounded-md animate-pulse" />
            <div className="h-9 w-20 bg-gray-200 rounded-md animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}