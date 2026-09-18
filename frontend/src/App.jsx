import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import './App.css';

function App() {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [research, setResearch] = useState(null);
  const [error, setError] = useState('');

  const [token, setToken] = useState(
    () => localStorage.getItem('token')
  );

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activePage, setActivePage] = useState('research');

  const [documents, setDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentTitle, setDocumentTitle] = useState('');
  const [documentSource, setDocumentSource] = useState('');
  const [documentContent, setDocumentContent] = useState('');
  const [documentLoading, setDocumentLoading] = useState(false);
  const [documentError, setDocumentError] = useState('');
  const [documentMessage, setDocumentMessage] = useState('');
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [documentViewLoading, setDocumentViewLoading] = useState(false);
  const [documentViewError, setDocumentViewError] = useState('');


  const [darkMode, setDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');

    if (savedMode === null) {
      return true;
    }

    return savedMode === 'true';
  });

  useEffect(() => {
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  /*
   * --------------------------------------------------------------------------
   * Authentication
   * --------------------------------------------------------------------------
   */

  const handleLogin = async (event) => {
    event.preventDefault();

    if (!email.trim() || !password) {
      setError('Email and password are required');
      return;
    }

    setAuthLoading(true);
    setError('');

    try {
      const response = await fetch(
        'http://localhost:5000/api/auth/login',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: email.trim(),
            password
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'Login failed'
        );
      }

      localStorage.setItem('token', data.token);

      setToken(data.token);
      setEmail('');
      setPassword('');
      setError('');

    } catch (error) {
      console.error('Login failed:', error);
      setError(error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');

    setToken(null);
    setResearch(null);
    setHistory([]);
    setQuestion('');
    setDocuments([]);
    setDocumentTitle('');
    setDocumentSource('');
    setDocumentContent('');
    setDocumentError('');
    setDocumentMessage('');
    setSelectedDocument(null);
    setDocumentViewError('');
    setActivePage('research');
    setError('');
  };

  /*
   * --------------------------------------------------------------------------
   * Research History
   * --------------------------------------------------------------------------
   */

  useEffect(() => {
    if (!token) {
      return;
    }

    const fetchHistory = async () => {
      setHistoryLoading(true);

      try {
        const response = await fetch(
          'http://localhost:5000/api/research',
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
            'Failed to load research history'
          );
        }

        setHistory(data.researchHistory);

      } catch (error) {
        console.error(
          'Failed to load history:',
          error
        );

        setError(error.message);

      } finally {
        setHistoryLoading(false);
      }
    };

    fetchHistory();

  }, [token]);

  /*
   * --------------------------------------------------------------------------
   * Start New Research
   * --------------------------------------------------------------------------
   */

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!question.trim()) {
      return;
    }

    setLoading(true);
    setError('');
    setResearch(null);

    try {
      const response = await fetch(
        'http://localhost:5000/api/research',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            question: question.trim()
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
          'Research request failed'
        );
      }

      const newResearch = {
        researchRequest: data.researchRequest,
        report: null,
        sources: []
      };

      setResearch(newResearch);

      /*
       * Put the new request at the top of history.
       */
      setHistory((current) => [
        data.researchRequest,
        ...current
      ]);

      /*
       * Clear the input after submitting.
       */
      setQuestion('');

    } catch (error) {
      console.error(
        'Research request failed:',
        error
      );

      setError(error.message);

    } finally {
      setLoading(false);
    }
  };

  /*
   * --------------------------------------------------------------------------
   * Poll Research Status
   * --------------------------------------------------------------------------
   */

  useEffect(() => {
    if (
      !token ||
      !research?.researchRequest?.id
    ) {
      return;
    }

    if (
      research.researchRequest.status === 'completed' ||
      research.researchRequest.status === 'failed'
    ) {
      return;
    }

    const checkResearchStatus = async () => {
      try {
        const response = await fetch(
          `http://localhost:5000/api/research/${research.researchRequest.id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
            'Failed to get research status'
          );
        }

        setResearch(data);

        setHistory((current) =>
          current.map((item) =>
            item.id === data.researchRequest.id
              ? data.researchRequest
              : item
          )
        );

      } catch (error) {
        console.error(
          'Polling failed:',
          error
        );

        setError(error.message);
      }
    };

    const timer = setTimeout(
      checkResearchStatus,
      3000
    );

    return () => clearTimeout(timer);

  }, [research, token]);

  /*
   * --------------------------------------------------------------------------
   * Open Previous Research
   * --------------------------------------------------------------------------
   */

  const handleHistoryClick = async (researchId) => {
    setError('');
    setLoading(true);

    try {
      const response = await fetch(
        `http://localhost:5000/api/research/${researchId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
          'Failed to load research'
        );
      }

      setResearch(data);

    } catch (error) {
      console.error(
        'Failed to load research:',
        error
      );

      setError(error.message);

    } finally {
      setLoading(false);
    }
  };


  /*
   * --------------------------------------------------------------------------
   * Knowledge Base
   * --------------------------------------------------------------------------
   */

  const fetchDocuments = async () => {
    if (!token) {
      return;
    }

    setDocumentsLoading(true);
    setDocumentError('');

    try {
      const response = await fetch(
        'http://localhost:5000/api/documents',
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'Failed to load documents'
        );
      }

      setDocuments(data.documents || []);

    } catch (error) {
      console.error('Failed to load documents:', error);
      setDocumentError(error.message);
    } finally {
      setDocumentsLoading(false);
    }
  };

  const handleDocumentSubmit = async (event) => {
    event.preventDefault();

    if (!documentTitle.trim() || !documentContent.trim()) {
      setDocumentError('Title and content are required');
      setDocumentMessage('');
      return;
    }

    setDocumentLoading(true);
    setDocumentError('');
    setDocumentMessage('');

    try {
      const response = await fetch(
        'http://localhost:5000/api/documents',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            title: documentTitle.trim(),
            source: documentSource.trim(),
            content: documentContent.trim()
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'Failed to create document'
        );
      }

      setDocumentTitle('');
      setDocumentSource('');
      setDocumentContent('');

      setDocumentMessage(
        `Document created successfully. ${data.chunksCreated} chunks created.`
      );

      await fetchDocuments();

    } catch (error) {
      console.error('Document creation failed:', error);
      setDocumentError(error.message);
    } finally {
      setDocumentLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      return;
    }

    const loadDocuments = async () => {
      setDocumentsLoading(true);
      setDocumentError('');

      try {
        const response = await fetch(
          'http://localhost:5000/api/documents',
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch documents');
        }

        setDocuments(data.documents);
      } catch (error) {
        console.error('Failed to fetch documents:', error);
        setDocumentError(error.message);
      } finally {
        setDocumentsLoading(false);
      }
    };

    loadDocuments();
  }, [token]);

  const handleDocumentClick = async (documentId) => {
    setDocumentViewLoading(true);
    setDocumentViewError('');

    try {
      const response = await fetch(
        `http://localhost:5000/api/documents/${documentId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'Failed to load document'
        );
      }

      setSelectedDocument(data.document);

    } catch (error) {
      console.error('Failed to load document:', error);
      setDocumentViewError(error.message);
    } finally {
      setDocumentViewLoading(false);
    }
  };

  /*
   * --------------------------------------------------------------------------
   * Render
   * --------------------------------------------------------------------------
   */

  return (
    <div
      className={
        darkMode
          ? 'app dark'
          : 'app light'
      }
    >

      <main>

        {!token && (
          <form
            className="auth-form"
            onSubmit={handleLogin}
          >

            <div className="auth-header">

              <h2>
                Welcome back
              </h2>

              <p>
                Login to continue your research.
              </p>

            </div>

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="Email"
            />

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="Password"
            />

            <button
              type="submit"
              disabled={authLoading}
            >
              {authLoading
                ? 'Logging in...'
                : 'Login'}
            </button>

            {error && (
              <div className="error-message">
                <strong>Error:</strong>{' '}
                {error}
              </div>
            )}

          </form>
        )}

        {token && (
          <>

            {/* ---------------------------------------------------------------- */}
            {/* Header */}
            {/* ---------------------------------------------------------------- */}

            <header className="app-header">

              <div>

                <h1>
                  AI Research Agent
                </h1>

                <p>
                  Ask a question and let the research agent
                  investigate it using web research and your
                  private knowledge.
                </p>

              </div>

              <div className="header-actions">

                <button
                  type="button"
                  className="theme-toggle"
                  onClick={() =>
                    setDarkMode(
                      (current) => !current
                    )
                  }
                  aria-label="Toggle theme"
                >
                  {darkMode
                    ? '☀️ Light'
                    : '🌙 Dark'}
                </button>

                <button
                  type="button"
                  className="logout-button"
                  onClick={handleLogout}
                >
                  Logout
                </button>

              </div>

            </header>

            {/* ---------------------------------------------------------------- */}
            {/* Main Navigation */}
            {/* ---------------------------------------------------------------- */}

            <nav className="main-navigation">

              <button
                type="button"
                className={
                  activePage === 'research'
                    ? 'nav-button active'
                    : 'nav-button'
                }
                onClick={() => {
                  setActivePage('research');
                  setDocumentError('');
                  setDocumentMessage('');
                }}
              >
                Research
              </button>

              <button
                type="button"
                className={
                  activePage === 'knowledge'
                    ? 'nav-button active'
                    : 'nav-button'
                }
                onClick={() => {
                  setActivePage('knowledge');
                  setError('');
                  fetchDocuments();
                }}
              >
                Knowledge Base
              </button>

            </nav>

            {activePage === 'research' && (
              <>



                {/* ---------------------------------------------------------------- */}
                {/* New Research Form */}
                {/* ---------------------------------------------------------------- */}

                <form
                  className="research-form"
                  onSubmit={handleSubmit}
                >

                  <textarea
                    value={question}
                    onChange={(event) =>
                      setQuestion(event.target.value)
                    }
                    placeholder="What would you like to research?"
                    rows="5"
                  />

                  <div className="form-footer">

                    <span>
                      The agent will research your question
                      asynchronously.
                    </span>

                    <button
                      type="submit"
                      disabled={loading}
                    >
                      {loading
                        ? 'Starting Research...'
                        : 'Start Research'}
                    </button>

                  </div>

                </form>


                {/* ---------------------------------------------------------------- */}
                {/* Error */}
                {/* ---------------------------------------------------------------- */}

                {error && (
                  <div className="error-message">
                    <strong>Error:</strong>{' '}
                    {error}
                  </div>
                )}


                {/* ---------------------------------------------------------------- */}
                {/* Main Research Workspace */}
                {/* ---------------------------------------------------------------- */}

                <div className="research-workspace">

                  {/* ============================================================ */}
                  {/* History Sidebar */}
                  {/* ============================================================ */}

                  <aside className="history-sidebar">

                    <div className="sidebar-header">

                      <div className="section-heading">

                        <span className="section-icon">
                          ◷
                        </span>

                        <h2>
                          Research History
                        </h2>

                      </div>

                      <span className="history-count">
                        {history.length}
                      </span>

                    </div>


                    <div className="history-scroll">

                      {historyLoading ? (

                        <p className="history-empty">
                          Loading history...
                        </p>

                      ) : history.length === 0 ? (

                        <p className="history-empty">
                          No research requests yet.
                        </p>

                      ) : (

                        <div className="history-list">

                          {history.map((item) => {

                            const isSelected =
                              research?.researchRequest?.id ===
                              item.id;

                            return (
                              <button
                                key={item.id}
                                type="button"
                                className={
                                  isSelected
                                    ? 'history-card selected'
                                    : 'history-card'
                                }
                                onClick={() =>
                                  handleHistoryClick(item.id)
                                }
                              >

                                <div className="history-info">

                                  <strong>
                                    {item.question}
                                  </strong>

                                  <span>
                                    {new Date(
                                      item.created_at
                                    ).toLocaleString()}
                                  </span>

                                </div>

                                <span
                                  className={`status status-${item.status}`}
                                >
                                  {item.status}
                                </span>

                              </button>
                            );
                          })}

                        </div>

                      )}

                    </div>

                  </aside>


                  {/* ============================================================ */}
                  {/* Current Research */}
                  {/* ============================================================ */}

                  <section className="current-research">

                    {!research ? (

                      <div className="research-placeholder">

                        <div className="placeholder-icon">
                          ✦
                        </div>

                        <h2>
                          Your research will appear here
                        </h2>

                        <p>
                          Start a new research request or select
                          one from your history.
                        </p>

                      </div>

                    ) : (

                      <div className="research-container">

                        {/* ------------------------------------------------------ */}
                        {/* Research Meta */}
                        {/* ------------------------------------------------------ */}

                        <div className="research-meta">

                          <div>

                            <span className="meta-label">
                              Research ID
                            </span>

                            <span>
                              {research.researchRequest.id}
                            </span>

                          </div>

                          <div>

                            <span className="meta-label">
                              Status
                            </span>

                            <span
                              className={`status status-${research.researchRequest.status}`}
                            >
                              {research.researchRequest.status}
                            </span>

                          </div>

                        </div>


                        {/* ------------------------------------------------------ */}
                        {/* Question */}
                        {/* ------------------------------------------------------ */}

                        <div className="question-display">

                          <span className="meta-label">
                            Research Question
                          </span>

                          <h2>
                            {research.researchRequest.question}
                          </h2>

                        </div>


                        {/* ------------------------------------------------------ */}
                        {/* Researching State */}
                        {/* ------------------------------------------------------ */}

                        {research.researchRequest.status ===
                          'running' && (
                            <div className="research-loading">

                              <div className="loading-spinner" />

                              <div>

                                <strong>
                                  Research in progress
                                </strong>

                                <p>
                                  The agent is researching your
                                  question. This may take a moment.
                                </p>

                              </div>

                            </div>
                          )}


                        {/* ------------------------------------------------------ */}
                        {/* Report */}
                        {/* ------------------------------------------------------ */}

                        {research.report && (
                          <div className="report-section">

                            <div className="section-heading">

                              <span className="section-icon">
                                ✦
                              </span>

                              <h2>
                                Research Report
                              </h2>

                            </div>

                            <article className="report-content">

                              <ReactMarkdown>
                                {research.report.content}
                              </ReactMarkdown>

                            </article>

                          </div>
                        )}


                        {/* ------------------------------------------------------ */}
                        {/* Sources */}
                        {/* ------------------------------------------------------ */}

                        {research.sources &&
                          research.sources.length > 0 && (
                            <div className="sources-section">

                              <div className="section-heading">

                                <span className="section-icon">
                                  ↗
                                </span>

                                <h2>
                                  Sources
                                </h2>

                              </div>

                              <div className="source-list">

                                {research.sources.map(
                                  (source, index) => (

                                    <a
                                      key={source.url}
                                      href={source.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="source-card"
                                    >

                                      <span className="source-number">
                                        {index + 1}
                                      </span>

                                      <span className="source-info">

                                        <strong>
                                          {source.title ||
                                            source.url}
                                        </strong>

                                        <span>
                                          {source.url}
                                        </span>

                                      </span>

                                      <span className="source-arrow">
                                        ↗
                                      </span>

                                    </a>

                                  )
                                )}

                              </div>

                            </div>
                          )}


                        {/* ------------------------------------------------------ */}
                        {/* Failed State */}
                        {/* ------------------------------------------------------ */}

                        {research.researchRequest.status ===
                          'failed' && (
                            <div className="research-failed">

                              <strong>
                                Research failed
                              </strong>

                              <p>
                                Something went wrong while processing
                                this research request.
                              </p>

                            </div>
                          )}

                      </div>

                    )}

                  </section>

                </div>

              </>
            )}

            {activePage === 'knowledge' && (
              <section className="knowledge-page">

                <div className="knowledge-header">

                  <div>
                    <div className="section-heading">
                      <span className="section-icon">◈</span>
                      <h2>Knowledge Base</h2>
                    </div>

                    <p>
                      Add private documents that the research agent can
                      use through RAG.
                    </p>
                  </div>

                  <span className="history-count">
                    {documents.length}
                  </span>

                </div>

                <form
                  className="document-form"
                  onSubmit={handleDocumentSubmit}
                >

                  <div className="document-form-header">
                    <h2>Add a document</h2>
                    <p>
                      Paste document content below. It will be split into
                      chunks and embedded for semantic retrieval.
                    </p>
                  </div>

                  <input
                    type="text"
                    value={documentTitle}
                    onChange={(event) =>
                      setDocumentTitle(event.target.value)
                    }
                    placeholder="Document title"
                  />

                  <input
                    type="text"
                    value={documentSource}
                    onChange={(event) =>
                      setDocumentSource(event.target.value)
                    }
                    placeholder="Source (optional)"
                  />

                  <textarea
                    value={documentContent}
                    onChange={(event) =>
                      setDocumentContent(event.target.value)
                    }
                    placeholder="Paste document content here..."
                    rows="12"
                  />

                  {documentError && (
                    <div className="error-message">
                      <strong>Error:</strong>{' '}
                      {documentError}
                    </div>
                  )}

                  {documentMessage && (
                    <div className="success-message">
                      {documentMessage}
                    </div>
                  )}

                  <div className="form-footer">
                    <span>
                      The document will be processed for RAG retrieval.
                    </span>

                    <button
                      type="submit"
                      disabled={documentLoading}
                    >
                      {documentLoading
                        ? 'Adding Document...'
                        : 'Add Document'}
                    </button>
                  </div>

                </form>

                <section className="documents-section">

                  <div className="section-heading">
                    <span className="section-icon">▤</span>
                    <h2>Your Documents</h2>
                  </div>

                  {documentsLoading ? (

                    <div className="documents-empty">
                      Loading documents...
                    </div>

                  ) : documents.length === 0 ? (

                    <div className="documents-empty">
                      <strong>No documents yet</strong>
                      <p>
                        Add a document above to build your private
                        knowledge base.
                      </p>
                    </div>

                  ) : (

                    <div className="documents-list">

                      {documents.map((document) => (

                        <article
                          key={document.id}
                          className="document-card"
                          onClick={() => handleDocumentClick(document.id)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              handleDocumentClick(document.id);
                            }
                          }}
                          role="button"
                          tabIndex="0"
                        >

                          <div className="document-card-main">

                            <h3>
                              {document.title}
                            </h3>

                            {document.source && (
                              <p>{document.source}</p>
                            )}

                            <span>
                              Added{' '}
                              {new Date(
                                document.created_at
                              ).toLocaleString()}
                            </span>

                          </div>

                          <span
                            className={`status status-${document.status}`}
                          >
                            {document.status}
                          </span>

                        </article>

                      ))}

                    </div>

                  )}

                </section>

                {documentViewError && (
                  <div className="error-message">
                    <strong>Error:</strong>{' '}
                    {documentViewError}
                  </div>
                )}

                {documentViewLoading && (
                  <div className="document-viewer">
                    <div className="loading-spinner" />
                    <span>Loading document...</span>
                  </div>
                )}

                {selectedDocument && !documentViewLoading && (
                  <section className="document-viewer">
                    <div className="document-viewer-header">
                      <div>
                        <div className="section-heading">
                          <span className="section-icon">▤</span>
                          <h2>{selectedDocument.title}</h2>
                        </div>

                        {selectedDocument.source && (
                          <p>{selectedDocument.source}</p>
                        )}
                      </div>

                      <button
                        type="button"
                        className="document-close-button"
                        onClick={() => setSelectedDocument(null)}
                      >
                        Close
                      </button>
                    </div>

                    <div className="document-viewer-meta">
                      <span
                        className={`status status-${selectedDocument.status}`}
                      >
                        {selectedDocument.status}
                      </span>

                      <span>
                        Added {new Date(
                          selectedDocument.created_at
                        ).toLocaleString()}
                      </span>
                    </div>

                    <article className="document-content">
                      {selectedDocument.content}
                    </article>
                  </section>
                )}

              </section>
            )}

          </>
        )}

      </main>

    </div>
  );
}

export default App;