import { type MouseEvent } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowUpRight01Icon, PlayIcon } from '@hugeicons/core-free-icons';
import { books, coverFor, type Book } from './books';
import './Marketing.css';

export type MarketingProps = {
  onExplore: () => void;
  onPricing: () => void;
  onPlaySample: () => void;
};

const selectedIds = ['great-gatsby', 'pride-prejudice', 'odyssey', 'secret-garden', 'little-women', 'art-of-war'];
const selectedBooks = selectedIds.map(id => books.find(book => book.id === id)).filter((book): book is Book => Boolean(book));
const getBook = (id: string) => selectedBooks.find(book => book.id === id)!;

function Cover({ book, className = '', eager = false, decorative = false }: { book: Book; className?: string; eager?: boolean; decorative?: boolean }) {
  return (
    <img
      className={'de-cover ' + className}
      src={coverFor(book)}
      alt={decorative ? '' : 'Cover of ' + book.title}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
    />
  );
}

function BackToTop({ children }: { children: React.ReactNode }) {
  const scroll = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const behavior: ScrollBehavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    window.scrollTo({ top: 0, behavior });
  };
  return <a href="#de-title" onClick={scroll}>{children}</a>;
}

export default function Marketing({ onExplore, onPricing, onPlaySample }: MarketingProps) {
  return (
    <div className="de-house">
      <section className="de-hero de-wrap" aria-labelledby="de-title">
        <div className="de-hero-poster">
          <h1 id="de-title">A book<br />has a<br /><em>voice.</em></h1>

          <div className="de-shelf" role="group" aria-label="Physical arrangement of The Great Gatsby, Pride and Prejudice, The Odyssey and The Secret Garden book covers">
            <div className="de-shelf-object de-shelf-garden"><Cover book={getBook('secret-garden')} eager decorative /></div>
            <div className="de-shelf-object de-shelf-pride"><Cover book={getBook('pride-prejudice')} eager decorative /></div>
            <div className="de-shelf-spine de-shelf-spine-a" aria-hidden="true" />
            <div className="de-shelf-object de-shelf-gatsby"><Cover book={getBook('great-gatsby')} eager decorative /></div>
            <div className="de-shelf-spine de-shelf-spine-b" aria-hidden="true" />
            <div className="de-shelf-object de-shelf-odyssey"><Cover book={getBook('odyssey')} eager decorative /></div>
            <div className="de-shelf-ground" aria-hidden="true" />
            <button type="button" className="de-sound-tape" onClick={onPlaySample} aria-label="Play The Great Gatsby chapter one sample">
              <span><strong>Play chapter one</strong><small>The Great Gatsby</small></span>
              <HugeiconsIcon icon={PlayIcon} size={24} strokeWidth={1.8} />
            </button>
          </div>

          <div className="de-hero-end">
            <p>Twelve classic books. Two recorded previews. A library in progress.</p>
            <button type="button" className="de-dark-cta" onClick={onExplore}>Explore books <HugeiconsIcon icon={ArrowUpRight01Icon} size={20} strokeWidth={1.6} /></button>
          </div>
        </div>
      </section>

      <section className="de-listen" id="how-it-works" aria-labelledby="de-listen-title">
        <div className="de-wrap de-listen-inner">
          <div>
            <h2 id="de-listen-title">Start with<br /><em>a chapter.</em></h2>
          </div>
          <div className="de-listen-details">
            <p>Listen to the first chapter of <cite>The Great Gatsby</cite> in your browser. No account needed.</p>
            <button type="button" className="de-play-link" onClick={onPlaySample}>
              <HugeiconsIcon icon={PlayIcon} size={21} strokeWidth={1.7} />
              Hear the sample
            </button>
          </div>
        </div>
      </section>

      <section className="de-library de-wrap" id="de-library" aria-labelledby="de-library-title">
        <div className="de-library-intro">
          <h2 id="de-library-title">The<br /><em>collection.</em></h2>
          <p>Six selected titles from our opening catalog of twelve.</p>
        </div>

        <div className="de-library-list">
          {selectedBooks.map(book => (
            <button type="button" key={book.id} className="de-library-row" onClick={onExplore} aria-label={'Browse ' + book.title}>
              <Cover book={book} className="de-library-row-cover" />
              <span className="de-library-item"><strong>{book.title}</strong><small>{book.author}</small></span>
              {book.sample && <span className="de-preview-label">Audio preview</span>}
            </button>
          ))}
          <button type="button" className="de-library-more" onClick={onExplore}>
            View all books <HugeiconsIcon icon={ArrowUpRight01Icon} size={22} strokeWidth={1.6} />
          </button>
        </div>
      </section>

      <section className="de-membership" aria-labelledby="de-membership-title">
        <div className="de-wrap de-membership-layout">
          <h2 id="de-membership-title">More<br /><em>to come.</em></h2>
          <div>
            <p>DENG Plus is planned. Free chapter previews are available now.</p>
            <button type="button" className="de-membership-link" onClick={onPricing}>
              Membership details <HugeiconsIcon icon={ArrowUpRight01Icon} size={21} strokeWidth={1.6} />
            </button>
            <small>Subscriptions and checkout are not yet available.</small>
          </div>
        </div>
      </section>

      <footer className="de-footer de-wrap">
        <div className="de-footer-head">
          <nav aria-label="Footer">
            <button type="button" onClick={onExplore}>Library</button>
            <button type="button" onClick={onPricing}>Membership</button>
            <BackToTop>Back to top</BackToTop>
          </nav>
        </div>
        <div className="de-footer-mark" aria-label="DENG">DENG</div>
        <div className="de-footer-colophon"><span>© {new Date().getFullYear()} DENG</span></div>
      </footer>
    </div>
  );
}
