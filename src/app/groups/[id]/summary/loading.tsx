export default function SummaryLoading() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      {/* Top Bar Skeleton */}
      <div className="mb-6 flex justify-between items-center">
        <div className="h-5 w-16 bg-gray-200 rounded animate-pulse" />
        <div className="h-10 w-32 bg-gray-200 rounded-md animate-pulse" />
      </div>

      {/* Main Report Card Skeleton */}
      <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        {/* Centered Header Skeleton */}
        <div className="flex flex-col items-center mb-8 space-y-3">
          <div className="h-8 w-64 bg-gray-200 rounded-md animate-pulse" />
          <div className="h-4 w-48 bg-gray-200 rounded-md animate-pulse" />
          <div className="h-3 w-40 bg-gray-200 rounded-md animate-pulse" />
        </div>

        {/* Totals Skeleton */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          <div className="h-12 bg-gray-100 rounded-md animate-pulse" />
          <div className="h-12 bg-gray-100 rounded-md animate-pulse" />
          <div className="h-12 bg-gray-100 rounded-md animate-pulse" />
        </div>

        {/* Member Summary Skeleton */}
        <div className="h-6 w-40 bg-gray-200 rounded-md mb-4 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-5 w-24 bg-gray-200 rounded-md animate-pulse" />
              <div className="h-4 w-32 bg-gray-100 rounded-md animate-pulse" />
              <div className="h-4 w-32 bg-gray-100 rounded-md animate-pulse" />
            </div>
          ))}
        </div>

        {/* Expense Details Skeleton */}
        <div className="h-6 w-40 bg-gray-200 rounded-md mb-4 animate-pulse" />
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-3/4 bg-gray-200 rounded-md animate-pulse" />
              <div className="h-3 w-1/3 bg-gray-100 rounded-md animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}