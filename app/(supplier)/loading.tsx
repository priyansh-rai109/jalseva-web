import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

export default function SupplierLoading() {
  return <LoadingSpinner text="Loading Supplier Portal..." subtext="Fetching orders & inventory status" fullScreen />
}
