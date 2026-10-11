export type Genre = 'Literary Fiction' | 'Romance' | 'Classics' | 'Fantasy & Myth' | 'Personal Growth' | 'Adventure' | 'Mystery'

export type Book = {
  id: string
  title: string
  author: string
  narrator: string
  genre: Genre
  duration: string
  minutes: number
  year: number
  rating: number
  description: string
  editorial: string
  tags: string[]
  chapters: string[]
  featured?: boolean
  sample?: string
}

const gatsbySample = 'https://ia903403.us.archive.org/34/items/greatgatsby_2101_librivox/greatgatsby_01_fitzgerald_128kb.mp3'
const prideSample = 'https://ia801506.us.archive.org/20/items/prideandprejudice_18_austen_64kb/prideandprejudice_01_austen_64kb.mp3'

export const books: Book[] = [
  { id: 'great-gatsby', title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', narrator: 'Kara Shallenberg', genre: 'Literary Fiction', duration: '5h 38m', minutes: 338, year: 1925, rating: 4.9, featured: true, sample: gatsbySample, description: 'In the glittering summer of 1922, a mysterious millionaire throws extravagant parties while chasing a dream that may already be lost.', editorial: 'An unforgettable portrait of longing, ambition and the beautiful illusions we create for ourselves. A novel that sounds as alive today as it did a century ago.', tags: ['Bestseller', 'Editor’s pick'], chapters: ['Chapter I', 'Chapter II', 'Chapter III', 'Chapter IV', 'Chapter V', 'Chapter VI', 'Chapter VII', 'Chapter VIII', 'Chapter IX'] },
  { id: 'pride-prejudice', title: 'Pride and Prejudice', author: 'Jane Austen', narrator: 'LibriVox readers', genre: 'Romance', duration: '11h 10m', minutes: 670, year: 1813, rating: 4.9, sample: prideSample, description: 'Elizabeth Bennet must navigate manners, misconceptions and matters of the heart in one of literature’s most beloved romances.', editorial: 'Witty, warm and endlessly rewarding. Jane Austen’s observations about love and first impressions are as sharp as ever.', tags: ['Most loved', 'Romance'], chapters: ['Chapter 1', 'Chapter 2', 'Chapter 3', 'Chapter 4', 'Chapter 5', 'Chapter 6'] },
  { id: 'metamorphosis', title: 'The Metamorphosis', author: 'Franz Kafka', narrator: 'DENG Editions', genre: 'Literary Fiction', duration: '2h 14m', minutes: 134, year: 1915, rating: 4.7, description: 'Gregor Samsa wakes up one morning to discover that his life, and his body, have changed beyond recognition.', editorial: 'A surreal masterpiece about identity, isolation and what it means to be human.', tags: ['Short listen', 'Modern classic'], chapters: ['The Transformation', 'A Changed World', 'The Aftermath'] },
  { id: 'dorian-gray', title: 'The Picture of Dorian Gray', author: 'Oscar Wilde', narrator: 'DENG Editions', genre: 'Mystery', duration: '8h 22m', minutes: 502, year: 1890, rating: 4.8, description: 'A young man remains impossibly beautiful while a secret portrait carries the weight of every reckless choice he makes.', editorial: 'A sumptuous Gothic story of beauty, temptation and the price of eternal youth.', tags: ['Gothic', 'Literary'], chapters: ['The Portrait', 'The Wish', 'A Hidden Life', 'The Reckoning'] },
  { id: 'little-women', title: 'Little Women', author: 'Louisa May Alcott', narrator: 'DENG Editions', genre: 'Classics', duration: '17h 16m', minutes: 1036, year: 1868, rating: 4.9, description: 'The March sisters grow into themselves amid family, friendship, creativity and the small joys of everyday life.', editorial: 'An intimate, spirited celebration of sisterhood and growing up.', tags: ['Comfort listen', 'Family'], chapters: ['Playing Pilgrims', 'A Merry Christmas', 'The Laurence Boy', 'Burdens', 'Being Neighborly'] },
  { id: 'art-of-war', title: 'The Art of War', author: 'Sun Tzu', narrator: 'DENG Editions', genre: 'Personal Growth', duration: '1h 21m', minutes: 81, year: 500, rating: 4.7, description: 'An enduring guide to strategy, discipline and the art of understanding the world around you.', editorial: 'Ancient wisdom distilled into short chapters for thoughtful, purposeful listening.', tags: ['Short listen', 'Strategy'], chapters: ['Laying Plans', 'Waging War', 'Attack by Stratagem', 'Tactical Dispositions'] },
  { id: 'time-machine', title: 'The Time Machine', author: 'H. G. Wells', narrator: 'DENG Editions', genre: 'Fantasy & Myth', duration: '3h 32m', minutes: 212, year: 1895, rating: 4.6, description: 'A Victorian inventor ventures into an unimaginably distant future and discovers a civilization divided in two.', editorial: 'The compact, thrilling science fiction adventure that made time travel a literary obsession.', tags: ['Science fiction', 'Adventure'], chapters: ['The Inventor', 'Into the Future', 'The Eloi', 'The Morlocks'] },
  { id: 'secret-garden', title: 'The Secret Garden', author: 'Frances Hodgson Burnett', narrator: 'DENG Editions', genre: 'Classics', duration: '6h 12m', minutes: 372, year: 1911, rating: 4.8, description: 'An overlooked garden becomes the setting for unexpected friendship, healing and new beginnings.', editorial: 'A magical, restorative story about the power of care and growing things.', tags: ['Feel good', 'Family'], chapters: ['There Is No One Left', 'Mistress Mary', 'Across the Moor', 'The Key'] },
  { id: 'odyssey', title: 'The Odyssey', author: 'Homer', narrator: 'DENG Editions', genre: 'Fantasy & Myth', duration: '12h 45m', minutes: 765, year: -700, rating: 4.8, description: 'After the fall of Troy, Odysseus faces monsters, gods and the endless sea on a journey back to his home.', editorial: 'Adventure in its original form: a story of courage, longing, cunning and return.', tags: ['Epic', 'Mythology'], chapters: ['A Goddess Intervenes', 'Telemachus', 'The Journey', 'The Cyclops', 'Coming Home'] },
  { id: 'frankenstein', title: 'Frankenstein', author: 'Mary Shelley', narrator: 'DENG Editions', genre: 'Mystery', duration: '8h 7m', minutes: 487, year: 1818, rating: 4.8, description: 'An ambitious scientist succeeds in creating life and confronts consequences beyond his imagination.', editorial: 'A haunting meditation on creation, responsibility and the human need for belonging.', tags: ['Gothic', 'Philosophical'], chapters: ['Letters', 'The Student', 'The Creation', 'The Creature', 'The Reckoning'] },
  { id: 'jane-eyre', title: 'Jane Eyre', author: 'Charlotte Brontë', narrator: 'DENG Editions', genre: 'Romance', duration: '18h 31m', minutes: 1111, year: 1847, rating: 4.9, description: 'A fiercely independent woman finds love and a troubling secret at the mysterious Thornfield Hall.', editorial: 'Tender, defiant and beautifully atmospheric. A heroine whose voice echoes through generations.', tags: ['Romance', 'Gothic'], chapters: ['Gateshead', 'Lowood', 'Thornfield', 'A Secret', 'A New Life'] },
  { id: 'call-of-the-wild', title: 'The Call of the Wild', author: 'Jack London', narrator: 'DENG Editions', genre: 'Adventure', duration: '3h 19m', minutes: 199, year: 1903, rating: 4.7, description: 'A dog named Buck is taken from his comfortable home into the brutal, breathtaking wilds of the Yukon.', editorial: 'A vivid tale of survival, instinct and the pull of wilderness.', tags: ['Nature', 'Adventure'], chapters: ['Into the Primitive', 'The Law of Club and Fang', 'The Dominant Primordial Beast', 'The Sounding of the Call'] },
]

export const genres: Genre[] = ['Literary Fiction', 'Romance', 'Classics', 'Fantasy & Myth', 'Personal Growth', 'Adventure', 'Mystery']
export const coverFor = (book: Pick<Book, 'id'>) => `/covers/${book.id}.svg`
