import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type MouseEvent, type ReactNode } from 'react'
import {
  ArrowDownLeft, ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, Check, ChevronDown, ChevronLeft, ChevronRight,
  Clock3, Compass, Heart, Headphones, Library, ListMusic, LockKeyhole, Menu, Minus, MoreHorizontal,
  Pause, Play, Plus, Search, Settings2, Share2, ShieldCheck, SkipBack, SkipForward, SlidersHorizontal,
  Sparkles, Volume2, VolumeX, X,
} from 'lucide-react'
import Marketing from './Marketing'
import { books, coverFor, genres, type Book, type Genre } from './books'

type Route = 'landing' | 'discover' | 'explore' | 'library' | 'pricing' | 'settings' | 'book'
type ReadingState = { saved: string[]; recent: string[]; progress: Record<string, number> }
const initialReading: ReadingState = { saved: ['pride-prejudice', 'secret-garden', 'great-gatsby'], recent: [], progress: {} }

function stored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) as T : fallback
  } catch {
    return fallback
  }
}

function usePersisted<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => stored(key, fallback))
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* Storage may be disabled. */ }
  }, [key, value])
  return [value, setValue] as const
}

function getPath() {
  return decodeURI(window.location.hash.replace(/^#/, '') || '/')
}

function routeFromPath(path: string): Route {
  if (path.startsWith('/book/')) return 'book'
  if (path.startsWith('/discover')) return 'discover'
  if (path.startsWith('/explore')) return 'explore'
  if (path.startsWith('/library')) return 'library'
  if (path.startsWith('/pricing')) return 'pricing'
  if (path.startsWith('/settings')) return 'settings'
  return 'landing'
}

function duration(seconds: number) {
  const finite = Number.isFinite(seconds) && seconds >= 0 ? seconds : 0
  return String(Math.floor(finite / 60)).padStart(1, '0') + ':' + String(Math.floor(finite % 60)).padStart(2, '0')
}

function DMark({ compact = false }: { compact?: boolean }) {
  return <span className={'brand-lockup' + (compact ? ' compact' : '')} aria-label="DENG">
    <span className="brand-symbol" aria-hidden="true"><span /><span /><span /><span /></span>
    {!compact && <span className="brand-word">deng<span className="brand-period">.</span></span>}
  </span>
}

function BookCover({ book, className = '' }: { book: Book; className?: string }) {
  return <img className={'book-cover ' + className} src={coverFor(book)} alt={'Cover artwork for ' + book.title} loading="lazy" />
}

function IconButton({ children, label, onClick, className = '', title }: { children: ReactNode; label: string; onClick?: () => void; className?: string; title?: string }) {
  return <button type="button" className={'icon-button ' + className} aria-label={label} title={title || label} onClick={onClick}>{children}</button>
}

type TileProps = { book: Book; saved: boolean; onOpen: (book: Book) => void; onSave: (book: Book) => void; onPlay: (book: Book) => void; variant?: 'normal' | 'large' }
function BookTile({ book, saved, onOpen, onSave, onPlay, variant = 'normal' }: TileProps) {
  function stop(event: MouseEvent<HTMLButtonElement>, fn: () => void) { event.stopPropagation(); fn() }
  return <article className={'book-tile ' + (variant === 'large' ? 'book-tile-large' : '')}>
    <div className="tile-art-area">
      <button className="tile-cover-button" onClick={() => onOpen(book)} aria-label={'View ' + book.title}>
        <BookCover book={book} />
      </button>
      <div className="tile-actions">
        <button type="button" aria-label={saved ? 'Remove from library' : 'Save to library'} className={'tile-action save' + (saved ? ' is-saved' : '')} onClick={e => stop(e, () => onSave(book))}><Heart size={17} fill={saved ? 'currentColor' : 'none'} /></button>
        <button type="button" aria-label={'Preview ' + book.title} className="tile-action play" onClick={e => stop(e, () => onPlay(book))}><Play size={17} fill="currentColor" /></button>
      </div>
    </div>
    <div className="tile-meta">
      <button className="tile-title" onClick={() => onOpen(book)}>{book.title}</button>
      <span className="tile-author">{book.author}</span>
      <span className="tile-info">{book.genre}<i />{book.duration}</span>
    </div>
  </article>
}

function BookRow({ book, progress, onOpen, onPlay }: { book: Book; progress: number; onOpen: (b: Book) => void; onPlay: (b: Book) => void }) {
  return <article className="continue-card">
    <button className="continue-cover" onClick={() => onOpen(book)} aria-label={'Details for ' + book.title}><BookCover book={book} /></button>
    <div className="continue-text">
      <div className="tiny-label">{progress ? 'CONTINUE YOUR PREVIEW' : 'A STORY TO START'}</div>
      <button onClick={() => onOpen(book)} className="continue-title">{book.title}</button>
      <span className="continue-author">{book.author}</span>
      <div className="continue-progress"><span style={{ width: Math.round(progress * 100) + '%' }} /></div>
      <span className="continue-percent">{progress ? Math.round(progress * 100) + '% of audio preview' : 'Preview ready to play'}</span>
    </div>
    <button className="round-play" onClick={() => onPlay(book)} aria-label={'Resume ' + book.title}><Play size={15} fill="currentColor" /></button>
  </article>
}

function SectionHead({ eyebrow, title, link, onLink }: { eyebrow?: string; title: string; link?: string; onLink?: () => void }) {
  return <div className="section-heading">
    <div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h2>{title}</h2></div>
    {link && <button className="inline-link" onClick={onLink}>{link}<ArrowUpRight size={16} /></button>}
  </div>
}

function LandingHeader({ onExplore, onPricing, onSignIn }: { onExplore: () => void; onPricing: () => void; onSignIn: () => void }) {
  const [open, setOpen] = useState(false)
  return <header className="landing-header">
    <button className="bare-brand" onClick={() => { window.location.hash = '/' }} aria-label="DENG home"><DMark /></button>
    <nav className={'landing-nav ' + (open ? 'nav-open' : '')} aria-label="Marketing navigation">
      <button onClick={() => { onExplore(); setOpen(false) }}>Explore audiobooks</button>
      <button onClick={() => { document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' }); setOpen(false) }}>How it works</button>
      <button onClick={() => { onPricing(); setOpen(false) }}>Membership</button>
    </nav>
    <div className="landing-header-actions">
      <button className="text-action" onClick={onSignIn}>Sign in</button>
      <button className="button button-dark button-small" onClick={onExplore}>Start listening <ArrowUpRight size={15} /></button>
    </div>
    <IconButton label="Toggle menu" className="landing-menu" onClick={() => setOpen(v => !v)}>{open ? <X size={23} /> : <Menu size={23} />}</IconButton>
  </header>
}

function Sidebar({ route, onNavigate, onSignIn, active, mobileOpen, closeMobile }: { route: Route; onNavigate: (path: string) => void; onSignIn: () => void; active: Book | null; mobileOpen: boolean; closeMobile: () => void }) {
  const nav = (path: string) => { closeMobile(); onNavigate(path) }
  return <>
    {mobileOpen && <button className="sidebar-scrim" aria-label="Close navigation" onClick={closeMobile} />}
    <aside className={'sidebar ' + (mobileOpen ? 'sidebar-visible' : '')} aria-label="Primary">
      <div className="sidebar-brand"><button onClick={() => nav('/')} aria-label="DENG landing"><DMark /></button><IconButton label="Close menu" className="sidebar-close" onClick={closeMobile}><X size={19} /></IconButton></div>
      <div className="sidebar-scroll">
        <span className="sidebar-label">LISTEN</span>
        <nav className="sidebar-nav" aria-label="Main navigation">
          <button className={route === 'discover' ? 'selected' : ''} onClick={() => nav('/discover')}><Compass size={19}/><span>Discover</span>{route === 'discover' && <span className="nav-selected-dot" />}</button>
          <button className={route === 'explore' ? 'selected' : ''} onClick={() => nav('/explore')}><Search size={19}/><span>Explore</span>{route === 'explore' && <span className="nav-selected-dot" />}</button>
          <button className={route === 'library' ? 'selected' : ''} onClick={() => nav('/library')}><Library size={19}/><span>Your library</span>{route === 'library' && <span className="nav-selected-dot" />}</button>
        </nav>
        <div className="sidebar-divider" />
        <span className="sidebar-label">YOUR SPACE</span>
        <nav className="sidebar-nav secondary" aria-label="Personal collections">
          <button onClick={() => nav('/library')}><Heart size={19}/><span>Saved books</span></button>
          <button onClick={() => nav('/library')}><Clock3 size={19}/><span>Recently played</span></button>
        </nav>
        <div className="sidebar-bottom-panel">
          <div className="sidebar-promo-art" aria-hidden="true"><span className="promo-record" /><span className="promo-star">✳</span></div>
          <div className="promo-subtitle">A little more listening.</div>
          <h3>Stories without limits.</h3>
          <p>Find your next favorite world with DENG Plus.</p>
          <button onClick={() => nav('/pricing')}>Discover Plus <ArrowUpRight size={15} /></button>
        </div>
      </div>
      <div className="sidebar-user">
        <button onClick={() => nav('/settings')} className="user-avatar" aria-label="Your account">D</button>
        <button className="sidebar-user-details" onClick={() => nav('/settings')}><strong>My listening space</strong><span>Personal account</span></button>
        <IconButton label="Settings" onClick={() => nav('/settings')}><Settings2 size={19}/></IconButton>
      </div>
      {active && <div className="sidebar-active-line" />}
    </aside>
  </>
}

function Topbar({ route, onNavigate, onSignIn, onMenu }: { route: Route; onNavigate: (p: string) => void; onSignIn: () => void; onMenu: () => void }) {
  const title: Record<Route, string> = { landing: '', discover: 'Discover', explore: 'Explore audiobooks', library: 'Your library', pricing: 'Membership', settings: 'Account & preferences', book: 'Audiobook' }
  return <div className="topbar">
    <div className="topbar-leading"><IconButton label="Open menu" className="mobile-menu-trigger" onClick={onMenu}><Menu size={22}/></IconButton><span className="topbar-location">{title[route]}</span></div>
    <div className="topbar-actions">
      <button className="top-search" onClick={() => onNavigate('/explore')}><Search size={17}/><span>Search titles, authors, genres...</span><kbd>⌘ K</kbd></button>
      <button className="top-member-link" onClick={() => onNavigate('/pricing')}>Get Plus <ArrowUpRight size={15}/></button>
      <IconButton label="Account preferences" onClick={onSignIn} className="top-avatar"><span>D</span></IconButton>
    </div>
  </div>
}

function Discover({ onNavigate, onOpen, onPlay, onSave, saved, progress, recent }: {
  onNavigate: (p: string) => void; onOpen: (b: Book) => void; onPlay: (b: Book) => void; onSave: (b: Book) => void
  saved: string[]; progress: Record<string, number>; recent: string[]
}) {
  const continuing = recent.length ? recent.map(id => books.find(b => b.id === id)).filter((b): b is Book => Boolean(b)).slice(0, 2) : books.slice(0, 2)
  const picks = [books[1], books[2], books[3], books[4], books[6], books[9]]
  return <div className="app-page discover-page">
    <div className="page-intro">
      <div className="eyebrow"><span className="eyebrow-dot" /> YOUR DAILY DOSE OF STORY</div>
      <h1>A good day starts<br />with a <em>good story.</em></h1>
      <p>Take a moment, press play, and go somewhere new.</p>
    </div>
    <section className="spotlight-card" aria-label="Featured audiobook">
      <div className="spotlight-copy">
        <span className="spotlight-label"><span className="live-dot" /> THE DENG EDIT · 01 / 04</span>
        <h2>Some stories<br />stay with you.</h2>
        <p>Step into the extraordinary world of Jay Gatsby. A timeless story, beautifully told.</p>
        <div className="spotlight-actions">
          <button className="button button-lime" onClick={() => onPlay(books[0])}><Play size={16} fill="currentColor"/> Listen now</button>
          <button className="spotlight-secondary" onClick={() => onOpen(books[0])}>Explore the book <ArrowUpRight size={16}/></button>
        </div>
      </div>
      <div className="spotlight-visual" aria-hidden="true"><div className="spotlight-ring ring-one" /><div className="spotlight-ring ring-two" /><div className="spotlight-orbit">THE GREAT GATSBY · 1925 · F. SCOTT FITZGERALD ·</div><BookCover book={books[0]} /></div>
      <span className="spotlight-corner">D / 001</span>
    </section>
    <section className="content-section">
      <SectionHead eyebrow={recent.length ? 'PICK UP WHERE YOU LEFT OFF' : 'A GOOD PLACE TO BEGIN'} title={recent.length ? 'Keep the story going' : 'Your first listening picks'} link="Your library" onLink={() => onNavigate('/library')} />
      <div className="continue-grid">{continuing.map(book => <BookRow book={book} key={book.id} progress={progress[book.id] ?? 0} onOpen={onOpen} onPlay={onPlay} />)}</div>
    </section>
    <section className="content-section">
      <SectionHead eyebrow="HANDPICKED FOR YOU" title="The listening edit" link="Explore all books" onLink={() => onNavigate('/explore')} />
      <div className="book-grid">{picks.map(book => <BookTile key={book.id} book={book} saved={saved.includes(book.id)} onOpen={onOpen} onPlay={onPlay} onSave={onSave} />)}</div>
    </section>
    <section className="genre-feature">
      <div className="genre-feature-text"><div className="eyebrow">THERE’S A WORLD FOR EVERY MOOD</div><h2>Where to<br/><em>next?</em></h2><p>From heart-racing adventures to slow Sunday classics, there’s something worth getting lost in.</p><button onClick={() => onNavigate('/explore')} className="button button-dark">Explore all genres <ArrowUpRight size={17}/></button></div>
      <div className="genre-stack" aria-hidden="true"><BookCover book={books[8]}/><BookCover book={books[5]}/><BookCover book={books[7]}/></div>
    </section>
    <section className="content-section">
      <SectionHead eyebrow="A LITTLE SOMETHING FOR EVERYONE" title="Explore by feeling" />
      <div className="genre-chip-grid">{genres.slice(0, 6).map((genre, i) => <button key={genre} onClick={() => onNavigate('/explore?genre=' + encodeURIComponent(genre))} className={'genre-chip genre-chip-' + i}><span>{genre}</span><ArrowUpRight size={19}/></button>)}</div>
    </section>
    <div className="discover-footer"><span>Thoughtfully picked. Beautifully heard.</span><DMark compact /></div>
  </div>
}

function Explore({ onOpen, onSave, onPlay, saved, onNavigate }: { onOpen: (b: Book) => void; onSave: (b: Book) => void; onPlay: (b: Book) => void; saved: string[]; onNavigate: (p: string) => void }) {
  const params = new URLSearchParams(getPath().split('?')[1] || '')
  const [query, setQuery] = useState(params.get('q') ?? '')
  const [genre, setGenre] = useState(params.get('genre') ?? 'All')
  const [sort, setSort] = useState('featured')
  useEffect(() => {
    const next = new URLSearchParams(getPath().split('?')[1] || '')
    setGenre(next.get('genre') ?? 'All')
    if (next.has('q')) setQuery(next.get('q') ?? '')
  }, [getPath()])
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const result = books.filter(b => (genre === 'All' || b.genre === genre) && (!needle || [b.title, b.author, b.genre, ...b.tags].join(' ').toLowerCase().includes(needle)))
    if (sort === 'longest') result.sort((a, b) => b.minutes - a.minutes)
    else if (sort === 'shortest') result.sort((a, b) => a.minutes - b.minutes)
    else if (sort === 'az') result.sort((a, b) => a.title.localeCompare(b.title))
    return result
  }, [query, genre, sort])
  return <div className="app-page explore-page">
    <div className="page-intro smaller"><div className="eyebrow"><span className="eyebrow-dot"/> THE CATALOG</div><h1>Find your next <em>listen.</em></h1><p>A little adventure is always just one play away.</p></div>
    <div className="explore-tools">
      <div className="explore-input"><Search size={20}/><input id="catalog-search" autoComplete="off" type="search" placeholder="Search a title, author, or a feeling..." value={query} onChange={e => setQuery(e.target.value)}/>{query && <IconButton label="Clear search" onClick={() => setQuery('')}><X size={16}/></IconButton>}</div>
      <div className="filter-control"><SlidersHorizontal size={17}/><select aria-label="Sort audiobooks" value={sort} onChange={e => setSort(e.target.value)}><option value="featured">Featured</option><option value="longest">Longest first</option><option value="shortest">Shortest first</option><option value="az">Title A–Z</option></select><ChevronDown size={15}/></div>
    </div>
    <div className="genre-filters" role="group" aria-label="Filter by genre">{['All', ...genres].map(item => <button key={item} className={genre === item ? 'active' : ''} aria-pressed={genre === item} onClick={() => { setGenre(item); onNavigate('/explore' + (item === 'All' ? '' : '?genre=' + encodeURIComponent(item))) }}>{item}</button>)}</div>
    <div className="catalog-count"><strong>{filtered.length}</strong> {filtered.length === 1 ? 'audiobook' : 'audiobooks'} to explore <span>CURATED COLLECTION · VOL. 01</span></div>
    {filtered.length ? <div className="book-grid catalog-grid">{filtered.map(book => <BookTile key={book.id} book={book} saved={saved.includes(book.id)} onOpen={onOpen} onPlay={onPlay} onSave={onSave}/>)}</div> : <div className="empty-state"><Search size={30}/><h3>No stories found</h3><p>Try another title or widen your search.</p><button className="button button-dark" onClick={() => { setQuery(''); setGenre('All'); onNavigate('/explore') }}>Clear filters <ArrowRight size={16}/></button></div>}
  </div>
}

function LibraryPage({ saved, recent, progress, onNavigate, onOpen, onPlay, onSave }: {
  saved: string[]; recent: string[]; progress: Record<string, number>; onNavigate: (p: string) => void; onOpen: (b: Book) => void; onPlay: (b: Book) => void; onSave: (b: Book) => void
}) {
  const [tab, setTab] = useState<'saved' | 'recent'>('saved')
  const items = (tab === 'saved' ? saved : recent).map(id => books.find(book => book.id === id)).filter((b): b is Book => Boolean(b))
  const recentBooks = recent.map(id => books.find(book => book.id === id)).filter((b): b is Book => Boolean(b))
  return <div className="app-page library-page">
    <div className="page-intro smaller"><div className="eyebrow"><span className="eyebrow-dot"/> YOUR OWN CORNER</div><h1>Your listening <em>library.</em></h1><p>All your favorite worlds, waiting right where you left them.</p></div>
    <div className="library-summary"><div><span>BOOKS ON YOUR SHELF</span><strong>{saved.length.toString().padStart(2, '0')}</strong></div><div><span>STORIES STARTED</span><strong>{recent.length.toString().padStart(2, '0')}</strong></div><div className="library-quote">“There is no friend as loyal as a book.”<small>— ERNEST HEMINGWAY</small></div></div>
    {recentBooks.length > 0 && <section className="content-section"><SectionHead title="Keep listening"/><div className="continue-grid">{recentBooks.slice(0, 2).map(b => <BookRow key={b.id} book={b} progress={progress[b.id] ?? 0} onOpen={onOpen} onPlay={onPlay}/>)}</div></section>}
    <div className="library-tabs" role="tablist" aria-label="Library selection"><button role="tab" aria-selected={tab === 'saved'} className={tab === 'saved' ? 'active' : ''} onClick={() => setTab('saved')}>Saved books <span>{saved.length}</span></button><button role="tab" aria-selected={tab === 'recent'} className={tab === 'recent' ? 'active' : ''} onClick={() => setTab('recent')}>Recently played <span>{recent.length}</span></button></div>
    {items.length ? <div className="book-grid catalog-grid">{items.map(book => <BookTile key={book.id} book={book} saved={saved.includes(book.id)} onOpen={onOpen} onPlay={onPlay} onSave={onSave}/>)}</div> : <div className="empty-state library-empty"><div className="empty-art"><BookOpen size={37} strokeWidth={1.25}/></div><h3>{tab === 'saved' ? 'Your next favorite is out there.' : 'Every story starts with play.'}</h3><p>{tab === 'saved' ? 'Save the books that catch your eye and find them here whenever you like.' : 'Start listening to a book and it will appear in your recent listens.'}</p><button className="button button-dark" onClick={() => onNavigate('/explore')}>Explore audiobooks <ArrowUpRight size={16}/></button></div>}
  </div>
}

function Detail({ book, saved, progress, onSave, onPlay, onNavigate, showToast }: { book: Book; saved: boolean; progress: number; onSave: (b: Book) => void; onPlay: (b: Book) => void; onNavigate: (p: string) => void; showToast: (s: string) => void }) {
  return <div className="app-page detail-page">
    <button className="back-link" onClick={() => onNavigate('/explore')}><ArrowLeft size={17}/> Back to explore</button>
    <div className="detail-hero">
      <div className="detail-cover-frame"><div className="detail-cover-glow"/><BookCover book={book}/><span className="cover-reflection"/></div>
      <div className="detail-copy">
        <div className="eyebrow"><span className="eyebrow-dot"/> THE DENG LIBRARY / {book.genre.toUpperCase()}</div>
        <h1>{book.title}</h1>
        <div className="detail-author">By <strong>{book.author}</strong></div>
        <p className="detail-description">{book.description}</p>
        <div className="detail-facts"><span><Headphones size={17}/>{book.duration}</span><span><Sparkles size={17}/>Curated classic</span><span><BookOpen size={17}/>{book.chapters.length} chapters</span></div>
        <div className="detail-actions"><button className="button button-dark detail-listen" onClick={() => onPlay(book)}><Play size={17} fill="currentColor"/>{book.sample ? (progress ? 'Continue preview' : 'Listen to preview') : 'Try audio preview'}</button><button className={'button button-outline ' + (saved ? 'saved-detail' : '')} onClick={() => onSave(book)}><Heart size={17} fill={saved ? 'currentColor' : 'none'}/>{saved ? 'Saved to library' : 'Add to library'}</button><IconButton label="Share book" className="detail-share" onClick={() => { navigator.clipboard?.writeText(window.location.href).then(() => showToast('Book link copied to clipboard')).catch(() => showToast('Copy this page URL to share this book')) }}><Share2 size={19}/></IconButton></div>
        <div className="detail-perk"><Check size={15}/> A selection from our public-domain classics collection</div>
      </div>
    </div>
    <div className="detail-below">
      <div className="detail-about"><div className="eyebrow">BEHIND THE STORY</div><h2>The story behind<br/><em>the story.</em></h2><p>{book.editorial}</p><p>Beautiful stories deserve your full attention. Settle in, find your rhythm, and experience this timeless work in a new way.</p><div className="detail-chips">{book.tags.map(t => <span key={t}>{t}</span>)}<span>{book.genre}</span></div></div>
      <div className="chapter-list"><div className="chapter-header"><div><div className="eyebrow">INSIDE THE AUDIOBOOK</div><h2>Chapters <small>({book.chapters.length})</small></h2></div><span>{book.duration} total</span></div>{book.chapters.map((chapter, i) => <button key={chapter} className="chapter-item" onClick={() => { if (i === 0) onPlay(book); else showToast('Additional chapter audio will be available when the full library launches.') }}><span className="chapter-number">{String(i + 1).padStart(2, '0')}</span><span className="chapter-name">{chapter}</span><span className="chapter-time">{i === 0 && book.sample ? 'Preview available' : 'Chapter ' + (i + 1)}</span><Play size={15}/></button>)}</div>
    </div>
    <section className="detail-related"><SectionHead title="You might also love" link="Browse library" onLink={() => onNavigate('/explore')}/><div className="related-strip">{books.filter(b => b.id !== book.id && b.genre === book.genre).concat(books.filter(b => b.id !== book.id && b.genre !== book.genre)).slice(0, 4).map(b => <button key={b.id} className="related-item" onClick={() => onNavigate('/book/' + b.id)}><BookCover book={b}/><span>{b.title}</span></button>)}</div></section>
  </div>
}

function Pricing({ onPlan }: { onPlan: (name: string) => void }) {
  return <div className="app-page pricing-page">
    <div className="pricing-intro"><span className="eyebrow"><span className="eyebrow-dot"/> MADE FOR THE LOVE OF LISTENING</span><h1>A world of stories.<br/><em>One simple membership.</em></h1><p>Start with the classics, stay for everything that moves you. Beautiful listening should feel effortless.</p></div>
    <div className="pricing-grid"><article className="plan-card"><div className="plan-number">01 / EXPLORE</div><h2>Free</h2><p>A lovely place to begin.</p><div className="price-amount">$0 <span>/ month</span></div><button onClick={() => onPlan('Free')} className="button button-outline">Continue with Free <ArrowRight size={16}/></button><div className="plan-divider"/><div className="plan-features"><span><Check size={16}/> Explore the curated catalog</span><span><Check size={16}/> Sample selected audiobooks</span><span><Check size={16}/> Save your favorite titles</span><span><Check size={16}/> Personal listening history</span></div></article><article className="plan-card featured-plan"><div className="plan-number">02 / LISTEN MORE <span>COMING SOON</span></div><h2>DENG Plus</h2><p>For the love of a really good story.</p><div className="price-amount">$4 <span>/ month · proposed</span></div><button onClick={() => onPlan('DENG Plus')} className="button button-lime">Join the early-access list <ArrowUpRight size={17}/></button><div className="plan-divider"/><div className="plan-features"><span><Check size={16}/> Everything in Free</span><span><Check size={16}/> Planned full audiobook access</span><span><Check size={16}/> Planned unlimited listening</span><span><Check size={16}/> Planned listening across devices</span><span><Check size={16}/> Planned new titles every month</span></div><div className="plan-mark">✳</div></article></div>
    <div className="pricing-footnote"><ShieldCheck size={19}/><span>Membership features and pricing are previews. No payments are collected in this demo.</span></div>
    <div className="faq-block"><div className="eyebrow">GOOD TO KNOW</div><h2>A few things you<br/>might be <em>wondering.</em></h2><FAQ question="Can I listen for free?" answer="Yes. The free preview includes discovery, saved books, and playable samples from selected public-domain audiobook recordings."/ ><FAQ question="Is DENG Plus live?" answer="Not yet. The $4 per month figure is a proposed price. Join the early-access interest list for updates; checkout and billing are not active."/ ><FAQ question="Will my library be saved?" answer="Your saved titles and listening progress are stored in this browser for the demo. Account synchronization will require the production backend."/ ><FAQ question="Can I listen on my phone?" answer="Yes. This responsive web experience works on desktop and mobile browsers; the demo audio samples require an internet connection."/ ></div>
  </div>
}

function FAQ({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false)
  return <div className={'faq-item ' + (open ? 'faq-open' : '')}><button aria-expanded={open} onClick={() => setOpen(o => !o)}>{question}<span>{open ? <Minus size={20}/> : <Plus size={20}/>}</span></button>{open && <p>{answer}</p>}</div>
}

function SettingsPage({ displayName, setDisplayName, onNavigate, showToast }: { displayName: string; setDisplayName: (name: string) => void; onNavigate: (p: string) => void; showToast: (s: string) => void }) {
  const [name, setName] = useState(displayName)
  const [emails, setEmails] = usePersisted('deng-email-pref', false)
  return <div className="app-page settings-page"><div className="page-intro smaller"><div className="eyebrow"><span className="eyebrow-dot"/> MAKE YOURSELF AT HOME</div><h1>Your space, <em>your way.</em></h1><p>The little details that make listening feel like yours.</p></div>
    <div className="settings-layout"><div className="settings-main"><section className="settings-card"><div className="settings-section-top"><h2>Profile</h2><p>What should we call you around here?</p></div><div className="settings-profile"><div className="settings-avatar">{(displayName[0] || 'D').toUpperCase()}</div><div><strong>{displayName || 'DENG listener'}</strong><span>Local demo profile</span></div></div><form onSubmit={e => { e.preventDefault(); setDisplayName(name.trim() || 'DENG listener'); showToast('Profile name saved to this browser') }}><label htmlFor="display-name">Display name</label><input id="display-name" value={name} maxLength={32} onChange={e => setName(e.target.value)}/><button className="button button-dark" type="submit">Save changes <Check size={16}/></button></form></section>
    <section className="settings-card"><div className="settings-section-top"><h2>Listening preferences</h2><p>A quiet place to make things comfortable.</p></div><div className="settings-option"><div><strong>Product updates</strong><span>Opt in to local preferences for release updates.</span></div><button role="switch" aria-checked={emails} onClick={() => setEmails(!emails)} className={'switch ' + (emails ? 'on' : '')}><span/></button></div><div className="settings-option"><div><strong>Language</strong><span>More listening languages are planned.</span></div><span className="settings-value">English <ChevronDown size={15}/></span></div></section></div><aside className="settings-aside"><div className="account-plan"><div className="eyebrow">YOUR MEMBERSHIP</div><strong>Free listening</strong><p>A personal shelf, curated discoveries, and selected previews.</p><button onClick={() => onNavigate('/pricing')}>Explore membership <ArrowUpRight size={16}/></button></div><div className="privacy-note"><LockKeyhole size={19}/><p>This is a frontend demo. Profile preferences and your library are saved only in this browser. No account or payment information is sent to a server.</p></div></aside></div></div>
}

function Player({ book, playing, progress, durationSeconds, volume, speed, expanded, onToggle, onClose, onSeek, onVolume, onSpeed, onExpand, onNext, onPrev }: {
  book: Book | null; playing: boolean; progress: number; durationSeconds: number; volume: number; speed: number; expanded: boolean
  onToggle: () => void; onClose: () => void; onSeek: (v: number) => void; onVolume: (v: number) => void; onSpeed: () => void; onExpand: () => void; onNext: () => void; onPrev: () => void
}) {
  if (!book) return null
  const current = duration(progress)
  const end = duration(durationSeconds)
  const controls = <div className="player-controls"><IconButton label="Previous story" onClick={onPrev}><SkipBack size={19} fill="currentColor"/></IconButton><button aria-label={playing ? 'Pause' : 'Play'} className="player-main-toggle" onClick={onToggle}>{playing ? <Pause size={19} fill="currentColor"/> : <Play size={19} fill="currentColor"/>}</button><IconButton label="Next story" onClick={onNext}><SkipForward size={19} fill="currentColor"/></IconButton></div>
  return <>
    <div className="player-dock"><button className="dock-book" onClick={onExpand} aria-label="Open full player"><BookCover book={book}/><span><strong>{book.title}</strong><small>{book.author}</small></span></button>{controls}<div className="dock-seek"><span>{current}</span><input aria-label="Seek audio" type="range" min={0} max={1000} value={durationSeconds ? Math.round(progress / durationSeconds * 1000) : 0} onChange={e => onSeek(Number(e.target.value) / 1000)} style={{ '--played': (durationSeconds ? progress / durationSeconds * 100 : 0) + '%' } as React.CSSProperties}/><span>{end}</span></div><div className="dock-extras"><button onClick={onSpeed} className="speed-button" title="Change playback speed">{speed}×</button><Volume2 size={18}/><input className="dock-volume" aria-label="Volume" type="range" min={0} max={100} value={Math.round(volume * 100)} onChange={e => onVolume(Number(e.target.value) / 100)}/><IconButton label="Expand player" onClick={onExpand}><ArrowUpRight size={19}/></IconButton><IconButton label="Close player" onClick={onClose}><X size={18}/></IconButton></div></div>
    {expanded && <div className="full-player-overlay" role="dialog" aria-modal="true" aria-label="Now playing"><div className="full-player-glow" style={{ backgroundImage: 'url(' + coverFor(book) + ')' }}/><div className="full-player-inner"><div className="full-player-header"><DMark/><div className="now-playing-label">NOW PLAYING <span>·</span> DENG ORIGINAL SELECTION</div><IconButton label="Minimize player" onClick={onExpand}><X size={23}/></IconButton></div><div className="full-player-center"><div className="full-player-art"><BookCover book={book}/></div><div className="full-player-title">{book.title}</div><div className="full-player-author">by {book.author}</div><div className="full-progress"><input aria-label="Seek playback" type="range" min={0} max={1000} value={durationSeconds ? Math.round(progress / durationSeconds * 1000) : 0} onChange={e => onSeek(Number(e.target.value) / 1000)} style={{ '--played': (durationSeconds ? progress / durationSeconds * 100 : 0) + '%' } as React.CSSProperties}/><div><span>{current}</span><span>{end}</span></div></div><div className="full-controls"><button onClick={onSpeed} className="full-speed">{speed}×</button>{controls}<IconButton label={volume ? 'Mute audio' : 'Unmute audio'} onClick={() => onVolume(volume ? 0 : 1)}>{volume ? <Volume2 size={22}/> : <VolumeX size={22}/>}</IconButton></div></div><div className="full-player-bottom"><span>THE ART OF LISTENING WELL.</span><button onClick={onClose}>END SESSION <X size={14}/></button></div></div></div>}
  </>
}

function InterestModal({ plan, onClose, showToast }: { plan: string | null; onClose: () => void; showToast: (message: string) => void }) {
  const [email, setEmail] = useState('')
  if (!plan) return null
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!email.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return
    // This demo does not send email to a server or subscribe someone to marketing.
    onClose()
    showToast('Thanks! Early-access signups need to be connected to a mailing service before launch.')
  }
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}><div className="interest-modal" role="dialog" aria-modal="true" aria-labelledby="interest-title"><IconButton label="Close" className="modal-close" onClick={onClose}><X size={19}/></IconButton><div className="interest-art"><span className="mini-disc" /><DMark compact/></div><div className="eyebrow">SOMETHING GOOD IS COMING</div><h2 id="interest-title">{plan === 'Free' ? 'The library is yours.' : 'Get a seat in the front row.'}</h2><p>{plan === 'Free' ? 'You can explore the free audiobook selection right now. Dive into your next story.' : 'The next chapter of DENG is in the works. This preview shows how the early-access form will look once email signup is connected.'}</p>{plan === 'Free' ? <button className="button button-dark modal-submit" onClick={onClose}>Back to listening <ArrowRight size={17}/></button> : <form onSubmit={submit}><label htmlFor="interest-email">Your email</label><input type="email" id="interest-email" placeholder="you@example.com" value={email} required onChange={e => setEmail(e.target.value)}/><button className="button button-dark modal-submit" type="submit">Preview request <ArrowRight size={17}/></button><small>Demo only. No email is submitted or stored.</small></form>}</div></div>
}

