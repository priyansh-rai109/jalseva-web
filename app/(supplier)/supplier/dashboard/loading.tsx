import { SkeletonCard } from '@/components/shared/SkeletonCard'

export default function SupplierDashboardLoading() {
  return (
    <div className="p-6 md:p-8 space-y-8">
      <div className="space-y-2 animate-pulse">
        <div className="h-8 w-48 bg-slate-800 rounded-lg" />
        <div className="h-4 w-72 bg-slate-800/60 rounded" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SkeletonCard type="stat" count={4} />
      </div>

      {/* Orders Section */}
      <div className="space-y-4">
        <div className="h-6 w-36 bg-slate-800 rounded animate-pulse" />
        <SkeletonCard type="order" count={3} />
      </div>
    </div>
  )
}
