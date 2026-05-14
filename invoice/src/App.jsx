import { useEffect, useRef, useState } from 'react'
import AuthView from './components/AuthView'
import DashboardHeader from './components/DashboardHeader'
import UploadPanel from './components/UploadPanel'
import InvoiceListPanel from './components/InvoiceListPanel'
import PreviewPanel from './components/PreviewPanel'
import { withToken } from './utils/invoiceUi'

const TOKEN_KEY = 'invoice_auth_token'

export default function App() {
  const [authToken, setAuthToken] = useState(() => localStorage.getItem(TOKEN_KEY) || '')
  const [authUser, setAuthUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authMode, setAuthMode] = useState('signin')
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [signupFullName, setSignupFullName] = useState('')
  const [signupOrgName, setSignupOrgName] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('')
  const [signupError, setSignupError] = useState('')
  const [isSigningUp, setIsSigningUp] = useState(false)

  const [selectedFile, setSelectedFile] = useState(null)
  const [invoices, setInvoices] = useState([])
  const [activeInvoiceId, setActiveInvoiceId] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [extractedFields, setExtractedFields] = useState(null)
  const [validationResult, setValidationResult] = useState(null)
  const [workflowStatus, setWorkflowStatus] = useState('')
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractError, setExtractError] = useState('')
  const [reviewDecision, setReviewDecision] = useState(null)
  const [decisionReason, setDecisionReason] = useState('')
  const [isSavingDecision, setIsSavingDecision] = useState(false)
  const [decisionError, setDecisionError] = useState('')
  const [decisionMessage, setDecisionMessage] = useState('')
  const fileInputRef = useRef(null)

  const activeInvoice =
    invoices.find(inv => inv.id === activeInvoiceId) ?? invoices[0] ?? null
  const reviewedCount = invoices.filter(inv => Boolean(inv.decision)).length
  const pendingReviewCount = invoices.length - reviewedCount

  function resetExtractionView() {
    setExtractedFields(null)
    setValidationResult(null)
    setWorkflowStatus('')
    setExtractError('')
    setReviewDecision(null)
    setDecisionReason('')
    setDecisionError('')
    setDecisionMessage('')
  }

  function resetAppState() {
    setInvoices([])
    setActiveInvoiceId('')
    setSelectedFile(null)
    resetExtractionView()
    setMessage('')
    setError('')
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY)
    setAuthToken('')
    setAuthUser(null)
    resetAppState()
  }

  async function authFetch(url, options = {}) {
    const headers = new Headers(options.headers || {})
    if (authToken) headers.set('Authorization', `Bearer ${authToken}`)
    const res = await fetch(url, { ...options, headers })
    if (res.status === 401 && authToken) {
      clearSession()
      throw new Error('Your session expired. Please login again.')
    }
    return res
  }

  async function fetchInvoices() {
    try {
      const res = await authFetch('/api/invoices')
      if (!res.ok) throw new Error('Could not load invoices.')
      const data = await res.json()
      const next = data.invoices ?? []
      setInvoices(next)
      setActiveInvoiceId(cur => {
        if (!next.length) return ''
        if (cur && next.some(inv => inv.id === cur)) return cur
        return next[0].id
      })
      setError('')
    } catch (e) {
      setError(e.message)
    }
  }

  useEffect(() => {
    if (!authToken) {
      setAuthLoading(false)
      return
    }
    ;(async () => {
      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${authToken}` },
        })
        if (!res.ok) throw new Error('Invalid session')
        const data = await res.json()
        setAuthUser(data.user)
      } catch {
        clearSession()
      } finally {
        setAuthLoading(false)
      }
    })()
  }, [authToken])

  useEffect(() => {
    if (!authUser) return
    setIsLoading(true)
    fetchInvoices().finally(() => setIsLoading(false))
  }, [authUser])

  useEffect(() => {
    if (!authUser || !activeInvoiceId) return
    ;(async () => {
      try {
        const res = await authFetch(`/api/invoices/${activeInvoiceId}/review`)
        if (!res.ok) throw new Error('Could not load invoice review data.')
        const data = await res.json()
        setExtractedFields(data.fields ?? null)
        setValidationResult(data.validation ?? null)
        setWorkflowStatus(data.workflow_status ?? '')
        setReviewDecision(data.decision ?? null)
        setDecisionReason(data.decision?.reason ?? '')
        setExtractError('')
      } catch (e) {
        setExtractError(e.message)
      }
    })()
  }, [authUser, activeInvoiceId])

  async function handleLogin(e) {
    e.preventDefault()
    if (!loginEmail || !loginPassword) {
      setLoginError('Enter email and password.')
      return
    }
    setIsLoggingIn(true)
    setLoginError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Login failed.')
      localStorage.setItem(TOKEN_KEY, data.token)
      setAuthToken(data.token)
      setAuthUser(data.user)
      setLoginPassword('')
    } catch (e) {
      setLoginError(e.message)
    } finally {
      setIsLoggingIn(false)
    }
  }

  async function handleSignup(e) {
    e.preventDefault()
    if (!signupFullName || !signupOrgName || !signupEmail || !signupPassword || !signupConfirmPassword) {
      setSignupError('Please fill all sign up fields.')
      return
    }
    if (signupPassword !== signupConfirmPassword) {
      setSignupError('Passwords do not match.')
      return
    }
    setIsSigningUp(true)
    setSignupError('')
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: signupFullName,
          organizationName: signupOrgName,
          email: signupEmail,
          password: signupPassword,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Sign up failed.')
      localStorage.setItem(TOKEN_KEY, data.token)
      setAuthToken(data.token)
      setAuthUser(data.user)
      setSignupPassword('')
      setSignupConfirmPassword('')
    } catch (e) {
      setSignupError(e.message)
    } finally {
      setIsSigningUp(false)
    }
  }

  async function handleLogout() {
    try {
      await authFetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // no-op
    } finally {
      clearSession()
    }
  }

  function handleFilePick(file) {
    if (!file) return
    setSelectedFile(file)
    setError('')
    setMessage('')
  }

  async function handleUpload(e) {
    e.preventDefault()
    if (!selectedFile) {
      setError('Choose an invoice file first.')
      return
    }
    const fd = new FormData()
    fd.append('invoice', selectedFile)
    setIsUploading(true)
    setError('')
    setMessage('')
    try {
      const res = await authFetch('/api/invoices', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed.')
      setMessage(data.message || `${data.invoice.originalName} uploaded.`)
      setSelectedFile(null)
      setActiveInvoiceId(data.invoice.id)
      if (fileInputRef.current) fileInputRef.current.value = ''
      if (data.fields) {
        setExtractedFields(data.fields)
      }
      if (data.validation) {
        setValidationResult(data.validation)
      }
      if (data.workflow_status) {
        setWorkflowStatus(data.workflow_status)
      }
      if (data.processingError) {
        setExtractError(data.processingError)
      }
      await fetchInvoices()
    } catch (e) {
      setError(e.message)
    } finally {
      setIsUploading(false)
    }
  }

  async function handleExtract() {
    if (!activeInvoice) return
    setIsExtracting(true)
    setExtractError('')
    setDecisionError('')
    setDecisionMessage('')
    try {
      const res = await authFetch(`/api/invoices/${activeInvoice.id}/extract`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Extraction failed.')
      setExtractedFields(data.fields)
      setValidationResult(data.validation ?? null)
      setWorkflowStatus(data.workflow_status ?? '')
      setReviewDecision(null)
      fetchInvoices()
    } catch (e) {
      setExtractError(e.message)
    } finally {
      setIsExtracting(false)
    }
  }

  async function downloadFile(url, fallbackName) {
    try {
      const res = await authFetch(url)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Download failed.')
      }
      const blob = await res.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = downloadUrl
      anchor.download = fallbackName
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.URL.revokeObjectURL(downloadUrl)
    } catch (e) {
      setError(e.message)
    }
  }

  function handleSelectInvoice(invoiceId) {
    setActiveInvoiceId(invoiceId)
    setDecisionMessage('')
    setDecisionError('')
  }

  function handleOpenInvoiceInNewTab(invoice) {
    if (!invoice) return
    const url = withToken(invoice.previewUrl, authToken)
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  async function saveDecision(decision) {
    if (!activeInvoice) return
    setIsSavingDecision(true)
    setDecisionError('')
    setDecisionMessage('')
    try {
      const res = await authFetch(`/api/invoices/${activeInvoice.id}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          reason: decisionReason,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not save decision.')
      setDecisionMessage(data.message || `Invoice marked as ${decision}.`)
      setReviewDecision({
        decision,
        reason: decisionReason,
      })
      fetchInvoices()
    } catch (e) {
      setDecisionError(e.message)
    } finally {
      setIsSavingDecision(false)
    }
  }

  function handleApprove() {
    saveDecision('approved')
  }

  function handleReject() {
    saveDecision('rejected')
  }

  if (authLoading || !authUser) {
    return (
      <AuthView
        authLoading={authLoading}
        authMode={authMode}
        loginEmail={loginEmail}
        loginPassword={loginPassword}
        loginError={loginError}
        isLoggingIn={isLoggingIn}
        signupFullName={signupFullName}
        signupOrgName={signupOrgName}
        signupEmail={signupEmail}
        signupPassword={signupPassword}
        signupConfirmPassword={signupConfirmPassword}
        signupError={signupError}
        isSigningUp={isSigningUp}
        setLoginEmail={setLoginEmail}
        setLoginPassword={setLoginPassword}
        setSignupFullName={setSignupFullName}
        setSignupOrgName={setSignupOrgName}
        setSignupEmail={setSignupEmail}
        setSignupPassword={setSignupPassword}
        setSignupConfirmPassword={setSignupConfirmPassword}
        setAuthMode={setAuthMode}
        onLogin={handleLogin}
        onSignup={handleSignup}
      />
    )
  }

  return (
    <main className="flex flex-col gap-4 animate-fadeUp">
      <DashboardHeader
        authUser={authUser}
        invoicesCount={invoices.length}
        storedCount={reviewedCount}
        onDownloadAllCsv={() => downloadFile('/api/export/csv', 'all_invoices.csv')}
        onDownloadAllExcel={() => downloadFile('/api/export/excel', 'all_invoices.xlsx')}
        onLogout={handleLogout}
      />

      <section className="bg-bg2 border border-border rounded-2xl p-4 grid grid-cols-[repeat(3,minmax(120px,1fr))_auto] gap-3 items-stretch max-xl:grid-cols-2 max-sm:grid-cols-1">
        <article className="rounded-xl border border-border bg-bg3 px-4 py-3">
          <p className="text-[0.72rem] uppercase tracking-[0.12em] text-text-3 font-mono">Uploaded</p>
          <p className="text-[1.5rem] font-semibold text-text mt-1">{invoices.length}</p>
        </article>
        <article className="rounded-xl border border-border bg-bg3 px-4 py-3">
          <p className="text-[0.72rem] uppercase tracking-[0.12em] text-text-3 font-mono">Processed</p>
          <p className="text-[1.5rem] font-semibold text-text mt-1">{reviewedCount}</p>
        </article>
        <article className="rounded-xl border border-border bg-bg3 px-4 py-3">
          <p className="text-[0.72rem] uppercase tracking-[0.12em] text-text-3 font-mono">Pending Review</p>
          <p className="text-[1.5rem] font-semibold text-text mt-1">{pendingReviewCount}</p>
        </article>
        <div className="flex items-center gap-2 justify-end max-xl:col-span-2 max-xl:justify-start max-sm:col-span-1">
          <button
            type="button"
            className="px-3.5 py-2 rounded-xl border border-border-hi bg-transparent text-text-2 text-[0.8rem] font-medium transition hover:border-gold hover:text-gold hover:bg-gold-dim"
            onClick={() => downloadFile('/api/export/csv', 'all_invoices.csv')}
          >
            Export CSV
          </button>
          <button
            type="button"
            className="px-3.5 py-2 rounded-xl border border-border-hi bg-transparent text-text-2 text-[0.8rem] font-medium transition hover:border-gold hover:text-gold hover:bg-gold-dim"
            onClick={() => downloadFile('/api/export/excel', 'all_invoices.xlsx')}
          >
            Export Excel
          </button>
        </div>
      </section>

      <div className="grid gap-4 grid-cols-[320px_360px_minmax(0,1fr)] items-start max-[1280px]:grid-cols-[300px_minmax(0,1fr)] max-[960px]:grid-cols-1">
        <div className="flex flex-col gap-4 max-[1280px]:col-span-1">
          <UploadPanel
            selectedFile={selectedFile}
            onFilePick={handleFilePick}
            message={message}
            error={error}
            isUploading={isUploading}
            onSubmit={handleUpload}
            fileInputRef={fileInputRef}
          />
        </div>

        <div className="max-[1280px]:order-3">
          <InvoiceListPanel
            invoices={invoices}
            isLoading={isLoading}
            activeInvoiceId={activeInvoice?.id}
            onSelectInvoice={handleSelectInvoice}
            onOpenInvoice={handleOpenInvoiceInNewTab}
          />
        </div>

        <div className="max-[1280px]:col-span-1 max-[1280px]:order-2">
          <PreviewPanel
            activeInvoice={activeInvoice}
            extractedFields={extractedFields}
            validationResult={validationResult}
            workflowStatus={workflowStatus}
            isExtracting={isExtracting}
            onExtract={handleExtract}
            onExportCsv={() => downloadFile('/api/export/csv', 'all_invoices.csv')}
            onExportExcel={() => downloadFile('/api/export/excel', 'all_invoices.xlsx')}
            decision={reviewDecision}
            decisionReason={decisionReason}
            onDecisionReasonChange={setDecisionReason}
            onApprove={handleApprove}
            onReject={handleReject}
            isSavingDecision={isSavingDecision}
            decisionError={decisionError}
            decisionMessage={decisionMessage}
          />
        </div>
      </div>
      {extractError && <div className="px-3.5 py-2.5 rounded-[10px] text-[0.82rem] bg-red-dim text-red border border-red/30">x {extractError}</div>}
    </main>
  )
}
