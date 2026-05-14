import CleanerForm from '@/components/admin/cleaners/CleanerForm'

export const metadata = { title: 'New Cleaner' }

export default function NewCleanerPage() {
  return (
    <div className="p-6 max-w-screen-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-poppins)' }}>
          New Cleaner
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Add a new team member.</p>
      </div>
      <CleanerForm />
    </div>
  )
}
