import { useEffect, useState } from 'react'
import './App.css'

function formatSize(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`
  }

  const kb = bytes / 1024

  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`
  }

  return `${(kb / 1024).toFixed(1)} MB`
}

function App() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [invoices, setInvoices] = useState([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)

  async function fetchInvoices() {
    try {
      const response = await fetch('/api/invoices')

      if (!response.ok) {
        throw new Error('Could not load stored invoices.')
      }

      const data = await response.json()
      setInvoices(data.invoices ?? [])
      setError('')
    } catch (loadError) {
      setError(loadError.message)
    }
  }

  useEffect(() => {
    async function loadOnMount() {
      await fetchInvoices()
      setIsLoading(false)
    }

    loadOnMount()
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    const form = event.currentTarget

    if (!selectedFile) {
      setError('Choose an invoice file first.')
      setMessage('')
      return
    }

    const formData = new FormData()
    formData.append('invoice', selectedFile)

    setIsUploading(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch('/api/invoices', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Invoice upload failed.')
      }

      setMessage(`${data.invoice.originalName} stored in backend/uploads.`)
      setSelectedFile(null)
      form.reset()
      setIsLoading(true)
      await fetchInvoices()
    } catch (uploadError) {
      setError(uploadError.message)
    } finally {
      setIsLoading(false)
      setIsUploading(false)
    }
  }

  return (
    <main className="upload-page">
      <section className="upload-card">
        <h1>Invoice Upload</h1>
        <p className="subtitle">
          First OCR step: receive an invoice file from the user and store it in
          the backend.
        </p>

        <form className="upload-form" onSubmit={handleSubmit}>
          <label htmlFor="invoice-file">Choose invoice</label>
          <input
            id="invoice-file"
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={(event) => {
              setSelectedFile(event.target.files?.[0] ?? null)
              setError('')
              setMessage('')
            }}
          />

          <button type="submit" disabled={isUploading}>
            {isUploading ? 'Uploading...' : 'Upload invoice'}
          </button>
        </form>

        {selectedFile ? (
          <p className="helper">
            Selected: {selectedFile.name} ({formatSize(selectedFile.size)})
          </p>
        ) : null}

        {message ? <p className="success">{message}</p> : null}
        {error ? <p className="error">{error}</p> : null}
      </section>

      <section className="list-card">
        <h2>Stored invoices</h2>

        {isLoading ? (
          <p className="helper">Loading uploaded invoices...</p>
        ) : invoices.length === 0 ? (
          <p className="helper">No invoices uploaded yet.</p>
        ) : (
          <ul className="invoice-list">
            {invoices.map((invoice) => (
              <li key={invoice.id}>
                <span>{invoice.originalName}</span>
                <small>
                  {formatSize(invoice.size)} • {new Date(invoice.uploadedAt).toLocaleString()}
                </small>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}

export default App
