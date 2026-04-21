import { useEffect, useState } from 'react'
import './App.css'

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

function App() {
  const [health, setHealth] = useState('Checking')
  const [invoices, setInvoices] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    async function loadDashboard() {
      setIsLoading(true)
      setError('')

      try {
        const [healthResponse, invoiceResponse] = await Promise.all([
          fetch('/api/health', { signal: controller.signal }),
          fetch('/api/invoices', { signal: controller.signal }),
        ])

        if (!healthResponse.ok || !invoiceResponse.ok) {
          throw new Error('The dashboard could not load data from the backend.')
        }

        const healthData = await healthResponse.json()
        const invoiceData = await invoiceResponse.json()

        setHealth(healthData.status)
        setInvoices(invoiceData.invoices ?? [])
      } catch (fetchError) {
        if (fetchError.name === 'AbortError') {
          return
        }

        setHealth('Offline')
        setInvoices([])
        setError(fetchError.message)
      } finally {
        setIsLoading(false)
      }
    }

    loadDashboard()

    return () => controller.abort()
  }, [])

  const totalAmount = invoices.reduce((sum, invoice) => sum + invoice.amount, 0)
  const averageAmount = invoices.length ? totalAmount / invoices.length : 0
  const paidInvoices = invoices.filter((invoice) => invoice.status === 'Paid').length

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Invoice Command Center</p>
          <h1>Track invoice health without leaving the browser.</h1>
          <p className="hero-text">
            The React app now pulls live data from the Flask API and shows a
            quick status snapshot for local development.
          </p>
        </div>

        <div className="status-card">
          <p className="status-label">Backend status</p>
          <p className={`status-value ${health.toLowerCase()}`}>{health}</p>
          <p className="status-help">
            {error || 'Connected through the Vite dev proxy at /api.'}
          </p>
        </div>
      </section>

      <section className="metrics-grid" aria-label="Invoice summary">
        <article className="metric-card">
          <span>Total invoices</span>
          <strong>{isLoading ? '...' : invoices.length}</strong>
        </article>
        <article className="metric-card">
          <span>Total value</span>
          <strong>{isLoading ? '...' : currencyFormatter.format(totalAmount)}</strong>
        </article>
        <article className="metric-card">
          <span>Average invoice</span>
          <strong>
            {isLoading ? '...' : currencyFormatter.format(Math.round(averageAmount))}
          </strong>
        </article>
        <article className="metric-card">
          <span>Paid invoices</span>
          <strong>{isLoading ? '...' : paidInvoices}</strong>
        </article>
      </section>

      <section className="content-grid">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Live invoices</p>
              <h2>Recent records</h2>
            </div>
            <button
              className="refresh-button"
              type="button"
              onClick={() => window.location.reload()}
            >
              Refresh
            </button>
          </div>

          {isLoading ? (
            <p className="empty-state">Loading invoice data...</p>
          ) : error ? (
            <p className="empty-state">{error}</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Client</th>
                    <th>Status</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td>{invoice.number}</td>
                      <td>{invoice.client}</td>
                      <td>
                        <span
                          className={`status-pill ${invoice.status.toLowerCase()}`}
                        >
                          {invoice.status}
                        </span>
                      </td>
                      <td>{currencyFormatter.format(invoice.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <aside className="panel checklist-panel">
          <p className="eyebrow">Dev checklist</p>
          <h2>What was fixed</h2>
          <ul className="checklist">
            <li>Frontend now requests invoice data from the backend.</li>
            <li>Vite proxy keeps API requests local and simple.</li>
            <li>Local dev works for both `localhost` and `127.0.0.1`.</li>
          </ul>
        </aside>
      </section>
    </main>
  )
}

export default App
