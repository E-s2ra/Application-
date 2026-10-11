import { lazy, Suspense, useId, useRef, useState, type KeyboardEvent } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowRight01Icon,
  ArrowUpRight01Icon,
  Bookmark01Icon,
  BookmarkOff01Icon,
  PlayIcon,
} from '@hugeicons/core-free-icons'
import { books, coverFor, type Book } from './books'
import './LibraryEdition.css'

const LibraryRoom3D = lazy(() => import('./LibraryRoom3D'))

type Props = {
  saved: string[]
  recent: string[]
  progress: Record<string, number>
  onNavigate: (path: string) => void
  onOpen: (book: Book) => void
  onPlay: (book: Book) => void
  onSave: (book: Book) => void
}
type Tab = 'saved' | 'recent'

const unique = (ids: string[]) => {
  const seen = new Set<string>()
  return ids.flatMap(id => {
    if (seen.has(id)) return []
    seen.add(id)
    const book = books.find(item => item.id === id)
    return book ? [book] : []
  })
}

const percent = (value?: number) =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.round(Math.max(0, Math.min(1, value)) * 100)
    : 0

export default function LibraryEdition({ saved, recent, progress, onNavigate, onOpen, onPlay, onSave }: Props) {
  const [tab, setTab] = useState<Tab>('saved')
  const [selectedId, setSelectedId] = useState<string | null>(() => saved[0] ?? recent[0] ?? null)
  const tabRefs = useRef<{ saved: HTMLButtonElement | null; recent: HTMLButtonElement | null }>({ saved: null, recent: null })
  const ids = useId().replaceAll(':', '')
  const savedBooks = unique(saved)
  const recentBooks = unique(recent)
  const displayed = tab === 'saved' ? savedBooks : recentBooks
  const selected = books.find(book => book.id === selectedId) ?? null
  const recentlyPlayable = recentBooks.find(book => book.sample) ?? null
  const savedSet = new Set(saved)

  const changeTab = (next: Tab, focus = false) => {
    setTab(next)
    const first = (next === 'saved' ? savedBooks : recentBooks)[0]
    if (first) setSelectedId(first.id)
    if (focus) tabRefs.current[next]?.focus()
  }

  const tabKeys = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault()
      changeTab(tab === 'saved' ? 'recent' : 'saved', true)
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      changeTab(event.key === 'Home' ? 'saved' : 'recent', true)
    }
  }

  return (
    <div className="app-page deng-lib">
      <header className="deng-lib__header">
        <div className="deng-lib__header-title">
          <h1>Your <em>library.</em></h1>
        </div>
        <div className="deng-lib__header-right">
          <span>{savedBooks.length} {savedBooks.length === 1 ? 'book' : 'books'} saved</span>
          <button type="button" onClick={() => onNavigate('/explore')}>
            Browse books <HugeiconsIcon icon={ArrowUpRight01Icon} size={18} aria-hidden="true" />
          </button>
        </div>
      </header>

      <section className="deng-lib__room" aria-label="Your private 3D home library">
        <div className="deng-lib__room-top">
          <span>Drag to explore · Select a book</span>
        </div>
        <Suspense fallback={<div className="deng-lib__room-canvas"><div className="deng-lib__room-loading" role="status">Opening the room…</div></div>}>
          <LibraryRoom3D saved={savedBooks} selectedId={selectedId} onSelect={book => setSelectedId(book.id)} />
        </Suspense>

        <div className="deng-lib__selected" aria-live="polite">
          {selected ? (
            <>
              <div className="deng-lib__selected-heading">
                <span className="deng-lib__selected-index">{selected.genre} · {selected.duration}</span>
                {savedSet.has(selected.id) && <span className="deng-lib__selected-mark">ON YOUR SHELF</span>}
              </div>
              <div className="deng-lib__selected-main">
                <img src={coverFor(selected)} alt="" width="49" height="73" />
                <div>
                  <h2>{selected.title}</h2>
                  <p>{selected.author}</p>
                </div>
              </div>
              <div className="deng-lib__selected-actions">
                <button type="button" onClick={() => onOpen(selected)}>
                  View <HugeiconsIcon icon={ArrowUpRight01Icon} size={16} aria-hidden="true" />
                </button>
                {selected.sample && (
                  <button type="button" onClick={() => onPlay(selected)}>
                    <HugeiconsIcon icon={PlayIcon} size={15} aria-hidden="true" /> Preview
                  </button>
                )}
                <button type="button" onClick={() => onSave(selected)}>
                  <HugeiconsIcon icon={savedSet.has(selected.id) ? BookmarkOff01Icon : Bookmark01Icon} size={17} aria-hidden="true" />
                  {savedSet.has(selected.id) ? 'Remove' : 'Save'}
                </button>
              </div>
            </>
          ) : (
            <div className="deng-lib__select-invite">
              <span>THE SHELF</span>
              <p>Select a book in the room or the list below.</p>
            </div>
          )}
        </div>
      </section>

      {recentlyPlayable && (
        <div className="deng-lib__resume">
          <div>
            <span className="deng-lib__eyebrow">CONTINUE LISTENING</span>
            <button type="button" onClick={() => { setSelectedId(recentlyPlayable.id); onOpen(recentlyPlayable) }}>
              {recentlyPlayable.title} <HugeiconsIcon icon={ArrowRight01Icon} size={18} aria-hidden="true" />
            </button>
            <span>{percent(progress[recentlyPlayable.id])}% of preview</span>
          </div>
          <div className="deng-lib__resume-track" role="progressbar" aria-label={`${recentlyPlayable.title} preview progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent(progress[recentlyPlayable.id])}>
            <span style={{ width: `${percent(progress[recentlyPlayable.id])}%` }} />
          </div>
          <button type="button" className="deng-lib__resume-play" onClick={() => onPlay(recentlyPlayable)}>
            <HugeiconsIcon icon={PlayIcon} size={16} aria-hidden="true" />
            {percent(progress[recentlyPlayable.id]) >= 100 ? 'Replay' : 'Resume'}
          </button>
        </div>
      )}

      <section className="deng-lib__collection" aria-label="Books in your library">
        <div className="deng-lib__collection-title">
          <h2>Your books<span>.</span></h2>
        </div>
        <div className="deng-lib__tabs" role="tablist" aria-label="Library view" onKeyDown={tabKeys}>
          <button
            type="button"
            ref={node => { tabRefs.current.saved = node }}
            role="tab"
            id={`${ids}-saved-tab`}
            aria-controls={`${ids}-saved-panel`}
            aria-selected={tab === 'saved'}
            tabIndex={tab === 'saved' ? 0 : -1}
            className={tab === 'saved' ? 'is-active' : ''}
            onClick={() => changeTab('saved')}
          >
            Saved <span>{savedBooks.length}</span>
          </button>
          <button
            type="button"
            ref={node => { tabRefs.current.recent = node }}
            role="tab"
            id={`${ids}-recent-tab`}
            aria-controls={`${ids}-recent-panel`}
            aria-selected={tab === 'recent'}
            tabIndex={tab === 'recent' ? 0 : -1}
            className={tab === 'recent' ? 'is-active' : ''}
            onClick={() => changeTab('recent')}
          >
            Recent <span>{recentBooks.length}</span>
          </button>
        </div>
        {(['saved', 'recent'] as const).map(view => (
          <div
            key={view}
            role="tabpanel"
            id={`${ids}-${view}-panel`}
            aria-labelledby={`${ids}-${view}-tab`}
            tabIndex={0}
            hidden={tab !== view}
            className="deng-lib__panel"
          >
            {(view === 'saved' ? savedBooks : recentBooks).length ? (
              <ol className="deng-lib__book-list">
                {(view === 'saved' ? savedBooks : recentBooks).map((book, index) => (
                  <li key={book.id} className={selectedId === book.id ? 'is-selected' : ''}>
                    <span className="deng-lib__row-index">{String(index + 1).padStart(2, '0')}</span>
                    <button
                      type="button"
                      className="deng-lib__row-book"
                      aria-label={`Select ${book.title} in the room`}
                      aria-pressed={selectedId === book.id}
                      onClick={() => setSelectedId(book.id)}
                    >
                      <img src={coverFor(book)} alt="" loading="lazy" decoding="async" />
                      <span>
                        <strong>{book.title}</strong>
                        <small>{book.author} <span aria-hidden="true">·</span> {book.duration}</small>
                        {view === 'recent' && <small>{percent(progress[book.id])}% of preview</small>}
                      </span>
                    </button>
                    <div className="deng-lib__row-actions">
                      <button type="button" onClick={() => onOpen(book)} aria-label={`View ${book.title}`} title="Book details">
                        <HugeiconsIcon icon={ArrowUpRight01Icon} size={20} strokeWidth={1.75} aria-hidden="true" />
                      </button>
                      {book.sample && (
                        <button type="button" onClick={() => onPlay(book)} aria-label={`Preview ${book.title}`} title="Play preview">
                          <HugeiconsIcon icon={PlayIcon} size={19} strokeWidth={1.8} aria-hidden="true" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onSave(book)}
                        aria-label={savedSet.has(book.id) ? `Remove ${book.title} from saved books` : `Save ${book.title}`}
                        title={savedSet.has(book.id) ? 'Remove from saved books' : 'Save book'}
                      >
                        <HugeiconsIcon icon={savedSet.has(book.id) ? BookmarkOff01Icon : Bookmark01Icon} size={20} strokeWidth={1.75} aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="deng-lib__empty">
                <h3>{view === 'saved' ? 'Your shelf is empty.' : 'No previews played yet.'}</h3>
                <p>{view === 'saved' ? 'Save a book from the room or browse the catalogue.' : 'Listen to a preview and return here to pick up where you left off.'}</p>
                <button type="button" onClick={() => onNavigate(view === 'saved' ? '/explore' : '/discover')}>
                  {view === 'saved' ? 'Browse books' : 'Discover books'}
                  <HugeiconsIcon icon={ArrowRight01Icon} size={17} aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        ))}
        <div className="deng-lib__collection-footer">
          <span>SAVED IN THIS BROWSER</span>
          <button type="button" onClick={() => onNavigate('/explore')}>All books <HugeiconsIcon icon={ArrowUpRight01Icon} size={17} aria-hidden="true" /></button>
        </div>
      </section>
    </div>
  )
}
