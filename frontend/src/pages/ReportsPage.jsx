import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import toast from 'react-hot-toast'
import { Download, FileText, TrendingUp, Receipt, Package, Users, Activity, Calendar, ChevronRight } from 'lucide-react'
import api from '../api/client'

const today = () => new Date().toISOString().split('T')[0]
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString().split('T')[0]

const REPORT_META = {
  sales:           { icon: TrendingUp, color: 'bg-indigo-50 text-indigo-600',  border: 'border-indigo-100' },
  expenses:        { icon: Receipt,    color: 'bg-orange-50 text-orange-600',  border: 'border-orange-100' },
  inventory:       { icon: Package,    color: 'bg-purple-50 text-purple-600',  border: 'border-purple-100' },
  customers:       { icon: Users,      color: 'bg-blue-50 text-blue-600',      border: 'border-blue-100'   },
  'health-scores': { icon: Activity,   color: 'bg-emerald-50 text-emerald-600',border: 'border-emerald-100'},
  full:            { icon: FileText,   color: 'bg-gray-100 text-gray-600',     border: 'border-gray-200'   },
}

async function downloadReport(key, dateFrom, dateTo) {
  try {
    const resp = await api.get(`/reports/${key}/`, {
      params: { from: dateFrom, to: dateTo },
      responseType: 'blob',
    })
    const url = URL.createObjectURL(new Blob([resp.data]))
    const a = document.createElement('a')
    a.href = url
    a.download = `${key}_report_${dateFrom}_${dateTo}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Report downloaded.')
  } catch {
    toast.error('Could not download report. Make sure you have access.')
  }
}

function DateRangeBar({ dateFrom, dateTo, setDateFrom, setDateTo }) {
  const dayCount = Math.round((new Date(dateTo) - new Date(dateFrom)) / 86400000) + 1

  return (
    <Card>
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Calendar size={15} className="text-indigo-500" />
          <p className="text-sm font-semibold text-gray-800">Select Date Range</p>
          {dayCount > 0 && (
            <span className="ml-auto text-xs font-medium text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
              {dayCount} day{dayCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      <div className="px-6 py-4 flex items-center gap-6 flex-wrap">
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide w-6">From</label>
          <input
            type="date" value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <ChevronRight size={14} className="text-gray-300 shrink-0" />

        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide w-4">To</label>
          <input
            type="date" value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-gray-400 mr-1">Quick select:</span>
          {[7, 30, 90].map(n => (
            <button
              key={n}
              onClick={() => { setDateFrom(daysAgo(n - 1)); setDateTo(today()) }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
            >
              {n}d
            </button>
          ))}
        </div>
      </div>
    </Card>
  )
}

function ReportRow({ report, loading, onDownload }) {
  const meta = REPORT_META[report.key] ?? REPORT_META.full
  const Icon = meta.icon
  const isLoading = loading === report.key

  return (
    <div className="flex items-center gap-5 px-6 py-5 hover:bg-gray-50 transition-colors group">
      {/* Icon */}
      <div className={`w-11 h-11 rounded-xl ${meta.color} flex items-center justify-center shrink-0`}>
        <Icon size={19} />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 leading-snug">{report.label}</p>
        <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{report.description}</p>
      </div>

      {/* Format badge */}
      <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md shrink-0">
        CSV
      </span>

      {/* Download button */}
      <Button
        size="sm"
        variant={isLoading ? 'secondary' : 'primary'}
        onClick={() => onDownload(report.key)}
        disabled={isLoading}
        className="shrink-0 min-w-[110px] justify-center"
      >
        <Download size={13} className={isLoading ? 'animate-bounce' : ''} />
        {isLoading ? 'Preparing…' : 'Download'}
      </Button>
    </div>
  )
}

export default function ReportsPage() {
  const [dateFrom, setDateFrom] = useState(daysAgo(29))
  const [dateTo,   setDateTo]   = useState(today())
  const [loading,  setLoading]  = useState(null)

  const { data: reports = [] } = useQuery({
    queryKey: ['report-meta'],
    queryFn: () => api.get('/reports/').then(r => r.data),
  })

  const handleDownload = async (key) => {
    setLoading(key)
    await downloadReport(key, dateFrom, dateTo)
    setLoading(null)
  }

  // Split full export from the rest
  const mainReports = reports.filter(r => r.key !== 'full')
  const fullReport  = reports.find(r => r.key === 'full')

  return (
    <div className="space-y-8 max-w-3xl">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500 mt-1">
          Export business data as CSV files. Open in Excel or Google Sheets.
        </p>
      </div>

      {/* Date range */}
      <DateRangeBar
        dateFrom={dateFrom} dateTo={dateTo}
        setDateFrom={setDateFrom} setDateTo={setDateTo}
      />

      {/* Individual reports */}
      <Card>
        <div className="px-6 py-4 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-800">Individual Reports</p>
          <p className="text-xs text-gray-400 mt-0.5">Download each module separately</p>
        </div>

        <div className="divide-y divide-gray-100">
          {mainReports.map(r => (
            <ReportRow key={r.key} report={r} loading={loading} onDownload={handleDownload} />
          ))}
        </div>
      </Card>

      {/* Full export */}
      {fullReport && (
        <Card className={`border-2 ${REPORT_META.full.border}`}>
          <div className="px-6 py-5 flex items-center gap-5">
            <div className="w-11 h-11 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center shrink-0">
              <FileText size={19} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-800">{fullReport.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{fullReport.description}</p>
            </div>
            <Button
              size="md"
              onClick={() => handleDownload(fullReport.key)}
              disabled={loading === fullReport.key}
              className="shrink-0 min-w-[130px] justify-center"
            >
              <Download size={14} className={loading === fullReport.key ? 'animate-bounce' : ''} />
              {loading === fullReport.key ? 'Preparing…' : 'Full Export'}
            </Button>
          </div>
        </Card>
      )}

      <p className="text-xs text-gray-400 pb-4">
        All reports include records within the selected date range only.
      </p>
    </div>
  )
}
