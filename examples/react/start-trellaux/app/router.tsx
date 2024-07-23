import { ConvexQueryClient } from '@convex-dev/react-query'
import {
  MutationCache,
  QueryClient,
  notifyManager,
} from '@tanstack/react-query'
import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { routerWithQueryClient } from '@tanstack/react-router-with-query'
import { createContext, useContext } from 'react'
import toast from 'react-hot-toast'
import { DefaultCatchBoundary } from './components/DefaultCatchBoundary'
import { NotFound } from './components/NotFound'
import { routeTree } from './routeTree.gen'
import { ConvexReactClient } from 'convex/react'

const convexClientContext = createContext<any | null>(null)

export const convex = new ConvexReactClient(
  (import.meta as any).env.VITE_CONVEX_URL!,
)

export const useConvexClient = () => {
  return useContext(convexClientContext)
}

export const ConvexClientProvider = convexClientContext.Provider

export function createRouter() {
  if (typeof document !== 'undefined') {
    notifyManager.setScheduler(window.requestAnimationFrame)
  }

  const convexQueryClient = new ConvexQueryClient(convex)

  const queryClient: QueryClient = new QueryClient({
    defaultOptions: {
      queries: {
        queryKeyHashFn: convexQueryClient.hashFn(),
        queryFn: convexQueryClient.queryFn(),
      },
    },
    mutationCache: new MutationCache({
      onError: (error) => {
        toast(error.message, { className: 'bg-red-500 text-white' })
      },
    }),
  })
  convexQueryClient.connect(queryClient)

  const router = routerWithQueryClient(
    createTanStackRouter({
      // context: { queryClient },
      routeTree,
      defaultPreload: 'intent',
      defaultErrorComponent: DefaultCatchBoundary,
      defaultNotFoundComponent: () => <NotFound />,
    }),
    queryClient,
  )

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createRouter>
  }
}
