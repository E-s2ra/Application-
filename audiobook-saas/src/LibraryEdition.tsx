import { useId, useRef, useState, type KeyboardEvent } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowRight01Icon,
  ArrowUpRight01Icon,
  Bookmark01Icon,
  BookmarkOff01Icon,
  HeadphonesIcon,
  PlayIcon,
} from '@hugeicons/core-free-icons'
import { books, coverFor, type Book } from './books'
import './LibraryEdition.css'

type LibraryEditionProps = {
  saved: string[]
  recent: string[]
  progress: Record<string, number>
  onNavigate: (path: string) => void
  onOpen: (book: Book) => void
  onPlay: (book: Book) => void
  onSave: (book: Book) => void
}

type ShelfTab = 'saved' | 'recent'

const titleFor = (book: Book) => `Cover of ${book.title}`

function percentage(value: number | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0
  return Math.round(Math.max(0, Math.min(value, 1)) * 100)
}

function uniqueBooks(ids: string[]) {
  const seen = new Set<string>()
  return ids.flatMap(id => {
    if (seen.has(id)) return []
    seen.add(id)
    const book = books.find(item => item.id === id)
    return book ? [book] : []
  })
}

function SmallArrow({ diagonal = false }: { diagonal?: boolean }) {
  return (
    <HugeiconsIcon
      icon={diagonal ? ArrowUpRight01Icon : ArrowRight01Icon}
      size={19}
      strokeWidth={1.8}
      aria-hidden="true"
    />
  )
}

