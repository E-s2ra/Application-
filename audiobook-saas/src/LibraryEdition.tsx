import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowRight01Icon,
  ArrowUpRight01Icon,
  Bookmark01Icon,
  BookmarkOff01Icon,
  Cancel01Icon,
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
type BookOrigin = { x: number; y: number; width: number; height: number }
type Selection = { book: Book; origin: BookOrigin; serial: number }

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

function isValidOrigin(origin: BookOrigin | undefined): origin is BookOrigin {
  return Boolean(origin && [origin.x, origin.y, origin.width, origin.height].every(Number.isFinite) && origin.width > 1 && origin.height > 1)
}

function getCoverOrigin(button: HTMLButtonElement): BookOrigin {
  const rect = (button.querySelector('img') ?? button).getBoundingClientRect()
  return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
}

const FLIP_DURATION = 780
const FLIP_EASING = 'cubic-bezier(.28, .7, .22, 1)'
const focusableSelector = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function BookLightbox({
  selection,
  saved,
  onSave,
  onPlay,
  onOpen,
  onReturnToShelf,
  onCloseRequested,
}: {
  selection: Selection
  saved: boolean
  onSave: (book: Book) => void
  onPlay: (book: Book) => void
  onOpen: (book: Book) => void
  onReturnToShelf: () => void
  onCloseRequested: (forcePark: () => void) => void
}) {
  const { book, origin } = selection
  const [phase, setPhase] = useState<'opening' | 'open' | 'closing' | 'returning'>('opening')
  const overlayRef = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLElement>(null)
  const coverRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const phaseRef = useRef<'opening' | 'open' | 'closing' | 'returning'>('opening')
  const reducedMotion = useRef(false)
  const flightRef = useRef<Animation | null>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const backdropAnimationRef = useRef<Animation | null>(null)
  const exitTimer = useRef<number | null>(null)
  const revealFrame = useRef<number | null>(null)
  const sourceTransformRef = useRef('')
  const returnedRef = useRef(false)
  const onReturnRef = useRef(onReturnToShelf)
  onReturnRef.current = onReturnToShelf
  const onCloseRequestedRef = useRef(onCloseRequested)
  onCloseRequestedRef.current = onCloseRequested

  const cancelFlight = useCallback(() => {
    flightRef.current?.cancel()
    flightRef.current = null
    backdropAnimationRef.current?.cancel()
    backdropAnimationRef.current = null
    if (revealFrame.current !== null) cancelAnimationFrame(revealFrame.current)
    revealFrame.current = null
  }, [])

  const parkAtShelf = useCallback(() => {
    if (returnedRef.current) return
    returnedRef.current = true
    if (exitTimer.current !== null) window.clearTimeout(exitTimer.current)
    exitTimer.current = null
    // WAAPI fill:'both' reverts to the element's full-sized CSS box on cancel().
    // Persist the exact FIRST frame *before* cancellation so React's delayed
    // scene update can never reveal a one-frame, full-sized hardcover.
    if (coverRef.current) coverRef.current.style.transform = sourceTransformRef.current
    if (backdropRef.current) backdropRef.current.style.opacity = '0'
    cancelFlight()
    phaseRef.current = 'returning'
    setPhase('returning')
    // Keep the small, opaque cover parked on its shelf until WebGL confirms it
    // has drawn the source book. The parent alone owns the final unmount.
    onReturnRef.current()
  }, [cancelFlight])

  const close = useCallback(() => {
    if (phaseRef.current === 'closing' || phaseRef.current === 'returning') return
    phaseRef.current = 'closing'
    setPhase('closing')
    // Arm the parent's independent hard-stop at the FIRST close request,
    // not after WAAPI / WebGL finishes. This remains active even when its
    // normal finish event or animation frames are starved by a busy GPU.
    onCloseRequestedRef.current(parkAtShelf)
    if (reducedMotion.current) {
      parkAtShelf()
      return
    }
    const flight = flightRef.current
    if (flight) {
      // Reversing one compositor timeline preserves position and velocity,
      // including if the book is dismissed in the middle of opening.
      flight.onfinish = parkAtShelf
      flight.reverse()
      backdropAnimationRef.current?.reverse()
    } else {
      parkAtShelf()
      return
    }
    exitTimer.current = window.setTimeout(parkAtShelf, FLIP_DURATION + 100)
  }, [parkAtShelf])

  useLayoutEffect(() => {
    const cover = coverRef.current
    if (!cover) return
    reducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const rect = cover.getBoundingClientRect()
    const dx = origin.x - rect.x
    const dy = origin.y - rect.y
    const scaleX = Math.max(.015, origin.width / rect.width)
    const scaleY = Math.max(.015, origin.height / rect.height)
    const sourceTransform = `translate3d(${dx}px, ${dy}px, 0) scale(${scaleX}, ${scaleY})`
    sourceTransformRef.current = sourceTransform
    if (reducedMotion.current) {
      phaseRef.current = 'open'
      setPhase('open')
      return
    }
    // CSS/rAF styles were coalescing before the first paint, skipping the
    // opening morph entirely. A Web Animations timeline preserves frame zero.
    flightRef.current = cover.animate([
      { transform: sourceTransform },
      { transform: 'translate3d(0, 0, 0) scale(1, 1)' },
    ], { duration: FLIP_DURATION, easing: FLIP_EASING, fill: 'both' })
    if (backdropRef.current) {
      backdropAnimationRef.current = backdropRef.current.animate([
        { opacity: 0 }, { opacity: 1 },
      ], { duration: FLIP_DURATION * .65, easing: 'ease-out', fill: 'both' })
    }
    revealFrame.current = requestAnimationFrame(() => {
      if (phaseRef.current === 'opening') {
        phaseRef.current = 'open'
        setPhase('open')
      }
    })
    return cancelFlight
  }, [selection.serial, origin.x, origin.y, origin.width, origin.height, cancelFlight])

  useEffect(() => {
    // The fixed backdrop captures scroll gestures. Changing body overflow
    // caused scrollbar reflow and resized the 3D scene after dismissal.
    // Consume wheel and touch inside the overlay. Its scrollable contents can
    // still move on small screens without scrolling the page underneath.
    const overlay = overlayRef.current
    let lastTouchY = 0
    const wheel = (event: WheelEvent) => {
      event.preventDefault()
      if (overlay) overlay.scrollTop += event.deltaY
    }
    const touchStart = (event: TouchEvent) => {
      if (event.touches.length === 1) lastTouchY = event.touches[0].clientY
    }
    const touchMove = (event: TouchEvent) => {
      if (event.touches.length !== 1) return
      event.preventDefault()
      const currentY = event.touches[0].clientY
      if (overlay) overlay.scrollTop += lastTouchY - currentY
      lastTouchY = currentY
    }
    overlay?.addEventListener('wheel', wheel, { passive: false })
    overlay?.addEventListener('touchstart', touchStart, { passive: true })
    overlay?.addEventListener('touchmove', touchMove, { passive: false })
    closeRef.current?.focus({ preventScroll: true })
    const handleKeys = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        close()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusables = [...dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector)]
        .filter(node => node.getClientRects().length > 0)
      if (!focusables.length) {
        event.preventDefault()
        dialogRef.current.focus()
        return
      }
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (event.shiftKey && (document.activeElement === first || !dialogRef.current.contains(document.activeElement))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current.contains(document.activeElement))) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKeys)
    return () => {
      document.removeEventListener('keydown', handleKeys)
      overlay?.removeEventListener('wheel', wheel)
      overlay?.removeEventListener('touchstart', touchStart)
      overlay?.removeEventListener('touchmove', touchMove)
      if (exitTimer.current !== null) window.clearTimeout(exitTimer.current)
      cancelFlight()
    }
  }, [close, cancelFlight])

  return createPortal(
    <div ref={overlayRef} className={`deng-booklight deng-booklight--${phase}`}>
      <div className="deng-booklight__backdrop deng-lib__book-dialog-backdrop" ref={backdropRef} onClick={close} aria-hidden="true" />
      <section
        className="deng-booklight__dialog"
        role={phase === 'returning' ? undefined : 'dialog'}
        aria-modal={phase === 'returning' ? undefined : true}
        aria-hidden={phase === 'returning' ? true : undefined}
        aria-labelledby="deng-booklight-title"
        aria-describedby="deng-booklight-author"
        ref={dialogRef}
        tabIndex={-1}
      >
        <button type="button" ref={closeRef} className="deng-booklight__close" onClick={close} aria-label="Close book">
          <HugeiconsIcon icon={Cancel01Icon} size={24} strokeWidth={1.6} aria-hidden="true" />
          <span>Close</span>
        </button>
        <div className="deng-booklight__book-stage">
          <div className="deng-booklight__cover-flight deng-lib__book-dialog-cover" ref={coverRef}>
            <div className="deng-booklight__hardcover">
              <img src={coverFor(book)} alt={`Cover art for ${book.title}`} />
              <span className="deng-booklight__spine" aria-hidden="true" />
              <span className="deng-booklight__pages" aria-hidden="true" />
            </div>
          </div>
          <span className="deng-booklight__stage-shadow" aria-hidden="true" />
        </div>
        <div className="deng-booklight__details">
          <h2 id="deng-booklight-title">{book.title}</h2>
          <p className="deng-booklight__author" id="deng-booklight-author">{book.author}</p>
          <div className="deng-booklight__actions">
            {book.sample && (
              <button type="button" className="deng-booklight__play" onClick={() => { onPlay(book); close() }}>
                <HugeiconsIcon icon={PlayIcon} size={23} strokeWidth={1.7} aria-hidden="true" />
                Play preview
              </button>
            )}
            <button type="button" className="deng-booklight__secondary" onClick={() => onSave(book)}>
              <HugeiconsIcon icon={saved ? BookmarkOff01Icon : Bookmark01Icon} size={19} strokeWidth={1.6} aria-hidden="true" />
              {saved ? 'Remove from shelf' : 'Save to shelf'}
            </button>
            <button type="button" className="deng-booklight__secondary" onClick={() => onOpen(book)}>
              View book <HugeiconsIcon icon={ArrowUpRight01Icon} size={19} strokeWidth={1.6} aria-hidden="true" />
            </button>
          </div>
          {!book.sample && <p className="deng-booklight__availability">Preview coming soon.</p>}
        </div>
      </section>
    </div>,
    document.body,
  )
}

