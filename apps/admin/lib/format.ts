// Prices are whole rupees (docs/database.md: integer PKR).
const RUPEES = new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 });

export const formatPrice = (rupees: number) => `Rs ${RUPEES.format(rupees)}`;

// Dates in the admin: "5 Nov 2026" and "5 Nov 2026, 14:05", in Pakistan time.
const DAY = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'Asia/Karachi',
});
const DAY_TIME = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Asia/Karachi',
});

export const formatDate = (date: Date) => DAY.format(date);
export const formatDateTime = (date: Date) => DAY_TIME.format(date);
