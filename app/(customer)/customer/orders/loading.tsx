import { SkeletonCard } from '@/components/shared/SkeletonCard'

export default function CustomerOrdersLoading() {
  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="space-y-2 animate-pulse">
        <div className="h-8 w-40 bg-slate-800 rounded-lg" />
        <div className="h-4 w-60 bg-slate-800/60 rounded" />
      </div>
      <div className="space-y-4">
        <SkeletonCard type="order" count={3} />
      </div>
    </div>
  )
}
