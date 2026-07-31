import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

export default function AuthLoading() {
  return <LoadingSpinner text="Connecting to JalSeva..." subtext="Verifying authentication details" fullScreen />
}
