import { useState, type MouseEvent } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowDown01Icon, ArrowRight01Icon, ArrowUpRight01Icon, PlayIcon } from '@hugeicons/core-free-icons';
import { books, coverFor, type Book } from './books';
import './Marketing.css';

export type MarketingProps = {
  onExplore: () => void;
  onPricing: () => void;
  onPlaySample: () => void;
};

const byId = (id: string) => books.find(book => book.id === id)!;
const gatsby = byId('great-gatsby');
const pride = byId('pride-prejudice');
const odyssey = byId('odyssey');
const garden = byId('secret-garden');
const littleWomen = byId('little-women');
const artOfWar = byId('art-of-war');
const selectedBooks = [gatsby, pride, odyssey, garden, littleWomen, artOfWar];

function Cover({ book, className = '', eager = false }: { book: Book; className?: string; eager?: boolean }) {
  return <img className={`de-cover ${className}`} src={coverFor(book)} alt={`Cover of ${book.title} by ${book.author}`} loading={eager ? 'eager' : 'lazy'} decoding="async" />;
}

function Waveform({ count = 53 }: { count?: number }) {
  return <span className="de-waveform" aria-hidden="true">{Array.from({ length: count }, (_, index) => {
    const swell = .32 + Math.abs(Math.sin(index * .13)) * .68;
    const variation = Math.abs(Math.sin(index * 1.9) * Math.cos(index * .53));
    return <i key={index} style={{ height: `${16 + Math.round(variation * swell * 84)}%` }} />;
  })}</span>;
}

function JumpLink({ id, children }: { id: string; children: React.ReactNode }) {
  const jump = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const behavior: ScrollBehavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    if (id === 'de-title') window.scrollTo({ top: 0, behavior });
    else document.getElementById(id)?.scrollIntoView({ behavior, block: 'start' });
  };
  return <a href={'#' + id} onClick={jump}>{children}</a>;
}