function SignInModal({ onClose, onNavigate }: { onClose: () => void; onNavigate: (path: string) => void }) {
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}><div role="dialog" aria-modal="true" aria-labelledby="signin-title" className="interest-modal signin-modal"><IconButton label="Close" className="modal-close" onClick={onClose}><X size={19}/></IconButton><DMark/><div className="eyebrow">YOUR STORIES, YOUR SPACE</div><h2 id="signin-title">Welcome to DENG.</h2><p>Explore the demo with your personal library saved locally in this browser. Secure sign-in will be available when the account service is connected.</p><button className="button button-dark modal-submit" onClick={() => { onClose(); onNavigate('/discover') }}>Explore the library <ArrowRight size={17}/></button><button className="signin-secondary" onClick={() => { onClose(); onNavigate('/settings') }}>Manage demo profile <ArrowUpRight size={15}/></button></div></div>
}

function App() {
  const [path, setPath] = useState(getPath)
  const [reading, setReading] = usePersisted<ReadingState>('deng-reading-v1', initialReading)
  const [displayName, setDisplayName] = usePersisted('deng-display-name', 'DENG listener')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [audioTime, setAudioTime] = useState(0)
  const [audioDuration, setAudioDuration] = useState(0)
  const [volume, setVolume] = useState(0.8)
  const [speed, setSpeed] = useState(1)
  const [expanded, setExpanded] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [interest, setInterest] = useState<string | null>(null)
  const [signIn, setSignIn] = useState(false)
  const [toast, setToast] = useState('')
  const audioRef = useRef<HTMLAudioElement>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingResume = useRef<{ id: string; fraction: number } | null>(null)
  const lastCheckpoint = useRef(0)
  const active = useMemo(() => books.find(b => b.id === activeId) ?? null, [activeId])
  const route = routeFromPath(path)

  useEffect(() => { const change = () => { setPath(getPath()); setMobileOpen(false); window.scrollTo({ top: 0, behavior: 'instant' }) }; window.addEventListener('hashchange', change); return () => window.removeEventListener('hashchange', change) }, [])
  const navigate = useCallback((target: string) => {
    if (getPath() === target) { setPath(target); window.scrollTo({ top: 0, behavior: 'smooth' }) }
    else window.location.hash = target
  }, [])
  const notify = useCallback((message: string) => {
    setToast(message)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 4200)
  }, [])
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current) }, [])
  const openBook = (book: Book) => navigate('/book/' + book.id)
  const saveBook = (book: Book) => {
    const wasSaved = reading.saved.includes(book.id)
    setReading(prev => ({ ...prev, saved: wasSaved ? prev.saved.filter(id => id !== book.id) : [book.id, ...prev.saved] }))
    notify(wasSaved ? 'Removed from your library' : 'Added to your library')
  }
  const savePosition = useCallback((id: string | null, time: number, length: number) => {
    if (!id || !Number.isFinite(length) || length <= 0) return
    const fraction = Math.max(0, Math.min(1, Math.round(time / length * 1000) / 1000))
    setReading(prev => prev.progress[id] === fraction ? prev : { ...prev, progress: { ...prev.progress, [id]: fraction } })
  }, [setReading])
  const playBook = useCallback((book: Book) => {
    if (!book.sample) { notify('This edition’s audio is being prepared. Try The Great Gatsby or Pride and Prejudice.'); return }
    const el = audioRef.current
    if (!el) return
    if (activeId === book.id) {
      void el.play().then(() => setPlaying(true)).catch(() => notify('Audio could not be played. Check your connection.'))
      return
    }
    if (activeId) savePosition(activeId, el.currentTime, el.duration)
    pendingResume.current = { id: book.id, fraction: reading.progress[book.id] ?? 0 }
    lastCheckpoint.current = 0
    el.pause()
    el.src = book.sample
    el.volume = volume
    el.playbackRate = speed
    el.load()
    setActiveId(book.id); setAudioTime(0); setAudioDuration(0); setPlaying(false)
    setReading(prev => ({ ...prev, recent: [book.id, ...prev.recent.filter(id => id !== book.id)] }))
    // Keep play() in the original click gesture for iOS/Safari audio permissions.
    void el.play().then(() => setPlaying(true)).catch(() => { setPlaying(false); notify('Audio preview could not load. Check your internet connection.') })
  }, [activeId, notify, reading.progress, savePosition, setReading, speed, volume])
  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume }, [volume])
  useEffect(() => { if (audioRef.current) audioRef.current.playbackRate = speed }, [speed])
  const toggle = () => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) void audio.play().then(() => setPlaying(true)).catch(() => notify('Audio could not start.'))
    else { audio.pause(); setPlaying(false) }
  }
  const seek = (part: number) => {
    const audio = audioRef.current
    if (!audio || !Number.isFinite(audio.duration)) return
    audio.currentTime = Math.max(0, Math.min(1, part)) * audio.duration
    setAudioTime(audio.currentTime)
    savePosition(activeId, audio.currentTime, audio.duration)
  }
  const step = (direction: number) => { if (!active) return; const eligible = books.filter(b => b.sample); const idx = eligible.findIndex(b => b.id === active.id); const next = eligible[(idx + direction + eligible.length) % eligible.length]; if (next) playBook(next) }
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); navigate('/explore'); window.setTimeout(() => document.getElementById('catalog-search')?.focus(), 30) }
      if (event.key === 'Escape') { setExpanded(false); setInterest(null); setSignIn(false); setMobileOpen(false) }
      const target = event.target as HTMLElement
      if (event.code === 'Space' && activeId && !['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT'].includes(target.tagName) && !expanded) { event.preventDefault(); toggle() }
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  })
  const onTimeUpdate = (el: HTMLAudioElement) => {
    setAudioTime(el.currentTime)
    // Saving every few seconds, and on pause/seek/close, prevents lost progress
    // without causing a full app render for every native audio timeupdate event.
    if (el.currentTime >= lastCheckpoint.current + 5 || el.currentTime < lastCheckpoint.current - 5) {
      lastCheckpoint.current = el.currentTime
      savePosition(activeId, el.currentTime, el.duration)
    }
  }
  const closePlayer = () => {
    const el = audioRef.current
    if (el) { savePosition(activeId, el.currentTime, el.duration); el.pause(); el.removeAttribute('src'); el.load() }
    setActiveId(null); setPlaying(false); setExpanded(false)
  }

  return <>
    <button className="skip-link" onClick={() => { const main = document.getElementById('main-content'); main?.scrollIntoView(); main?.focus() }}>Skip to main content</button>
    <audio ref={audioRef} preload="metadata"
      onTimeUpdate={e => onTimeUpdate(e.currentTarget)}
      onLoadedMetadata={e => {
        const el = e.currentTarget
        setAudioDuration(el.duration)
        const resume = pendingResume.current
        if (resume && resume.id === activeId && Number.isFinite(el.duration)) {
          el.currentTime = Math.max(0, Math.min(0.98, resume.fraction)) * el.duration
          setAudioTime(el.currentTime)
          lastCheckpoint.current = el.currentTime
          pendingResume.current = null
        }
      }}
      onDurationChange={e => { if (Number.isFinite(e.currentTarget.duration)) setAudioDuration(e.currentTarget.duration) }}
      onPlay={() => setPlaying(true)}
      onPause={e => { setPlaying(false); if (activeId) savePosition(activeId, e.currentTarget.currentTime, e.currentTarget.duration) }}
      onEnded={e => { setPlaying(false); savePosition(activeId, e.currentTarget.duration, e.currentTarget.duration) }}
      onError={() => { if (active) { setPlaying(false); notify('Could not load this sample. The recording host may be unavailable.') } }}/>
    {route === 'landing' ? <div className="marketing-shell"><LandingHeader onExplore={() => navigate('/discover')} onPricing={() => navigate('/pricing')} onSignIn={() => setSignIn(true)}/><main tabIndex={-1} id="main-content"><Marketing onExplore={() => navigate('/discover')} onPricing={() => navigate('/pricing')} onPlaySample={() => playBook(books[0])}/></main></div> : <div className={'app-shell ' + (active ? 'has-player' : '')}>
      <Sidebar route={route} active={active} onNavigate={navigate} onSignIn={() => setSignIn(true)} mobileOpen={mobileOpen} closeMobile={() => setMobileOpen(false)}/>
      <div className="app-content"><Topbar route={route} onNavigate={navigate} onSignIn={() => setSignIn(true)} onMenu={() => setMobileOpen(true)}/><main id="main-content" tabIndex={-1} key={route === 'book' ? path : route}>
        {route === 'discover' && <Discover onNavigate={navigate} onOpen={openBook} onPlay={playBook} onSave={saveBook} saved={reading.saved} recent={reading.recent} progress={reading.progress}/>}
        {route === 'explore' && <Explore onNavigate={navigate} onOpen={openBook} onPlay={playBook} onSave={saveBook} saved={reading.saved}/>}
        {route === 'library' && <LibraryPage onNavigate={navigate} onOpen={openBook} onPlay={playBook} onSave={saveBook} saved={reading.saved} recent={reading.recent} progress={reading.progress}/>}
        {route === 'pricing' && <Pricing onPlan={setInterest}/>}
        {route === 'settings' && <SettingsPage displayName={displayName} setDisplayName={setDisplayName} onNavigate={navigate} showToast={notify}/>}
        {route === 'book' && (() => { const book = books.find(b => b.id === path.slice('/book/'.length).split('?')[0]); return book ? <Detail book={book} saved={reading.saved.includes(book.id)} progress={reading.progress[book.id] ?? 0} onSave={saveBook} onPlay={playBook} onNavigate={navigate} showToast={notify}/> : <div className="empty-state"><h2>We couldn't find that story.</h2><button className="button button-dark" onClick={() => navigate('/explore')}>Back to the catalog</button></div> })()}
      </main></div>
      <div className="mobile-bottom-nav"><button className={route === 'discover' ? 'active' : ''} onClick={() => navigate('/discover')}><Compass size={21}/><span>Discover</span></button><button className={route === 'explore' ? 'active' : ''} onClick={() => navigate('/explore')}><Search size={21}/><span>Explore</span></button><button className={route === 'library' ? 'active' : ''} onClick={() => navigate('/library')}><Library size={21}/><span>Library</span></button><button className={route === 'settings' ? 'active' : ''} onClick={() => navigate('/settings')}><Settings2 size={21}/><span>Account</span></button></div>
    </div>}
    <Player book={active} playing={playing} progress={audioTime} durationSeconds={audioDuration} volume={volume} speed={speed} expanded={expanded} onToggle={toggle} onClose={closePlayer} onSeek={seek} onVolume={setVolume} onSpeed={() => setSpeed(s => s >= 2 ? 0.75 : Math.round((s + 0.25) * 100) / 100)} onExpand={() => setExpanded(v => !v)} onPrev={() => step(-1)} onNext={() => step(1)}/>
    {interest && <InterestModal plan={interest} onClose={() => { setInterest(null); if (interest === 'Free') navigate('/discover') }} showToast={notify}/>}
    {signIn && <SignInModal onClose={() => setSignIn(false)} onNavigate={navigate}/>}
    {toast && <div className="toast" role="status"><span className="toast-dot"/>{toast}<IconButton label="Dismiss notification" onClick={() => setToast('')}><X size={15}/></IconButton></div>}
  </>
}

export default App
