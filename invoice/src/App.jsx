import { useEffect, useRef, useState } from 'react'
import AuthView from './components/AuthView'
import DashboardHeader from './components/DashboardHeader'
import UploadPanel from './components/UploadPanel'
import InvoiceListPanel from './components/InvoiceListPanel'
import PreviewPanel from './components/PreviewPanel'
import ExtractedFieldsPanel from './components/ExtractedFieldsPanel'

const TOKEN_KEY = 'invoice_auth_token'

export default function App() {
  const [authToken, setAuthToken] = useState(() => localStorage.getItem(TOKEN_KEY) || '')
  const [authUser, setAuthUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)

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
  const fileInputRef = useRef(null)

  const activeInvoice =
    invoices.find(inv => inv.id === activeInvoiceId) ?? invoices[0] ?? null
  const storedCount = invoices.filter(inv => inv.status === 'stored').length

  function resetExtractionView() {
    setExtractedFields(null)
    setValidationResult(null)
    setWorkflowStatus('')
    setExtractError('')
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
      setMessage(`${data.invoice.originalName} uploaded.`)
      setSelectedFile(null)
      setActiveInvoiceId(data.invoice.id)
      if (fileInputRef.current) fileInputRef.current.value = ''
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
    resetExtractionView()
    try {
      const res = await authFetch(`/api/invoices/${activeInvoice.id}/extract`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Extraction failed.')
      setExtractedFields(data.fields)
      setValidationResult(data.validation ?? null)
      setWorkflowStatus(data.workflow_status ?? '')
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
    resetExtractionView()
  }

  if (authLoading || !authUser) {
    return (
      <AuthView
        authLoading={authLoading}
        loginEmail={loginEmail}
        loginPassword={loginPassword}
        loginError={loginError}
        isLoggingIn={isLoggingIn}
        setLoginEmail={setLoginEmail}
        setLoginPassword={setLoginPassword}
        onLogin={handleLogin}
      />
    )
  }

  return (
    <main className="flex flex-col gap-5 animate-fadeUp">
      <DashboardHeader
        authUser={authUser}
        invoicesCount={invoices.length}
        storedCount={storedCount}
        onDownloadAllCsv={() => downloadFile('/api/export/csv', 'all_invoices.csv')}
        onDownloadAllExcel={() => downloadFile('/api/export/excel', 'all_invoices.xlsx')}
        onLogout={handleLogout}
      />

      <div className="grid gap-5 grid-cols-[300px_340px_1fr] items-start max-lg:grid-cols-2 max-[680px]:grid-cols-1">
        <UploadPanel
          selectedFile={selectedFile}
          onFilePick={handleFilePick}
          message={message}
          error={error}
          isUploading={isUploading}
          onSubmit={handleUpload}
          fileInputRef={fileInputRef}
        />

        <InvoiceListPanel
          invoices={invoices}
          isLoading={isLoading}
          activeInvoiceId={activeInvoice?.id}
          onSelectInvoice={handleSelectInvoice}
        />

        <PreviewPanel
          activeInvoice={activeInvoice}
          authToken={authToken}
          isExtracting={isExtracting}
          onExtract={handleExtract}
          onExportCsv={() => {
            if (!activeInvoice) return
            downloadFile(`/api/invoices/${activeInvoice.id}/export/csv`, `invoice_${activeInvoice.id}.csv`)
          }}
          onExportExcel={() => {
            if (!activeInvoice) return
            downloadFile(`/api/invoices/${activeInvoice.id}/export/excel`, `invoice_${activeInvoice.id}.xlsx`)
          }}
        />

        <ExtractedFieldsPanel
          extractedFields={extractedFields}
          extractError={extractError}
          validationResult={validationResult}
          workflowStatus={workflowStatus}
        />
      </div>
    </main>
  )
}
