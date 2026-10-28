export default function HomeLoading() {
  return (
    <div className="container mx-auto flex min-h-screen flex-col px-4">
      {/* Navbar Skeleton */}
      <div className="mx-auto w-full p-2 rounded-xl bg-gray-200 h-16 mb-10 animate-pulse" />

      <main className="min-h-screen flex-1">
        <div className="my-10 flex justify-center">
          <div className="h-8 w-64 bg-gray-200 rounded-md animate-pulse" />
        </div>

        {/* Group Form Skeleton */}
        <div className="flex flex-col sm:flex-row gap-3 mb-12">
          <div className="h-12 flex-1 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-12 w-full sm:w-32 bg-gray-200 rounded-lg animate-pulse" />
        </div>

        {/* Active Group Card Skeleton (repeated 2 times) */}
        {[1, 2].map((i) => (
          <div key={i} className="my-12 rounded-xl border border-gray-100 bg-white py-6 px-4 sm:px-5 shadow-sm">
            {/* Header row: stacks on mobile, side-by-side on desktop */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
              <div className="h-8 w-48 bg-gray-200 rounded-md animate-pulse" />
              <div className="flex gap-2">
                <div className="h-10 flex-1 sm:flex-none sm:w-24 bg-gray-200 rounded-md animate-pulse" />
                <div className="h-10 flex-1 sm:flex-none sm:w-28 bg-gray-200 rounded-md animate-pulse" />
              </div>
            </div>
            
            <div className="space-y-3">
              {[1, 2, 3].map((j) => (
                <div key={j} className="rounded-lg border border-gray-100 p-4">
                  <div className="h-5 w-32 bg-gray-200 rounded-md mb-4 animate-pulse" />
                  {/* Grid: 2 columns on mobile, 4 columns on desktop */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="h-10 bg-gray-100 rounded-md animate-pulse" />
                    <div className="h-10 bg-gray-100 rounded-md animate-pulse" />
                    <div className="h-10 bg-gray-100 rounded-md animate-pulse" />
                    <div className="h-10 bg-gray-100 rounded-md animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

                {/* Finished Groups Skeleton */}
        <div className="mt-12 border-t-2 border-dashed border-gray-200 pt-8">
          <div className="h-8 w-48 bg-gray-200 rounded-md mb-6 animate-pulse" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[1, 2].map((i) => (
              <div key={i} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div className="h-7 w-40 bg-gray-200 rounded-md animate-pulse" />
                  <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse" />
                </div>
                
                <div className="h-4 w-48 bg-gray-200 rounded-md mb-6 animate-pulse" />
                
                <div className="flex gap-6 mb-6">
                  <div className="h-10 w-16 bg-gray-100 rounded-md animate-pulse" />
                  <div className="h-10 w-24 bg-gray-100 rounded-md animate-pulse" />
                  <div className="h-10 w-20 bg-gray-100 rounded-md animate-pulse" />
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <div className="h-10 flex-1 sm:flex-none sm:w-32 bg-gray-200 rounded-md animate-pulse" />
                  <div className="h-10 flex-1 sm:flex-none sm:w-28 bg-gray-200 rounded-md animate-pulse" />
                  <div className="h-10 w-full sm:w-20 bg-gray-200 rounded-md animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}