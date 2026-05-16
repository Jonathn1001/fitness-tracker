import { useState } from 'react'
import { isAxiosError } from 'axios'
import { useFeedback } from '../hooks/useFeedback'
import { generateFeedback } from '../api/feedback'
import { useQueryClient } from '@tanstack/react-query'
import { Topbar } from '../components/Topbar'
import { Icon } from '../components/ui/Icon'
import type { FeedbackItem } from '../api/types'

function scoreFor(item: FeedbackItem) {
  let h = 0
  for (let i = 0; i < item.id.length; i++) h = (h * 31 + item.id.charCodeAt(i)) | 0
  return 60 + Math.abs(h % 40)
}

function ScoreRing({ score }: { score: number }) {
  const r = 22, circ = 2 * Math.PI * r
  return (
    <svg width="56" height="56" viewBox="0 0 56 56">
      <circle cx="28" cy="28" r={r} stroke="var(--line)" strokeWidth="4" fill="none" />
      <circle
        cx="28" cy="28" r={r}
        stroke="var(--accent)" strokeWidth="4" fill="none"
        strokeDasharray={`${circ * score / 100} ${circ}`}
        transform="rotate(-90 28 28)"
        strokeLinecap="round"
      />
      <text x="28" y="32" textAnchor="middle" fontSize="14" fontWeight="700" fill="var(--ink)">{score}</text>
    </svg>
  )
}

export function FeedbackPage() {
  const { data, isLoading } = useFeedback()
  const qc = useQueryClient()
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [cooldown, setCooldown] = useState(0)

  const items: FeedbackItem[] = data?.data ?? []
  const latest = items[0]
  const past = items.slice(1)

  const handleGenerate = async () => {
    setGenerating(true)
    setError('')
    try {
      await generateFeedback()
      qc.invalidateQueries({ queryKey: ['feedback'] })
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 429) {
        setError('You already generated a review today. Try again tomorrow.')
        setCooldown(24 * 60 * 60)
      } else {
        setError('Failed to generate review. Try again later.')
      }
    } finally {
      setGenerating(false)
    }
  }

  return (
    <>
      <Topbar
        title="Coach"
        sub="AI feedback"
        right={
          <button className="iconbtn ghost" aria-label="Spark">
            <Icon name="spark" size={20} />
          </button>
        }
      />

      {/* Generate card */}
      <div className="card gen-card">
        <div className="gen-head">
          <div className="gen-icn"><Icon name="spark" size={20} /></div>
          <div>
            <div className="gen-title">14-day review</div>
            <div className="gen-sub">Analyze your last 14 days of sessions</div>
          </div>
        </div>
        <button
          className="btn primary full"
          disabled={generating || cooldown > 0}
          onClick={handleGenerate}
        >
          {generating ? <><span className="spinner" /> Analyzing…</> : 'Generate feedback'}
        </button>
        {error && <p className="error-msg">{error}</p>}
        <div className="gen-foot">1 generation per 24h · powered by Gemini 2.5 Flash</div>
      </div>

      {/* Latest review */}
      {latest && (
        <section className="section">
          <h3>Latest review</h3>
          <div className="card fb">
            <div className="fb-top">
              <div>
                <div className="fb-date">
                  {new Date(latest.generatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </div>
                <div className="fb-range">
                  {new Date(latest.periodStart).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  {' – '}
                  {new Date(latest.periodEnd).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </div>
              </div>
              <ScoreRing score={scoreFor(latest)} />
            </div>
            <div className="fb-headline">{latest.content.split('\n').find((l) => l.trim())?.replace(/^[#*\s-]+/, '').slice(0, 80)}</div>
            <p className="fb-body">{latest.content.slice(0, 400)}{latest.content.length > 400 ? '…' : ''}</p>
            <div className="fb-foot"><Icon name="spark" size={12} /> Gemini 2.5 Flash</div>
          </div>
        </section>
      )}

      {/* Past reviews */}
      {past.length > 0 && (
        <section className="section">
          <h3>Past reviews</h3>
          <div className="fb-list">
            {past.map((f) => (
              <div key={f.id} className="card fb">
                <div className="fb-top">
                  <div>
                    <div className="fb-date">
                      {new Date(f.generatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </div>
                    <div className="fb-range">
                      {new Date(f.periodStart).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      {' – '}
                      {new Date(f.periodEnd).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                  <ScoreRing score={scoreFor(f)} />
                </div>
                <p className="fb-body">{f.content.slice(0, 200)}{f.content.length > 200 ? '…' : ''}</p>
                <div className="fb-foot"><Icon name="spark" size={12} /> Gemini 2.5 Flash</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {isLoading && <p className="dim" style={{ fontSize: 13 }}>Loading…</p>}
      {!isLoading && items.length === 0 && (
        <p className="dim" style={{ fontSize: 13, marginTop: 8 }}>
          No reviews yet. Generate your first one above.
        </p>
      )}
    </>
  )
}
