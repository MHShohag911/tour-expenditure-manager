export default function GroupDetailLoading() {
  return (
    <div className="container mx-auto flex min-h-screen flex-col px-4">
      <main className="flex-1 py-8">
        {/* Back Link Skeleton */}
        <div className="mb-6 h-4 w-24 bg-gray-200 rounded animate-pulse" />
        
        {/* Main Card Skeleton */}
        <div className="my-8 rounded-xl border border-gray-200 bg-white py-2 shadow-md md:py-8">
          <div className="p-5">
            {/* Header Skeleton */}
            <div className="flex flex-col justify-between space-y-2 md:flex-row md:space-y-0 mb-6">
              <div className="h-9 w-48 bg-gray-200 rounded-md animate-pulse" />
              <div className="flex gap-2">
                <div className="h-10 w-24 bg-gray-200 rounded-md animate-pulse" />
                <div className="h-10 w-28 bg-gray-200 rounded-md animate-pulse" />
              </div>
            </div>

            {/* Members Title */}
            <div className="h-6 w-24 bg-gray-200 rounded-md mb-4 animate-pulse" />

            {/* Member Cards Skeleton */}
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="flex justify-between items-center mb-4">
                    <div className="h-6 w-32 bg-gray-200 rounded-md animate-pulse" />
                    <div className="h-8 w-20 bg-gray-200 rounded-md animate-pulse" />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="h-12 bg-gray-200 rounded-md animate-pulse" />
                    <div className="h-12 bg-gray-200 rounded-md animate-pulse" />
                    <div className="h-12 bg-gray-200 rounded-md animate-pulse" />
                    <div className="h-12 bg-gray-200 rounded-md animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}