export default function LibraryEdition({ saved, recent, progress, onNavigate, onOpen, onPlay, onSave }: Props) {
  const [tab, setTab] = useState<Tab>('saved')
  const [modal, setModal] = useState<Selection | null>(null)
  const [returningToShelf, setReturningToShelf] = useState(false)
  const returningRef = useRef(false)
  const exitQueuedRef = useRef(false)
  const exitFramesRef = useRef<number[]>([])
  const exitTimeoutRef = useRef<number | null>(null)
  const closeTimeoutRef = useRef<number | null>(null)
  const roomRef = useRef<HTMLElement>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  const selectionSerial = useRef(0)
  const tabRefs = useRef<{ saved: HTMLButtonElement | null; recent: HTMLButtonElement | null }>({ saved: null, recent: null })
  const ids = useId().replaceAll(':', '')
  const savedBooks = unique(saved)
  const recentBooks = unique(recent)
  const recentlyPlayable = recentBooks.find(book => book.sample) ?? null
  const savedSet = new Set(saved)

  const cancelExitWait = () => {
    for (const frame of exitFramesRef.current) cancelAnimationFrame(frame)
    exitFramesRef.current = []
    if (exitTimeoutRef.current !== null) window.clearTimeout(exitTimeoutRef.current)
    exitTimeoutRef.current = null
    if (closeTimeoutRef.current !== null) window.clearTimeout(closeTimeoutRef.current)
    closeTimeoutRef.current = null
  }

  useEffect(() => () => {
    cancelExitWait()
  }, [])

  const showBook = (book: Book, origin?: BookOrigin, trigger?: HTMLElement | null) => {
    if (modal || returningRef.current) return
    cancelExitWait()
    exitQueuedRef.current = false
    returningRef.current = false
    setReturningToShelf(false)
    triggerRef.current = trigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null)
    const room = roomRef.current?.getBoundingClientRect()
    const fallback: BookOrigin = room
      ? { x: room.x + room.width * .49, y: room.y + room.height * .39, width: Math.min(90, room.width * .12), height: Math.min(138, room.height * .22) }
      : { x: innerWidth / 2 - 35, y: innerHeight / 2 - 55, width: 70, height: 110 }
    setModal({ book, origin: isValidOrigin(origin) ? origin : fallback, serial: ++selectionSerial.current })
  }

  const exitBook = () => {
    if (!returningRef.current) return
    returningRef.current = false
    exitQueuedRef.current = false
    cancelExitWait()
    setModal(null)
    setReturningToShelf(false)
    const previous = triggerRef.current
    requestAnimationFrame(() => {
      const target = previous?.isConnected ? previous : tabRefs.current[tab]
      target?.focus({ preventScroll: true })
    })
  }

  const scheduleReturn = () => {
    if (!returningRef.current || exitQueuedRef.current) return
    exitQueuedRef.current = true
    // R3F acknowledges a drawn frame. Give the browser one more full paint
    // opportunity before the 2D cover ceases to cover the 3D counterpart.
    const first = requestAnimationFrame(() => {
      const second = requestAnimationFrame(exitBook)
      exitFramesRef.current.push(second)
    })
    exitFramesRef.current.push(first)
  }

  const returnToShelf = () => {
    if (returningRef.current) return
    if (closeTimeoutRef.current !== null) window.clearTimeout(closeTimeoutRef.current)
    closeTimeoutRef.current = null
    returningRef.current = true
    setReturningToShelf(true)
    // Independent hard stop: a scene ACK can queue the two paint rAFs while
    // heavy WebGL work starves them indefinitely. The old fallback also called
    // scheduleReturn(), which did nothing once exitQueuedRef was true.
    // Crucially, call exitBook DIRECTLY regardless of ACK / rAF progress.
    // The reverse FLIP has already parked the tiny cover before this timer
    // begins, so cancelling the portal cannot flash a full-size hardcover.
    exitTimeoutRef.current = window.setTimeout(exitBook, 1300)
  }

  const onCloseRequested = (forcePark: () => void) => {
    if (closeTimeoutRef.current !== null || returningRef.current) return
    // Independent of Web Animations finish events and R3F frame scheduling.
    // It always parks the *small* cover before releasing the 3D volume.
    closeTimeoutRef.current = window.setTimeout(() => {
      closeTimeoutRef.current = null
      forcePark()
    }, 1200)
  }

  const onBookRestored = (bookId: string) => {
    if (returningRef.current && modal?.book.id === bookId) scheduleReturn()
  }

  const changeTab = (next: Tab, focus = false) => {
    setTab(next)
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
        <div className="deng-lib__header-title"><h1>Your <em>library.</em></h1></div>
        <div className="deng-lib__header-right">
          <span>{savedBooks.length} {savedBooks.length === 1 ? 'book' : 'books'} saved</span>
          <button type="button" onClick={() => onNavigate('/explore')}>Browse books <HugeiconsIcon icon={ArrowUpRight01Icon} size={18} aria-hidden="true" /></button>
        </div>
      </header>

      <section className="deng-lib__room" aria-label="Your private 3D home library" ref={roomRef}>
        <Suspense fallback={<div className="deng-lib__room-canvas"><div className="deng-lib__room-loading" role="status">Opening the room…</div></div>}>
          <LibraryRoom3D
            saved={savedBooks}
            selectedId={modal && !returningToShelf ? modal.book.id : null}
            onSelect={(book, origin) => showBook(book, origin)}
            onBookRestored={onBookRestored}
          />
        </Suspense>
      </section>

      {recentlyPlayable && (
        <div className="deng-lib__resume">
          <div>
            <button type="button" onClick={event => showBook(recentlyPlayable, getCoverOrigin(event.currentTarget), event.currentTarget)}>
              Continue {recentlyPlayable.title} <HugeiconsIcon icon={ArrowRight01Icon} size={18} aria-hidden="true" />
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
        <div className="deng-lib__collection-title"><h2>Your books<span>.</span></h2></div>
        <div className="deng-lib__tabs" role="tablist" aria-label="Library view" onKeyDown={tabKeys}>
          <button type="button" ref={node => { tabRefs.current.saved = node }} role="tab" id={`${ids}-saved-tab`} aria-controls={`${ids}-saved-panel`} aria-selected={tab === 'saved'} tabIndex={tab === 'saved' ? 0 : -1} className={tab === 'saved' ? 'is-active' : ''} onClick={() => changeTab('saved')}>Saved <span>{savedBooks.length}</span></button>
          <button type="button" ref={node => { tabRefs.current.recent = node }} role="tab" id={`${ids}-recent-tab`} aria-controls={`${ids}-recent-panel`} aria-selected={tab === 'recent'} tabIndex={tab === 'recent' ? 0 : -1} className={tab === 'recent' ? 'is-active' : ''} onClick={() => changeTab('recent')}>Recent <span>{recentBooks.length}</span></button>
        </div>
        {(['saved', 'recent'] as const).map(view => (
          <div key={view} role="tabpanel" id={`${ids}-${view}-panel`} aria-labelledby={`${ids}-${view}-tab`} tabIndex={0} hidden={tab !== view} className="deng-lib__panel">
            {(view === 'saved' ? savedBooks : recentBooks).length ? (
              <ol className="deng-lib__book-list">
                {(view === 'saved' ? savedBooks : recentBooks).map((book, index) => (
                  <li key={book.id}>
                    <span className="deng-lib__row-index">{String(index + 1).padStart(2, '0')}</span>
                    <button type="button" className="deng-lib__row-book" aria-label={`Open ${book.title}`} onClick={event => showBook(book, getCoverOrigin(event.currentTarget), event.currentTarget)}>
                      <img src={coverFor(book)} alt="" loading="lazy" decoding="async" />
                      <span><strong>{book.title}</strong><small>{book.author} <span aria-hidden="true">·</span> {book.duration}</small>{view === 'recent' && <small>{percent(progress[book.id])}% of preview</small>}</span>
                    </button>
                    <div className="deng-lib__row-actions">
                      <button type="button" onClick={event => showBook(book, getCoverOrigin(event.currentTarget.closest('li')?.querySelector('.deng-lib__row-book') as HTMLButtonElement ?? event.currentTarget), event.currentTarget)} aria-label={`View ${book.title}`} title="Book details">
                        <HugeiconsIcon icon={ArrowUpRight01Icon} size={20} strokeWidth={1.75} aria-hidden="true" />
                      </button>
                      {book.sample && <button type="button" onClick={() => onPlay(book)} aria-label={`Preview ${book.title}`} title="Play preview"><HugeiconsIcon icon={PlayIcon} size={19} strokeWidth={1.8} aria-hidden="true" /></button>}
                      <button type="button" onClick={() => onSave(book)} aria-label={savedSet.has(book.id) ? `Remove ${book.title} from saved books` : `Save ${book.title}`} title={savedSet.has(book.id) ? 'Remove from saved books' : 'Save book'}>
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
                <button type="button" onClick={() => onNavigate(view === 'saved' ? '/explore' : '/discover')}>{view === 'saved' ? 'Browse books' : 'Discover books'} <HugeiconsIcon icon={ArrowRight01Icon} size={17} aria-hidden="true" /></button>
              </div>
            )}
          </div>
        ))}
        <div className="deng-lib__collection-footer">
          <span>SAVED IN THIS BROWSER</span>
          <button type="button" onClick={() => onNavigate('/explore')}>All books <HugeiconsIcon icon={ArrowUpRight01Icon} size={17} aria-hidden="true" /></button>
        </div>
      </section>

      {modal && (
        <BookLightbox
          key={modal.serial}
          selection={modal}
          saved={savedSet.has(modal.book.id)}
          onSave={onSave}
          onPlay={onPlay}
          onOpen={onOpen}
          onReturnToShelf={returnToShelf}
          onCloseRequested={onCloseRequested}
        />
      )}
    </div>
  )
}
