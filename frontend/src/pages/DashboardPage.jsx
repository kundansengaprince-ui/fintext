import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getLatestScore, getScoreHistory, computeScore } from '../api'
import HealthScoreGauge from '../components/dashboard/HealthScoreGauge'
import ScoreTrendChart from '../components/dashboard/ScoreTrendChart'
import KPICards from '../components/dashboard/KPICards'
import Recommendations from '../components/dashboard/Recommendations'
import ModelComparison from '../components/dashboard/ModelComparison'
import ProfitLossCard from '../components/dashboard/ProfitLossCard'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import toast from 'react-hot-toast'
import { RefreshCw, Calendar } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const today = () => new Date().toISOString().split('T')[0]

export default function DashboardPage() {
  const { can, business } = useAuth()
  const qc = useQueryClient()
  const [targetDate, setTargetDate] = useState(today())

  const { data: latest, isLoading: latestLoading } = useQuery({
    queryKey: ['latest-score'],
    queryFn: () => getLatestScore().then(r => r.data),
    retry: 1,
  })

  const { data: history = [] } = useQuery({
    queryKey: ['score-history'],
    queryFn: () => getScoreHistory().then(r => r.data.results ?? r.data),
  })

  const compute = useMutation({
    mutationFn: (date) => computeScore(date),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['latest-score'] })
      qc.invalidateQueries({ queryKey: ['score-history'] })
      toast.success('Health score computed successfully.')
    },
    onError: (err) => {
      const msg = err.response?.data?.error ?? 'Could not compute score — make sure data exists for this date.'
      toast.error(msg)
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Business Health Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">{business?.name ?? 'Business Health Dashboard'}</p>
        </div>
        {can.computeScore && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
              <Calendar size={16} className="text-gray-400" />
              <input
                type="date"
                value={targetDate}
                onChange={e => setTargetDate(e.target.value)}
                className="text-sm text-gray-700 bg-transparent focus:outline-none"
              />
            </div>
            <Button
              onClick={() => compute.mutate(targetDate)}
              disabled={compute.isPending}
              size="md"
            >
              <RefreshCw size={15} className={compute.isPending ? 'animate-spin' : ''} />
              {compute.isPending ? 'Computing…' : 'Compute Score'}
            </Button>
          </div>
        )}
      </div>

      {latestLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="h-48 animate-pulse bg-gray-100" />
          ))}
        </div>
      ) : !latest ? (
        <Card className="p-12 text-center">
          <p className="text-gray-500 text-lg font-medium">No health score computed yet.</p>
          <p className="text-gray-400 text-sm mt-2">
            Add sales, expenses, inventory, and customer data, then click <strong>Compute Score</strong>.
          </p>
        </Card>
      ) : (
        <>
          {/* Hero row — health score centrepiece */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1 flex flex-col items-center justify-center py-8 bg-gradient-to-b from-indigo-50 to-white border-indigo-100">
              <p className="text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-3">Business Health Score</p>
              <HealthScoreGauge score={latest.score} label={latest.label} trend={latest.trend} />
              <div className="mt-4 text-center">
                <p className="text-xs text-gray-400">
                  Last computed: {new Date(latest.updated_at).toLocaleString('en-RW', {
                    dateStyle: 'medium', timeStyle: 'short'
                  })}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">For date: {latest.date}</p>
              </div>
            </Card>

            <div className="lg:col-span-2 flex flex-col gap-6">
              <ProfitLossCard score={latest} />
              <Card className="flex-1">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">30-Day Score Trend</h2>
                <ScoreTrendChart data={history} />
              </Card>
            </div>
          </div>

          <KPICards score={latest} />

          {latest.recommendations?.length > 0 && (
            <Recommendations recommendations={latest.recommendations} />
          )}

          <ModelComparison date={latest.date} />
        </>
      )}
    </div>
  )
}
