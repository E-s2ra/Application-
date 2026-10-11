import { useId } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowRight01Icon, ArrowUpRight01Icon, PlayIcon } from '@hugeicons/core-free-icons'
import { type Book, type Genre, genres, coverFor } from './books'
import './EditorialFeatures.css'

type FeaturedStoryProps = {
  book: Book
  onOpen: (book: Book) => void
  onPlay: (book: Book) => void
}

type GenreIndexProps = {
  onSelect: (genre: Genre) => void
}

const genreNotes: Record<Genre, string> = {
  'Literary Fiction': 'Novels & short fiction',
  Romance: 'Love, relationships & drama',
  Classics: 'Works across generations',
  'Fantasy & Myth': 'Epics & imagined worlds',
  'Personal Growth': 'Strategy & reflection',
  Adventure: 'Journeys & survival',
  Mystery: 'Suspense & the gothic',
}

/**
 * A bookshop-window treatment for the currently featured story.
 * The printed numeral identifies its placement in the discovery edit;
 * the book cover, author, description and duration all come from the catalogue.
 */
export function FeaturedStory({ book, onOpen, onPlay }: FeaturedStoryProps) {
  const headingId = useId()
  const hasSample = Boolean(book.sample)

  return (
    <section className="deng-ed-feature" aria-labelledby={headingId}>
      <div className="deng-ed-feature__main">
        <div className="deng-ed-feature__copy">
          <h2 id={headingId} className="deng-ed-feature__title">{book.title}</h2>

          <div className="deng-ed-feature__author"><strong>{book.author}</strong></div>

          <p className="deng-ed-feature__synopsis">{book.description}</p>

          <div className="deng-ed-feature__actions">
            <button
              className="deng-ed-feature__listen"
              type="button"
              onClick={() => onPlay(book)}
              disabled={!hasSample}
            >
              <span className="deng-ed-feature__listen-icon" aria-hidden="true">
                <HugeiconsIcon icon={PlayIcon} size={20} strokeWidth={2.1} />
              </span>
              <span>{hasSample ? 'Listen to preview' : 'Preview unavailable'}</span>
            </button>
            <button className="deng-ed-feature__details" type="button" onClick={() => onOpen(book)}>
              Book details
              <HugeiconsIcon icon={ArrowRight01Icon} size={22} strokeWidth={1.7} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="deng-ed-feature__stage">
          <div className="deng-ed-feature__accent" aria-hidden="true" />
          <div className="deng-ed-feature__book">
            <div className="deng-ed-feature__book-spine" aria-hidden="true" />
            <img
              className="deng-ed-feature__cover"
              src={coverFor(book)}
              alt={`Cover artwork for ${book.title}`}
              loading="eager"
              decoding="async"
            />
          </div>
        </div>
      </div>

    </section>
  )
}

/**
 * A tactile reference-book index. Every row is a full keyboard-operable button
 * and retains the exact Genre value required by the catalogue filters.
 */
export function GenreIndex({ onSelect }: GenreIndexProps) {
  const headingId = useId()

  return (
    <section className="deng-ed-index" aria-labelledby={headingId}>
      <div className="deng-ed-index__intro">
        <div className="deng-ed-index__edition">
          <span>THE DIRECTORY</span>
          <span>INDEX / {String(genres.length).padStart(2, '0')}</span>
        </div>
        <h2 id={headingId} className="deng-ed-index__heading">
          Browse<br />
          <em>by</em><br />
          <span>subject.</span>
        </h2>
        <p className="deng-ed-index__description">
          Seven sections, arranged for a quieter way to browse.
        </p>
        <span className="deng-ed-index__footnote">SELECT A SUBJECT <span aria-hidden="true">↘</span></span>
      </div>

      <div className="deng-ed-index__directory">
        <div className="deng-ed-index__columns" aria-hidden="true">
          <span>NO.</span>
          <span>SUBJECT / GENRE</span>
          <span>OPEN</span>
        </div>
        <ol className="deng-ed-index__list">
          {genres.map((genre, index) => (
            <li className="deng-ed-index__item" key={genre}>
              <button
                type="button"
                className="deng-ed-index__entry"
                onClick={() => onSelect(genre)}
                aria-label={`Explore ${genre} audiobooks`}
              >
                <span className="deng-ed-index__number">{String(index + 1).padStart(2, '0')}</span>
                <span className="deng-ed-index__entry-copy">
                  <span className="deng-ed-index__genre">{genre}</span>
                  <span className="deng-ed-index__note">{genreNotes[genre]}</span>
                </span>
                <span className="deng-ed-index__arrow" aria-hidden="true">
                  <HugeiconsIcon icon={ArrowUpRight01Icon} size={33} strokeWidth={1.35} />
                </span>
              </button>
            </li>
          ))}
        </ol>
        <div className="deng-ed-index__endmark" aria-hidden="true">
          <span>END OF INDEX</span>
          <span>◇ &nbsp; DENG</span>
        </div>
      </div>
    </section>
  )
}
