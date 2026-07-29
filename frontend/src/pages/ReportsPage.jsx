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
  sales:           { icon: TrendingUp },
  expenses:        { icon: Receipt    },
  inventory:       { icon: Package    },
  customers:       { icon: Users      },
  'health-scores': { icon: Activity   },
  full:            { icon: FileText   },
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

const inputCls = 'rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E3B2E] focus:border-transparent'
const inputStyle = { border: '1px solid #E2E9E5', color: '#0A2820', background: '#fff' }

function DateRangeBar({ dateFrom, dateTo, setDateFrom, setDateTo }) {
  const dayCount = Math.round((new Date(dateTo) - new Date(dateFrom)) / 86400000) + 1

  return (
    <Card>
      <div className="px-6 py-4" style={{ borderBottom: '1px solid #E2E9E5' }}>
        <div className="flex items-center gap-2">
          <Calendar size={15} style={{ color: '#7A9184' }} />
          <p className="text-sm font-semibold" style={{ color: '#0A2820' }}>Select Date Range</p>
          {dayCount > 0 && (
            <span className="ml-auto text-xs font-medium px-2.5 py-0.5 rounded-full"
              style={{ background: 'rgba(14,59,46,0.08)', color: '#0E3B2E' }}>
              {dayCount} day{dayCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      <div className="px-6 py-4 flex items-center gap-6 flex-wrap">
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium uppercase tracking-wide w-6" style={{ color: '#7A9184' }}>From</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className={inputCls} style={inputStyle} />
        </div>

        <ChevronRight size={14} style={{ color: '#B7C4BC' }} className="shrink-0" />

        <div className="flex items-center gap-3">
          <label className="text-xs font-medium uppercase tracking-wide w-4" style={{ color: '#7A9184' }}>To</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className={inputCls} style={inputStyle} />
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs mr-1" style={{ color: '#B7C4BC' }}>Quick select:</span>
          {[7, 30, 90].map(n => (
            <button key={n}
              onClick={() => { setDateFrom(daysAgo(n - 1)); setDateTo(today()) }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{ background: '#FAFBF9', color: '#7A9184', border: '1px solid #E2E9E5' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(14,59,46,0.08)'; e.currentTarget.style.color = '#0E3B2E' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#FAFBF9'; e.currentTarget.style.color = '#7A9184' }}
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
    <div className="flex items-center gap-5 px-6 py-5 group transition-colors"
      style={{ ':hover': { background: '#FAFBF9' } }}
      onMouseEnter={e => e.currentTarget.style.background = '#FAFBF9'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: 'rgba(14,59,46,0.07)', color: '#0E3B2E' }}>
        <Icon size={19} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-snug" style={{ color: '#0A2820' }}>{report.label}</p>
        <p className="text-xs mt-0.5 leading-relaxed" style={{ color: '#B7C4BC' }}>{report.description}</p>
      </div>

      <span className="text-xs font-medium px-2 py-0.5 rounded-md shrink-0"
        style={{ background: '#FAFBF9', color: '#7A9184', border: '1px solid #E2E9E5' }}>
        CSV
      </span>

      <Button size="sm" variant={isLoading ? 'secondary' : 'primary'}
        onClick={() => onDownload(report.key)} disabled={isLoading}
        className="shrink-0 min-w-[110px] justify-center">
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

  const mainReports = reports.filter(r => r.key !== 'full')
  const fullReport  = reports.find(r => r.key === 'full')

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: "'Fraunces', serif", color: '#0A2820' }}>Reports</h1>
        <p className="text-sm mt-1" style={{ color: '#7A9184' }}>
          Export business data as CSV files. Open in Excel or Google Sheets.
        </p>
      </div>

      <DateRangeBar dateFrom={dateFrom} dateTo={dateTo} setDateFrom={setDateFrom} setDateTo={setDateTo} />

      <Card>
        <div className="px-6 py-4" style={{ borderBottom: '1px solid #E2E9E5' }}>
          <p className="text-sm font-semibold" style={{ color: '#0A2820' }}>Individual Reports</p>
          <p className="text-xs mt-0.5" style={{ color: '#B7C4BC' }}>Download each module separately</p>
        </div>
        <div style={{ borderTop: 'none' }}>
          {mainReports.map((r, i) => (
            <div key={r.key} style={i > 0 ? { borderTop: '1px solid #E2E9E5' } : {}}>
              <ReportRow report={r} loading={loading} onDownload={handleDownload} />
            </div>
          ))}
        </div>
      </Card>

      {fullReport && (
        <Card style={{ border: '1px solid #E2E9E5' }}>
          <div className="px-6 py-5 flex items-center gap-5">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(14,59,46,0.07)', color: '#0E3B2E' }}>
              <FileText size={19} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: '#0A2820' }}>{fullReport.label}</p>
              <p className="text-xs mt-0.5" style={{ color: '#B7C4BC' }}>{fullReport.description}</p>
            </div>
            <Button size="md" onClick={() => handleDownload(fullReport.key)}
              disabled={loading === fullReport.key}
              className="shrink-0 min-w-[130px] justify-center">
              <Download size={14} className={loading === fullReport.key ? 'animate-bounce' : ''} />
              {loading === fullReport.key ? 'Preparing…' : 'Full Export'}
            </Button>
          </div>
        </Card>
      )}

      <p className="text-xs pb-4" style={{ color: '#B7C4BC' }}>
        All reports include records within the selected date range only.
      </p>
    </div>
  )
}
