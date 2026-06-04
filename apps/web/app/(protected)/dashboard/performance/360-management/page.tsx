import Rating360Manager from '@/components/performance/components/360-rating-manager'

export default function Rating360ManagementPage() {
  return (
    <div className="container mx-auto py-8">
      <Rating360Manager />
    </div>
  )
}

export const metadata = {
  title: '360° Rating Management',
  description: 'Manage 360-degree rating assignments and clear ratings'
}