function CollectionLedger({
  entries,
  isSaved,
  progress,
  onOpen,
  onPlay,
  onSave,
  onNavigate,
  kind,
}: {
  entries: Book[]
  isSaved: (book: Book) => boolean
  progress: Record<string, number>
  onOpen: (book: Book) => void
  onPlay: (book: Book) => void
  onSave: (book: Book) => void
  onNavigate: (path: string) => void
  kind: ShelfTab
}) {
  if (!entries.length) {
    return (
      <div className="deng-lib__empty">
        <span className="deng-lib__empty-mark" aria-hidden="true">∅</span>
        <div className="deng-lib__empty-content">
          <span className="deng-lib__micro">{kind === 'saved' ? 'SAVED BOOKS' : 'RECENTLY PLAYED'}</span>
          <h3>
            {kind === 'saved'
              ? <>No titles <em>saved yet.</em></>
              : <>No previews <em>played yet.</em></>}
          </h3>
          <p>
            {kind === 'saved'
              ? 'Browse the catalogue and save a book to add it to this shelf.'
              : 'Play an available audio preview to see it here and return to it later.'}
          </p>
          <button type="button" className="deng-lib__text-link" onClick={() => onNavigate(kind === 'saved' ? '/explore' : '/discover')}>
            {kind === 'saved' ? 'Browse all books' : 'Explore audiobooks'}
            <SmallArrow diagonal />
          </button>
        </div>
      </div>
    )
  }

  return (
    <ol className="deng-lib__ledger">
      {entries.map((book, index) => {
        const listening = percentage(progress[book.id])
        const savedHere = isSaved(book)
        return (
          <li className="deng-lib__ledger-item" key={book.id}>
            <span className="deng-lib__ledger-number" aria-hidden="true">
              {String(index + 1).padStart(2, '0')}
            </span>

            <button
              type="button"
              className="deng-lib__ledger-cover"
              aria-label={`Open ${book.title}`}
              onClick={() => onOpen(book)}
            >
              <img src={coverFor(book)} alt="" loading="lazy" decoding="async" />
            </button>

            <div className="deng-lib__ledger-copy">
              <span className="deng-lib__ledger-kicker">{book.genre} <span aria-hidden="true">/</span> {book.duration}</span>
              <button className="deng-lib__ledger-title" type="button" onClick={() => onOpen(book)}>
                {book.title}
              </button>
              <span className="deng-lib__ledger-author">{book.author}</span>
              {kind === 'recent' && (
                <div className="deng-lib__ledger-position">
                  <span className="deng-lib__ledger-track" aria-hidden="true">
                    <span style={{ width: `${listening}%` }} />
                  </span>
                  <span>{listening > 0 ? `${listening}% of preview` : 'Preview opened'}</span>
                </div>
              )}
            </div>

            <div className="deng-lib__ledger-actions">
              <button
                type="button"
                className="deng-lib__ledger-open"
                onClick={() => onOpen(book)}
                aria-label={`Read about ${book.title}`}
              >
                <span>VIEW</span>
                <SmallArrow diagonal />
              </button>
              {book.sample && (
                <button
                  type="button"
                  className="deng-lib__ledger-play"
                  onClick={() => onPlay(book)}
                  aria-label={`Play ${book.title} preview`}
                  title="Play preview"
                >
                  <HugeiconsIcon icon={PlayIcon} size={18} strokeWidth={2} aria-hidden="true" />
                  <span>LISTEN</span>
                </button>
              )}
              <button
                type="button"
                className="deng-lib__ledger-save"
                onClick={() => onSave(book)}
                aria-label={savedHere ? `Remove ${book.title} from library` : `Save ${book.title} to library`}
                title={savedHere ? 'Remove from your shelf' : 'Keep on your shelf'}
              >
                <HugeiconsIcon icon={savedHere ? BookmarkOff01Icon : Bookmark01Icon} size={19} strokeWidth={1.7} aria-hidden="true" />
              </button>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

/**
 * A personal, book-led collection. Parent owns persisted data and the audio
 * player; this component only manages which set of books is on display.
 */
export default function LibraryEdition({
  saved,
  recent,
  progress,
  onNavigate,
  onOpen,
  onPlay,
  onSave,
}: LibraryEditionProps) {
  const [tab, setTab] = useState<ShelfTab>('saved')
  const tabsId = useId().replaceAll(':', '')
  const savedTabRef = useRef<HTMLButtonElement>(null)
  const recentTabRef = useRef<HTMLButtonElement>(null)
  const savedBooks = uniqueBooks(saved)
  const recentBooks = uniqueBooks(recent)
  const shownBooks = tab === 'saved' ? savedBooks : recentBooks
  const featured = shownBooks[0] ?? null
  const secondary = shownBooks.slice(1, 3)
  const listening = recentBooks.find(book => Boolean(book.sample))
  const savedIds = new Set(saved)

  const switchTab = (next: ShelfTab, moveFocus = false) => {
    setTab(next)
    if (moveFocus) {
      (next === 'saved' ? savedTabRef : recentTabRef).current?.focus()
    }
  }

  const onTabKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault()
      switchTab(tab === 'saved' ? 'recent' : 'saved', true)
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      switchTab(event.key === 'Home' ? 'saved' : 'recent', true)
    }
  }

  return (
    <div className="app-page deng-lib">
      <div className="deng-lib__masthead">
        <span>DENG <span aria-hidden="true">/</span> YOUR LIBRARY</span>
        <span>PERSONAL COLLECTION <span aria-hidden="true">↗</span></span>
      </div>

      <header className="deng-lib__opening">
        <div className="deng-lib__opening-copy">
          <h1>
            Kept<br />
            <em>close</em><span>.</span>
          </h1>
          <p>Books you’ve bookmarked. Previews you’ve played. Your listening catalogue, kept in order.</p>
          <div className="deng-lib__opening-colophon">
            <span>{savedBooks.length === 1 ? '01 BOOK KEPT' : `${String(savedBooks.length).padStart(2, '0')} BOOKS KEPT`}</span>
            <span aria-hidden="true">◇</span>
            <span>STORED IN THIS BROWSER</span>
          </div>
        </div>

        <div className="deng-lib__installation">
          <span className="deng-lib__installation-index" aria-hidden="true">I.</span>
          <div className="deng-lib__installation-caption">
            <span>ON THE READING STAND</span>
            <span>{featured
              ? (tab === 'saved' ? '01 / SAVED TITLE' : '01 / RECENT PREVIEW')
              : 'EMPTY SHELF'}</span>
          </div>

          {featured ? (
            <div className="deng-lib__installation-books">
              {secondary.map((book, i) => (
                <div className={`deng-lib__side-book deng-lib__side-book--${i + 1}`} key={book.id} aria-hidden="true">
                  <img src={coverFor(book)} alt="" loading="lazy" decoding="async" />
                </div>
              ))}
              <button type="button" className="deng-lib__primary-book" aria-label={`Open ${featured.title}`} onClick={() => onOpen(featured)}>
                <span className="deng-lib__primary-book-spine" aria-hidden="true" />
                <img src={coverFor(featured)} alt={titleFor(featured)} loading="eager" decoding="async" />
              </button>
            </div>
          ) : (
            <div className="deng-lib__empty-installation" aria-hidden="true">
              <span className="deng-lib__empty-outline" />
              <span className="deng-lib__empty-imprint">A SPACE<br />FOR A STORY</span>
            </div>
          )}
          <div className="deng-lib__installation-plinth" aria-hidden="true">
            <span>DENG / LISTENING LIBRARY</span>
            <span>{featured ? featured.author : 'NO VOLUME SELECTED'}</span>
          </div>
        </div>
      </header>

      {listening && tab === 'saved' && (
        <section className="deng-lib__listening" aria-labelledby={`${tabsId}-listening`}>
          <div className="deng-lib__listening-rubric">
            <span>LAST PLAYED PREVIEW</span>
            <span>PROGRESS STORED LOCALLY</span>
          </div>
          <div className="deng-lib__listening-body">
            <button type="button" className="deng-lib__listening-cover" onClick={() => onOpen(listening)} aria-label={`Open ${listening.title}`}>
              <img src={coverFor(listening)} alt="" loading="lazy" decoding="async" />
            </button>
            <div className="deng-lib__listening-story">
              <div className="deng-lib__micro"><HugeiconsIcon icon={HeadphonesIcon} size={15} strokeWidth={1.8} aria-hidden="true" /> CONTINUE LISTENING</div>
              <h2 id={`${tabsId}-listening`}>{listening.title}</h2>
              <p>{percentage(progress[listening.id]) > 0 ? `${percentage(progress[listening.id])}% through the available preview` : 'Your listening session is ready'}</p>
              <div className="deng-lib__listening-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage(progress[listening.id])} aria-label={`${listening.title} preview progress`}>
                <span style={{ width: `${percentage(progress[listening.id])}%` }} />
              </div>
            </div>
            <button type="button" className="deng-lib__resume" onClick={() => onPlay(listening)}>
              <HugeiconsIcon icon={PlayIcon} size={20} strokeWidth={2} aria-hidden="true" />
              <span>{percentage(progress[listening.id]) >= 100 ? 'REPLAY PREVIEW' : 'RESUME PREVIEW'}</span>
              <SmallArrow diagonal />
            </button>
          </div>
        </section>
      )}

      <section className="deng-lib__catalogue" aria-label="Your audiobook catalogue">
        <div className="deng-lib__catalogue-heading">
          <div>
            <span className="deng-lib__micro">SAVED TITLES & PLAYBACK HISTORY</span>
            <h2>The <em>index.</em></h2>
          </div>
          <span className="deng-lib__catalogue-endnote">MOST RECENT FIRST</span>
        </div>

        <div className="deng-lib__tabs" role="tablist" aria-label="Choose collection view" onKeyDown={onTabKeyDown}>
          <button
            type="button"
            ref={savedTabRef}
            role="tab"
            id={`${tabsId}-saved-tab`}
            aria-controls={`${tabsId}-saved-panel`}
            aria-selected={tab === 'saved'}
            tabIndex={tab === 'saved' ? 0 : -1}
            className={tab === 'saved' ? 'deng-lib__tab deng-lib__tab--active' : 'deng-lib__tab'}
            onClick={() => switchTab('saved')}
          >
            <span className="deng-lib__tab-index">01 /</span>
            SAVED BOOKS
            <span className="deng-lib__tab-count">{String(savedBooks.length).padStart(2, '0')}</span>
          </button>
          <button
            type="button"
            ref={recentTabRef}
            role="tab"
            id={`${tabsId}-recent-tab`}
            aria-controls={`${tabsId}-recent-panel`}
            aria-selected={tab === 'recent'}
            tabIndex={tab === 'recent' ? 0 : -1}
            className={tab === 'recent' ? 'deng-lib__tab deng-lib__tab--active' : 'deng-lib__tab'}
            onClick={() => switchTab('recent')}
          >
            <span className="deng-lib__tab-index">02 /</span>
            RECENTLY PLAYED
            <span className="deng-lib__tab-count">{String(recentBooks.length).padStart(2, '0')}</span>
          </button>
        </div>

        <div className="deng-lib__tab-panel" role="tabpanel" id={`${tabsId}-saved-panel`} aria-labelledby={`${tabsId}-saved-tab`} hidden={tab !== 'saved'} tabIndex={0}>
          <CollectionLedger entries={savedBooks} kind="saved" isSaved={book => savedIds.has(book.id)} progress={progress} onOpen={onOpen} onPlay={onPlay} onSave={onSave} onNavigate={onNavigate} />
        </div>
        <div className="deng-lib__tab-panel" role="tabpanel" id={`${tabsId}-recent-panel`} aria-labelledby={`${tabsId}-recent-tab`} hidden={tab !== 'recent'} tabIndex={0}>
          <CollectionLedger entries={recentBooks} kind="recent" isSaved={book => savedIds.has(book.id)} progress={progress} onOpen={onOpen} onPlay={onPlay} onSave={onSave} onNavigate={onNavigate} />
        </div>
      </section>

      <footer className="deng-lib__closing">
        <div>
          <span>YOUR LIBRARY</span>
          <p>Saved in this browser.</p>
        </div>
        <button type="button" onClick={() => onNavigate('/explore')}>
          BROWSE ALL BOOKS <SmallArrow diagonal />
        </button>
      </footer>
    </div>
  )
}
