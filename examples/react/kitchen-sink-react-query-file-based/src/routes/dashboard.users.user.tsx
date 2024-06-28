import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { api } from '../../convex/_generated/api'
import { convexQueryOptions } from '../main'

export const Route = createFileRoute('/dashboard/users/user')({
  validateSearch: z.object({
    userId: z.number(),
  }),
  loaderDeps: ({ search: { userId } }) => ({ userId }),
  loader: (opts) =>
    opts.context.queryClient.ensureQueryData(
      convexQueryOptions(api.data.getUser, {
        id: opts.deps.userId,
      }),
    ),
  component: UserComponent,
})

function UserComponent() {
  const search = Route.useSearch()
  const userQuery = useSuspenseQuery(
    convexQueryOptions(api.data.getUser, { id: search.userId }),
  )
  const user = userQuery.data

  return (
    <>
      <h4 className="p-2 font-bold">{user?.name}</h4>
      <pre className="text-sm whitespace-pre-wrap">
        {JSON.stringify(user, null, 2)}
      </pre>
    </>
  )
}