export default function Marketing({ onExplore, onPricing, onPlaySample }: MarketingProps) {
  const [selected, setSelected] = useState(gatsby.id);
  const preview = selectedBooks.find(book => book.id === selected) ?? gatsby;

  return (
    <div className="de-house">
      <div>
        <section className="de-hero de-wrap" aria-labelledby="de-title">
          <div className="de-hero-header"><span>001 <i /> DENG EDITIONS</span><span>A LITERARY HOUSE FOR LISTENING</span></div>

          <div className="de-hero-poster">
            <div className="de-hero-number" aria-hidden="true">AUDIO / NO. 01</div>
            <div className="de-hero-heading">
              <h1 id="de-title">A book<br />has a<br /><em>voice.</em></h1>
            </div>

            <div className="de-shelf" aria-label="The Great Gatsby, Pride and Prejudice, The Odyssey, and The Secret Garden editions">
              <div className="de-shelf-type" aria-hidden="true">D<span> E</span>N<span>G</span></div>
              <div className="de-shelf-object de-shelf-garden"><Cover book={garden} eager /></div>
              <div className="de-shelf-object de-shelf-pride"><Cover book={pride} eager /></div>
              <div className="de-shelf-spine de-shelf-spine-a" aria-hidden="true">FITZGERALD · 1925</div>
              <div className="de-shelf-object de-shelf-gatsby"><Cover book={gatsby} eager /></div>
              <div className="de-shelf-spine de-shelf-spine-b" aria-hidden="true">DENG / 001</div>
              <div className="de-shelf-object de-shelf-odyssey"><Cover book={odyssey} eager /></div>
              <div className="de-shelf-ground" aria-hidden="true" />
              <button type="button" className="de-sound-tape" onClick={onPlaySample} aria-label="Play the Great Gatsby chapter one audio sample">
                <span>LISTEN / 001</span>
                <Waveform count={30} />
                <HugeiconsIcon icon={PlayIcon} size={22} strokeWidth={1.8} />
              </button>
            </div>
            <div className="de-hero-end">
              <div className="de-hero-description">
                <p>Literature, in another form.</p>
                <span>Classic books. Real voices. The first chapter is on us.</span>
              </div>
              <button type="button" className="de-dark-cta" onClick={onExplore}>Open the catalog <HugeiconsIcon icon={ArrowUpRight01Icon} size={22} strokeWidth={1.5}/></button>
            </div>
          </div>

          <div className="de-hero-bottom">
            <span>REISSUED FOR YOUR EARS</span>
            <JumpLink id="de-library">THE FIRST EDITION <HugeiconsIcon icon={ArrowDown01Icon} size={18} strokeWidth={1.5} /></JumpLink>
          </div>
        </section>

        <section className="de-listen" id="how-it-works" aria-labelledby="de-listen-title">
          <div className="de-wrap de-listen-inner">
            <div className="de-listen-copy">
              <span className="de-marginal">I. THE LISTENING ROOM</span>
              <h2 id="de-listen-title">First<br />chapter,<br /><em>out loud.</em></h2>
              <p>Fitzgerald's opening chapter is ready to hear. Play a real recording in your browser, with no account required.</p>
              <button type="button" className="de-play-link" onClick={onPlaySample}>
                <span className="de-play-square"><HugeiconsIcon icon={PlayIcon} size={27} strokeWidth={1.7} /></span>
                <span><strong>Hear chapter one</strong><small>The Great Gatsby · F. Scott Fitzgerald</small></span>
                <HugeiconsIcon icon={ArrowUpRight01Icon} size={25} strokeWidth={1.4} />
              </button>
            </div>
            <div className="de-listen-composition" aria-label="A visual study of The Great Gatsby audio edition">
              <span className="de-listen-backtype" aria-hidden="true">Aa</span>
              <div className="de-listen-jacket"><Cover book={gatsby} /></div>
              <div className="de-listen-sheet" aria-hidden="true">
                <span>THE GREAT GATSBY</span><i /><i /><i /><i /><i /><i /><i />
                <b>CHAPTER I</b>
              </div>
              <div className="de-listen-sound"><span>01 / CHAPTER I</span><Waveform /><span>LIBRIVOX PREVIEW</span></div>
            </div>
          </div>
          <div className="de-listen-tail de-wrap"><span>GOOD WRITING IS WORTH HEARING.</span><span>GATSBY / CHAPTER I / PUBLIC RECORDING</span></div>
        </section>

        <section className="de-library de-wrap" id="de-library" aria-labelledby="de-library-title">
          <div className="de-section-ruler"><span>II. THE BOOKSHELF</span><span>12 BOOKS IN THE FIRST CATALOG</span></div>
          <div className="de-library-heading">
            <h2 id="de-library-title">An edit<br /><em>of classics.</em></h2>
            <p>An opening edition of twelve public-domain books. Two recorded first chapters are available to hear.</p>
          </div>
          <div className="de-library-layout">
            <div className="de-library-display" aria-live="polite" aria-label={`Featured cover: ${preview.title}`}>
              <span className="de-library-serial">DENG / SELECTED WORKS</span>
              <div className="de-library-art" key={preview.id}><Cover book={preview} /></div>
              <div className="de-library-caption"><span>{preview.author}</span><span>{String(selectedBooks.findIndex(b => b.id === preview.id) + 1).padStart(2, '0')} / 06</span></div>
            </div>
            <div className="de-library-rows">
              {selectedBooks.map((book, index) => (
                <button key={book.id} type="button"
                  className={'de-library-row' + (selected === book.id ? ' de-library-row-selected' : '')}
                  onMouseEnter={() => setSelected(book.id)}
                  onFocus={() => setSelected(book.id)}
                  onClick={onExplore}
                  aria-label={'Browse ' + book.title + ' in the catalog'}>
                  <span className="de-library-number">{String(index + 1).padStart(2, '0')}</span>
                  <Cover book={book} className="de-library-row-cover" />
                  <span className="de-library-item"><strong>{book.title}</strong><small>{book.author}</small></span>
                  <span className="de-library-genre">{book.sample ? 'AUDIO PREVIEW' : book.genre}</span>
                  <HugeiconsIcon icon={ArrowUpRight01Icon} size={20} strokeWidth={1.5}/>
                </button>
              ))}
              <button type="button" className="de-library-more" onClick={onExplore}>Explore all twelve titles <HugeiconsIcon icon={ArrowRight01Icon} size={21} strokeWidth={1.6}/></button>
            </div>
          </div>
        </section>

        <section className="de-letter" aria-labelledby="de-letter-title">
          <div className="de-wrap">
            <div className="de-section-ruler"><span>III. A NOTE FROM DENG</span><span>ON READING IN MOTION</span></div>
            <div className="de-letter-layout">
              <h2 id="de-letter-title">Not every<br />story needs<br /><em>a chair.</em></h2>
              <div className="de-letter-body">
                <p>Books find their way into every part of life. So why should listening to one feel like a separate occasion?</p>
                <div className="de-letter-rule" />
                <p>We're beginning with public-domain classics: twelve books to explore, and recorded first-chapter samples of <i>The Great Gatsby</i> and <i>Pride and Prejudice</i> to hear now. More voices are still to come.</p>
                <span className="de-letter-signature">Deng — the first edition</span>
              </div>
            </div>
          </div>
        </section>

        <section className="de-membership" aria-labelledby="de-membership-title">
          <div className="de-wrap">
            <div className="de-section-ruler"><span>IV. WHAT COMES NEXT</span><span>DENG PLUS / IN DEVELOPMENT</span></div>
            <div className="de-membership-layout">
              <h2 id="de-membership-title">The next<br /><em>chapter.</em></h2>
              <div className="de-membership-right">
                <p>Free previews are here. An expanded listening library and proposed $4/month membership are next.</p>
                <button type="button" className="de-membership-link" onClick={onPricing}>See membership details <HugeiconsIcon icon={ArrowUpRight01Icon} size={26} strokeWidth={1.6}/></button>
                <small>Membership is not live. No payment is collected.</small>
              </div>
            </div>
          </div>
        </section>
      </div>

      <footer className="de-footer de-wrap">
        <div className="de-footer-head">
          <p>A home for the<br /><em>spoken page.</em></p>
          <nav aria-label="Footer">
            <button type="button" onClick={onExplore}>Library <HugeiconsIcon icon={ArrowUpRight01Icon} size={17}/></button>
            <button type="button" onClick={onPlaySample}>Listen <HugeiconsIcon icon={ArrowUpRight01Icon} size={17}/></button>
            <button type="button" onClick={onPricing}>Membership <HugeiconsIcon icon={ArrowUpRight01Icon} size={17}/></button>
            <JumpLink id="de-title">Back to top <HugeiconsIcon icon={ArrowUpRight01Icon} size={17}/></JumpLink>
          </nav>
        </div>
        <div className="de-footer-mark" aria-label="DENG">DENG<span>®</span></div>
        <div className="de-footer-colophon"><span>© {new Date().getFullYear()} DENG</span><span>INDEPENDENT LITERARY AUDIO</span><span>ISSUE ONE · THE CLASSICS</span></div>
      </footer>
    </div>
  );
}
