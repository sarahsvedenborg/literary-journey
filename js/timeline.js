import { formatDate } from "./data.js";

const YEAR_START = new Date("2026-01-01T00:00:00");
const YEAR_END = new Date("2026-12-31T00:00:00");
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function renderTimeline(atlas, { onOpenBook }) {
  const root = document.getElementById("timeline-root");
  const dated = atlas.books.filter((book) => book.reading?.start);
  const undated = atlas.books.filter((book) => !book.reading?.start);
  const today = atlas.meta.lastUpdated ? new Date(`${atlas.meta.lastUpdated}T00:00:00`) : null;

  const lanes = assignLanes(dated, today);

  root.innerHTML = `
    <section class="gantt" aria-label="Dated readings in 2026">
      <div class="gantt-inner" id="gantt-inner">
        <div class="month-labels" style="grid-template-columns: repeat(12, 1fr)">
          ${MONTHS.map((month) => `<span>${month}</span>`).join("")}
        </div>
        <div class="lanes" style="position:relative">
          ${
            today
              ? `<div class="today-line" title="Last inscribed ${atlas.meta.lastUpdated}" style="left:${pct(today) * 100}%"></div>`
              : ""
          }
          ${lanes
            .map(
              (lane) => `
                <div class="lane">
                  ${lane
                    .map((book) => {
                      const start = new Date(`${book.reading.start}T00:00:00`);
                      const end = book.reading.end
                        ? new Date(`${book.reading.end}T00:00:00`)
                        : today || YEAR_END;
                      const left = pct(start) * 100;
                      const right = pct(end) * 100;
                      const width = Math.max(right - left, 1.8);
                      const open = !book.reading.end;
                      return `<button class="span-bar${open ? " is-open" : ""}" data-book="${book.id}" style="left:${left}%;width:${width}%" title="${escapeHtml(book.title)}">${escapeHtml(book.title)}</button>`;
                    })
                    .join("")}
                </div>`
            )
            .join("")}
        </div>
      </div>
    </section>
    <section>
      <div class="plate-header">
        <h2>Volumes without dates</h2>
        <p>${undated.length} entries remain outside the calendar. Duration is shown only when it was recorded.</p>
      </div>
      <div class="undated">
        ${undated
          .map((book) => {
            const duration = book.readingDurationNote
              || (book.reading?.durationDays ? `${book.reading.durationDays} days` : "");
            return `
              <button class="undated-card" data-book="${book.id}" type="button">
                <strong>${escapeHtml(book.title)}</strong>
                <em>${escapeHtml(book.author || "Author not recorded")}</em>
                ${duration ? `<span class="duration-note">${escapeHtml(duration)}</span>` : ""}
              </button>`;
          })
          .join("")}
      </div>
    </section>
    <section>
      <div class="plate-header">
        <h2>Milestones</h2>
        <p>Only the recorded crossings of a volume — entered, or finished.</p>
      </div>
      <div class="undated">
        ${atlas.readingMilestones
          .map((item) => {
            const book = atlas.getBook(item.bookId);
            return `
              <button class="undated-card" data-book="${item.bookId}" type="button">
                <strong>${escapeHtml(item.label)}</strong>
                <em>${formatDate(item.date)}${book ? ` · ${escapeHtml(book.title)}` : ""}</em>
              </button>`;
          })
          .join("")}
      </div>
    </section>
  `;

  root.querySelectorAll("[data-book]").forEach((el) => {
    el.addEventListener("click", () => onOpenBook(el.getAttribute("data-book")));
  });
}

function assignLanes(books, today) {
  const fallbackEnd = (today || YEAR_END).getTime();
  const items = books
    .map((book) => ({
      book,
      start: new Date(`${book.reading.start}T00:00:00`).getTime(),
      end: book.reading.end
        ? new Date(`${book.reading.end}T00:00:00`).getTime()
        : fallbackEnd,
    }))
    .sort((a, b) => a.start - b.start);

  const lanes = [];
  const laneEnds = [];
  items.forEach((item) => {
    let placed = false;
    for (let i = 0; i < lanes.length; i += 1) {
      if (item.start >= laneEnds[i]) {
        lanes[i].push(item.book);
        laneEnds[i] = item.end;
        placed = true;
        break;
      }
    }
    if (!placed) {
      lanes.push([item.book]);
      laneEnds.push(item.end);
    }
  });
  return lanes;
}

function pct(date) {
  const t = date.getTime();
  return (t - YEAR_START.getTime()) / (YEAR_END.getTime() - YEAR_START.getTime());
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
