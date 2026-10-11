import { useState, type MouseEvent } from 'react';
import { books as catalogBooks, coverFor, type Book } from './books';
import './Marketing.css';

export type MarketingProps = {
  onExplore: () => void;
  onPricing: () => void;
  onPlaySample: () => void;
};

const marketingIds = ['great-gatsby', 'pride-prejudice', 'odyssey', 'art-of-war', 'little-women', 'secret-garden'] as const;
const books: Book[] = marketingIds.flatMap((id) => {
  const book = catalogBooks.find((entry) => entry.id === id);
  return book ? [book] : [];
});

type MoodKey = 'slow' | 'curious' | 'faraway' | 'brave';

const moods: Record<
  MoodKey,
  { label: string; kicker: string; title: string; description: string; cover: Book; index: string }
> = {
  slow: {
    label: 'Slow things down',
    kicker: 'FOR YOUR QUIET HOURS',
    title: 'A softer place to land.',
    description: 'Unhurried chapters for the walk home, a late evening, or a little time to yourself.',
    cover: books[5],
    index: '01',
  },
  curious: {
    label: 'Learn something new',
    kicker: 'FOR THE RESTLESSLY CURIOUS',
    title: 'Follow that little question.',
    description: 'Ideas that open doors. Discover a new perspective while the rest of life keeps moving.',
    cover: books[3],
    index: '02',
  },
  faraway: {
    label: 'Go somewhere else',
    kicker: 'FOR THE DAYDREAMERS',
    title: 'Somewhere beyond here.',
    description: 'Other places, other lives, other worlds. Your next escape is only a chapter away.',
    cover: books[2],
    index: '03',
  },
  brave: {
    label: 'Feel everything',
    kicker: 'FOR THE BIG FEELERS',
    title: 'The stories that stay.',
    description: 'Tender, vivid, unforgettable listening for the moments when you want to feel a little more.',
    cover: books[1],
    index: '04',
  },
};

const moodOrder: MoodKey[] = ['slow', 'curious', 'faraway', 'brave'];

function ArrowIcon({ diagonal = false }: { diagonal?: boolean }) {
  return diagonal ? (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 19 19 5M7 5h12v12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 12h15m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m9 5 11 7-11 7V5Z" fill="currentColor" stroke="currentColor" strokeLinejoin="round" />
    </svg>
  );
}

function HeadphonesIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 14v-3a8 8 0 0 1 16 0v3M4 14h4v7H6a2 2 0 0 1-2-2v-5Zm16 0h-4v7h2a2 2 0 0 0 2-2v-5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function SoundBars({ bars = 33 }: { bars?: number }) {
  return (
    <span className="deng-sound-bars" aria-hidden="true">
      {Array.from({ length: bars }, (_, index) => (
        <span key={index} style={{ height: `${20 + ((index * 19 + index * index * 7) % 78)}%` }} />
      ))}
    </span>
  );
}

function BookCover({ book, className = '' }: { book: Book; className?: string }) {
  return (
    <img className={`deng-book-cover ${className}`} src={coverFor(book)} alt={`Cover of ${book.title} by ${book.author}`} loading="lazy" />
  );
}

function jumpToSection(event: MouseEvent<HTMLAnchorElement>, sectionId: string) {
  event.preventDefault();
  const behavior: ScrollBehavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  if (sectionId === 'deng-hero-title') {
    window.scrollTo({ top: 0, behavior });
    return;
  }
  document.getElementById(sectionId)?.scrollIntoView({ behavior, block: 'start' });
}

