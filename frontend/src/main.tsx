import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import './index.css'
import { routes } from './routes'
import { replayQueue } from './offline/queue'
import { apiClient } from './api/client'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5, retry: 1 },
  },
})

// BASE_URL is '/' locally and '/<repo>/' on GitHub Pages.
const basename = import.meta.env.BASE_URL.replace(/\/+$/, '') || undefined
const router = createBrowserRouter(routes, { basename })

const drainQueue = () => {
  replayQueue(async (entry) => {
    await apiClient.request({
      method: entry.method,
      url: entry.url,
      data: entry.body,
    })
  })
}

window.addEventListener('online', drainQueue)
if (navigator.onLine) drainQueue()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>,
)
