import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { api } from '../../convex/_generated/api'
import { convexQueryOptions } from '../main'

export const Route = createFileRoute('/dashboard/')({
  loader: (opts) =>
    opts.context.queryClient.ensureQueryData(
      convexQueryOptions(api.data.getInvoices, {}),
    ),
  component: DashboardIndexComponent,
})

function DashboardIndexComponent() {
  const invoicesQuery = useSuspenseQuery(
    convexQueryOptions(api.data.getInvoices, {}),
  )
  const invoices = invoicesQuery.data

  return (
    <div className="p-2">
      <div className="p-2">
        Welcome to the dashboard! You have{' '}
        <strong>{invoices.length} total invoices</strong>.
      </div>
    </div>
  )
}