export default function Marketing({ onExplore, onPricing, onPlaySample }: MarketingProps) {
  const [selectedMood, setSelectedMood] = useState<MoodKey>('slow');
  const mood = moods[selectedMood];

  return (
    <div className="deng-landing">
      <section className="deng-hero deng-container" aria-labelledby="deng-hero-title">
        <div className="deng-hero-eyebrow">
          <span><span className="deng-status-dot" /> AN AUDIOBOOK UNIVERSE</span>
          <span className="deng-eyebrow-right">MADE FOR HOW LIFE MOVES <span aria-hidden="true">↗</span></span>
        </div>

        <div className="deng-hero-title-wrap">
          <h1 id="deng-hero-title">Lose yourself.<br /><em>Find a story.</em></h1>
          <div className="deng-hero-annotation" aria-hidden="true">
            <span className="deng-annotation-asterisk">✳</span>
            <span>THE GOOD KIND<br />OF GETTING LOST</span>
          </div>
        </div>

        <div className="deng-hero-bottom">
          <p>Beautifully told stories for every kind of day. Press play, follow your curiosity, and let the world sound a little different.</p>
          <div className="deng-hero-actions">
            <button type="button" className="deng-button deng-button--dark" onClick={onExplore}>
              Explore the library <span className="deng-button-icon"><ArrowIcon diagonal /></span>
            </button>
            <button type="button" className="deng-text-button" onClick={onPlaySample}>
              <span className="deng-outline-play"><PlayIcon /></span> Hear a little sample
            </button>
          </div>
        </div>
      </section>

      <section className="deng-stage-wrap" aria-label="DENG listening experience preview">
        <div className="deng-stage">
          <div className="deng-stage-topline"><span>YOUR EVERYDAY ESCAPE</span><span>DESIGNED TO BE HEARD <span aria-hidden="true">↗</span></span></div>
          <div className="deng-stage-art">
            <div className="deng-floating-book deng-floating-book--left"><BookCover book={books[2]} /></div>
            <div className="deng-floating-book deng-floating-book--right"><BookCover book={books[1]} /></div>

            <div className="deng-stage-player">
              <div className="deng-player-heading"><span className="deng-player-mark">d<span>●</span>ng.</span><span className="deng-player-state"><span /> NOW LISTENING</span></div>
              <div className="deng-player-content">
                <BookCover book={books[0]} className="deng-player-cover" />
                <div className="deng-player-details">
                  <span className="deng-player-overline">PLAYABLE PREVIEW · LITERARY FICTION</span>
                  <h2>The Great<br />Gatsby</h2>
                  <p>A vivid portrait of longing, ambition and a beautiful illusion.</p>
                  <div className="deng-player-wave"><SoundBars /></div>
                  <div className="deng-player-progress"><span /></div>
                  <div className="deng-player-time"><span>CHAPTER I</span><span>AUDIO PREVIEW</span></div>
                  <div className="deng-player-controls">
                    <span className="deng-skip-label" aria-hidden="true">↶ <small>15</small></span>
                    <button type="button" onClick={onPlaySample} className="deng-player-play" aria-label="Play audiobook sample"><PlayIcon /></button>
                    <span className="deng-skip-label" aria-hidden="true">↷ <small>15</small></span>
                  </div>
                </div>
              </div>
              <div className="deng-player-footer"><span>01 / 09 CHAPTERS</span><span><HeadphonesIcon /> THE LISTENING ROOM</span></div>
            </div>
          </div>
          <div className="deng-stage-bottomline"><span>JUST YOU, THE MOMENT, AND A REALLY GOOD STORY.</span><span>SCROLL TO EXPLORE <span aria-hidden="true">↓</span></span></div>
        </div>
      </section>

      <section className="deng-benefits deng-container" aria-label="Why listen with DENG">
        <div className="deng-benefit"><span className="deng-benefit-index">01 /</span><h2>More story.<br /><em>Less scrolling.</em></h2></div>
        <div className="deng-benefit"><span className="deng-benefit-index">02 /</span><h2>Made for<br /><em>every moment.</em></h2></div>
        <div className="deng-benefit"><span className="deng-benefit-index">03 /</span><h2>Stay curious.<br /><em>Keep listening.</em></h2></div>
      </section>

      <section className="deng-library deng-container" id="deng-library" aria-labelledby="deng-library-title">
        <div className="deng-section-overline"><span className="deng-section-number">(01)</span><span>THE LIBRARY</span><span className="deng-section-rule" /></div>
        <div className="deng-section-heading">
          <h2 id="deng-library-title">Good books.<br /><em>Great company.</em></h2>
          <div className="deng-section-intro"><p>Unforgettable fiction, fresh perspectives, and little discoveries. There's always something worth your ears.</p><button type="button" className="deng-link-button" onClick={onExplore}>Browse all stories <ArrowIcon diagonal /></button></div>
        </div>
        <div className="deng-book-grid">
          {books.map((book, index) => (
            <button type="button" className="deng-book-item" key={book.id} onClick={onExplore} aria-label={`Explore ${book.title}`}>
              <div className="deng-book-frame"><BookCover book={book} /><span className="deng-book-corner"><ArrowIcon diagonal /></span></div>
              <span className="deng-book-meta"><span>{book.genre}</span><span>{String(index + 1).padStart(2, '0')}</span></span>
              <span className="deng-book-title">{book.title}</span>
            </button>
          ))}
        </div>
        <p className="deng-illustrative-note">A selection from the DENG classics catalog. Browse all twelve titles and available audio previews.</p>
      </section>

      <div className="deng-marquee" aria-hidden="true"><div className="deng-marquee-track">{Array.from({ length: 4 }, (_, index) => <span key={index}>A WHOLE WORLD IN YOUR EARS <span>✳</span> TAKE THE SCENIC ROUTE <span>✳</span> </span>)}</div></div>

      <section className="deng-moods deng-container" id="deng-moods" aria-labelledby="deng-moods-title">
        <div className="deng-section-overline"><span className="deng-section-number">(02)</span><span>FIND YOUR FREQUENCY</span><span className="deng-section-rule" /></div>
        <div className="deng-moods-layout">
          <div className="deng-moods-copy">
            <h2 id="deng-moods-title">There's a story<br />for <em>that feeling.</em></h2>
            <p>Some days ask for a little magic. Others, a new idea. Tell us where your mind is, and follow the feeling.</p>
            <div className="deng-mood-list" role="group" aria-label="Explore stories by mood">
              {moodOrder.map((key) => (
                <button type="button" key={key} className={`deng-mood-button ${selectedMood === key ? 'is-active' : ''}`} onClick={() => setSelectedMood(key)} aria-pressed={selectedMood === key}>
                  <span>{moods[key].label}</span><span className="deng-mood-arrow"><ArrowIcon diagonal /></span>
                </button>
              ))}
            </div>
          </div>
          <div className="deng-mood-preview" aria-live="polite" aria-atomic="true">
            <div className="deng-mood-preview-top"><span>DENG RECOMMENDS</span><span>{mood.index} / 04</span></div>
            <div className="deng-mood-preview-art" key={selectedMood}>
              <span className="deng-mood-orbit deng-mood-orbit--one" aria-hidden="true" />
              <span className="deng-mood-orbit deng-mood-orbit--two" aria-hidden="true" />
              <BookCover book={mood.cover} />
            </div>
            <div className="deng-mood-preview-bottom"><div><span>{mood.kicker}</span><h3>{mood.title}</h3><p>{mood.description}</p></div><button type="button" onClick={onExplore} className="deng-round-link" aria-label={`Explore stories for ${mood.label.toLowerCase()}`}><ArrowIcon diagonal /></button></div>
          </div>
        </div>
      </section>

      <section className="deng-features deng-container" id="how-it-works" aria-labelledby="deng-features-title">
        <div className="deng-section-overline"><span className="deng-section-number">(03)</span><span>LISTEN YOUR WAY</span><span className="deng-section-rule" /></div>
        <div className="deng-section-heading deng-features-heading"><h2 id="deng-features-title">A little more<br /><em>listening time.</em></h2><p>Thoughtfully made for the way stories fit into real life.</p></div>

        <div className="deng-feature-grid">
          <div className="deng-feature-card deng-feature-card--seamless">
            <div className="deng-feature-header"><span>THE EVERYDAY PLAYER</span><span>01 / 02</span></div>
            <div className="deng-mini-player-art" aria-hidden="true">
              <div className="deng-mini-player"><div className="deng-mini-top"><span>deng.</span><span>•••</span></div><BookCover book={books[0]} /><div className="deng-mini-player-copy"><span>NOW LISTENING</span><strong>The Great Gatsby</strong><small>Chapter I — Audio Preview</small></div><div className="deng-mini-progress"><span /></div><div className="deng-mini-player-control"><span>↶</span><span className="deng-mini-play"><PlayIcon /></span><span>↷</span></div></div>
              <div className="deng-mini-caption">THE STORY GOES WHERE YOU GO. <span>↗</span></div>
            </div>
            <div className="deng-feature-copy"><span className="deng-feature-small">A BETTER WAY TO TUNE IN</span><h3>Your next chapter is<br /><em>always close.</em></h3><p>A quiet morning, the daily commute, a walk without a destination. Find your moment and make it yours.</p></div>
          </div>

          <div className="deng-feature-card deng-feature-card--sound">
            <div className="deng-feature-header"><span>MADE TO MOVE YOU</span><span>02 / 02</span></div>
            <div className="deng-sound-art" aria-hidden="true"><div className="deng-sound-disc"><span className="deng-sound-disc-centre">D.</span></div><div className="deng-sound-label"><span>STORIES IN SOUND</span><SoundBars bars={24} /><span>PUT ON YOUR HEADPHONES. GO SOMEWHERE.</span></div></div>
            <div className="deng-feature-copy"><span className="deng-feature-small">A DIFFERENT KIND OF IMMERSION</span><h3>Let the words<br /><em>take over.</em></h3><p>Set the scene, find your rhythm, and get lost in the feeling of a story well told.</p></div>
          </div>
        </div>
      </section>

      <section className="deng-quote" aria-labelledby="deng-quote-title"><div className="deng-quote-inner deng-container"><div className="deng-quote-kicker"><span>AN INVITATION TO SLOW DOWN</span><span>✳</span></div><h2 id="deng-quote-title">“I forgot where I was going.<br /><em>That's how good the story was.</em>”</h2><div className="deng-quote-bottom"><span>THE FEELING WE'RE HERE FOR</span><span>Illustrative editorial quote</span></div></div></section>

      <section className="deng-join deng-container" id="deng-join" aria-labelledby="deng-join-title">
        <div className="deng-join-inner">
          <div className="deng-join-top"><span>YOUR NEXT FAVORITE THING</span><span><HeadphonesIcon /> DENG AUDIOBOOKS</span></div>
          <div className="deng-join-main"><h2 id="deng-join-title">The next chapter<br />sounds <em>better.</em></h2><div><p>Your own little world of stories is waiting. Find what moves you, and listen your way.</p><button type="button" className="deng-button deng-button--lime" onClick={onPricing}>See membership options <span className="deng-button-icon"><ArrowIcon diagonal /></span></button></div></div>
          <div className="deng-join-bottom"><span>GOOD STORIES ARE WORTH SHARING.</span><span>DENG — STAY FOR THE STORY.</span></div>
          <span className="deng-join-decor" aria-hidden="true">✳</span>
        </div>
      </section>

      <footer className="deng-footer deng-container"><div className="deng-footer-top"><div className="deng-footer-brand"><span className="deng-footer-wordmark">deng<span>.</span></span><p>For every ear.<br />For every imagination.</p></div><div className="deng-footer-links"><div><span>DISCOVER</span><button type="button" onClick={onExplore}>Explore stories</button><a href="#deng-moods" onClick={(event) => jumpToSection(event, 'deng-moods')}>Find your mood</a><button type="button" onClick={onPlaySample}>Listen to a sample</button></div><div><span>DENG</span><button type="button" onClick={onPricing}>Membership</button><a href="#deng-library" onClick={(event) => jumpToSection(event, 'deng-library')}>The library</a><a href="#deng-hero-title" onClick={(event) => jumpToSection(event, 'deng-hero-title')}>Back to the beginning ↗</a></div></div></div><div className="deng-footer-bottom"><span>© {new Date().getFullYear()} DENG. ALL RIGHTS RESERVED.</span><span>MADE FOR THE LOVE OF A GOOD STORY. <span aria-hidden="true">✳</span></span></div></footer>
    </div>
  );
}
