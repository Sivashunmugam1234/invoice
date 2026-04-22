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

function formatDate(value) {
  return new Date(value).toLocaleString()
}

function App() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [invoices, setInvoices] = useState([])
  const [activeInvoiceId, setActiveInvoiceId] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)

  const activeInvoice =
    invoices.find((invoice) => invoice.id === activeInvoiceId) ?? invoices[0] ?? null

  async function fetchInvoices() {
    try {
      const response = await fetch('/api/invoices')

      if (!response.ok) {
        throw new Error('Could not load uploaded invoices.')
      }

      const data = await response.json()
      const nextInvoices = data.invoices ?? []

      setInvoices(nextInvoices)
      setActiveInvoiceId((currentId) => {
        if (nextInvoices.length === 0) {
          return ''
        }

        if (currentId && nextInvoices.some((invoice) => invoice.id === currentId)) {
          return currentId
        }

        return nextInvoices[0].id
      })
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

      setMessage(`${data.invoice.originalName} uploaded successfully.`)
      setSelectedFile(null)
      setActiveInvoiceId(data.invoice.id)
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

  function renderPreview() {
    if (!activeInvoice) {
      return <p className="empty-state">Upload an invoice to preview it here.</p>
    }

    if (activeInvoice.mimeType === 'application/pdf') {
      return (
        <iframe
          key={activeInvoice.id}
          className="document-frame"
          src={activeInvoice.previewUrl}
          title={activeInvoice.originalName}
        />
      )
    }

    if (activeInvoice.mimeType.startsWith('image/')) {
      return (
        <img
          key={activeInvoice.id}
          className="document-image"
          src={activeInvoice.previewUrl}
          alt={activeInvoice.originalName}
        />
      )
    }

    return <p className="empty-state">Preview is not available for this file type.</p>
  }

  return (
    <main className="dashboard">
      <section className="top-bar">
        <div>
          <p className="eyebrow">OCR Dashboard</p>
          <h1>Upload and inspect invoices</h1>
          <p className="subtitle">
            This keeps the first OCR step simple: upload files, store them in the
            backend, and review each uploaded document before extraction.
          </p>
        </div>
      </section>

      <section className="dashboard-grid">
        <aside className="panel upload-panel">
          <h2>Upload invoice</h2>

          <form className="upload-form" onSubmit={handleSubmit}>
            <label htmlFor="invoice-file">Choose PDF or image</label>
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
        </aside>

        <section className="panel list-panel">
          <div className="section-header">
            <h2>Uploaded documents</h2>
            <span className="badge">{invoices.length}</span>
          </div>

          {isLoading ? (
            <p className="helper">Loading uploaded invoices...</p>
          ) : invoices.length === 0 ? (
            <p className="empty-state">No invoices uploaded yet.</p>
          ) : (
            <ul className="invoice-list">
              {invoices.map((invoice) => (
                <li key={invoice.id}>
                  <button
                    type="button"
                    className={
                      invoice.id === activeInvoice?.id
                        ? 'invoice-item invoice-item-active'
                        : 'invoice-item'
                    }
                    onClick={() => setActiveInvoiceId(invoice.id)}
                  >
                    <span className="invoice-name">{invoice.originalName}</span>
                    <small>
                      {formatSize(invoice.size)} - {formatDate(invoice.uploadedAt)}
                    </small>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel preview-panel">
          <div className="section-header">
            <div>
              <h2>Document viewer</h2>
              {activeInvoice ? (
                <p className="helper">
                  {activeInvoice.originalName} - {formatSize(activeInvoice.size)}
                </p>
              ) : null}
            </div>
            {activeInvoice ? (
              <a
                className="open-link"
                href={activeInvoice.previewUrl}
                target="_blank"
                rel="noreferrer"
              >
                Open file
              </a>
            ) : null}
          </div>

          <div className="preview-surface">{renderPreview()}</div>
        </section>
      </section>
    </main>
  )
}

export default App
