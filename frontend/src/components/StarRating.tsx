export function StarRating({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="star-rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          onClick={() => onChange(star)}
          aria-label={`${star}점`}
          className={star <= value ? 'filled' : undefined}
        >
          {star <= value ? '★' : '☆'}
        </button>
      ))}
    </div>
  );
}
