import { useState } from 'react'
import { useFeedback } from '../hooks/useFeedback'
import { generateFeedback } from '../api/feedback'
import { useQueryClient } from '@tanstack/react-query'

export function FeedbackPage() {
  const { data, isLoading } = useFeedback()
  const qc = useQueryClient()
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [cooldown, setCooldown] = useState<string | null>(null)

  const handleGenerate = async () => {
    setGenerating(true)
    setError('')
    try {
      await generateFeedback()
      qc.invalidateQueries({ queryKey: ['feedback'] })
    } catch (err: any) {
      if (err.response?.status === 429) {
        setCooldown(err.response.data?.retry_after)
        setError('You already generated feedback today. Try again tomorrow.')
      } else {
        setError('Failed to generate feedback. Try again later.')
      }
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">AI Feedback</h1>
        <button
          onClick={handleGenerate}
          disabled={generating || !!cooldown}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm px-4 py-2 rounded-xl font-semibold"
        >
          {generating ? 'Generating...' : 'Generate'}
        </button>
      </div>

      {error && <p className="text-yellow-400 text-sm">{error}</p>}

      {isLoading ? (
        <p className="text-gray-400">Loading...</p>
      ) : data?.data?.length === 0 ? (
        <div className="bg-gray-800 rounded-2xl p-6 text-center">
          <p className="text-gray-400">No feedback yet.</p>
          <p className="text-gray-500 text-sm mt-1">Train for a few days, then generate feedback.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {data?.data?.map((fb: any) => (
            <div key={fb.id} className="bg-gray-800 rounded-2xl p-5">
              <p className="text-gray-400 text-xs mb-3">
                {new Date(fb.periodStart).toLocaleDateString()} — {new Date(fb.periodEnd).toLocaleDateString()}
              </p>
              <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">{fb.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
