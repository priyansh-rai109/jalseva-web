import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

export default function CustomerLoading() {
  return <LoadingSpinner text="Loading JalSeva Dashboard..." subtext="Fetching orders & available water suppliers" fullScreen />
}
