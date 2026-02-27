export const formatPrice = (cents) => {
  if (typeof cents !== 'number' || isNaN(cents)) return '$0.00';
  return `$${(cents / 100).toFixed(2)}`;
};

export const formatDuration = (seconds) => {
  if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) return '0m 0s';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
};

export const formatDate = (isoString) =>
  new Date(isoString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
