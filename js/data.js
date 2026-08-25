const ALIASES = {
  meditations: "marcus-aurelius-meditations",
  "the-master-and-margarita": "master-and-margarita",
  "en-folkefiende": "enemy-of-the-people",
  "the-death-of-ivan-ilyich": "death-of-ivan-ilyich",
};

export function resolveId(id) {
  if (!id) return null;
  return ALIASES[id] || id;
}

export async function loadAtlas() {
  const response = await fetch("data/literary-journey.json");
  if (!response.ok) {
    throw new Error("The atlas could not be opened.");
  }
  const data = await response.json();
  return indexAtlas(data);
}

function indexAtlas(data) {
  const booksById = new Map();
  data.books.forEach((book, index) => {
    book.order = index + 1;
    booksById.set(book.id, book);
  });

  const getBook = (id) => booksById.get(resolveId(id)) || null;

  const authorsById = new Map(data.authors.map((author) => [author.id, author]));
  const worldsById = new Map(data.literaryWorlds.map((world) => [world.id, world]));
  const themesById = new Map(data.themes.map((theme) => [theme.id, theme]));

  const themes = data.themes.map((theme) => ({
    ...theme,
    books: theme.books.map(resolveId).filter((id) => booksById.has(id)),
  }));

  const literaryWorlds = data.literaryWorlds.map((world) => ({
    ...world,
    books: world.books.map(resolveId).filter((id) => booksById.has(id)),
  }));

  return {
    meta: data.meta,
    books: data.books,
    booksById,
    getBook,
    authors: data.authors,
    authorsById,
    themes,
    themesById,
    literaryWorlds,
    worldsById,
    countries: data.countries,
    readingMilestones: data.readingMilestones,
  };
}

export function locationLabel(book) {
  const parts = [book.city, book.region, book.country].filter(Boolean);
  const unique = [...new Set(parts)];
  return unique.join(" · ") || null;
}

export function formatDate(iso) {
  if (!iso) return null;
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function typeLabel(type) {
  if (!type) return null;
  const label = type.replace(/-/g, " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}
