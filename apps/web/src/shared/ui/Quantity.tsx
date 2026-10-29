export default function Quantity({
  value,
  onChange
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="quantity">
      <button
        type="button"
        aria-label="Giảm số lượng"
        disabled={value <= 1}
        onClick={() => onChange(value - 1)}
      >
        −
      </button>
      <output aria-label="Số lượng">{value}</output>
      <button
        type="button"
        aria-label="Tăng số lượng"
        disabled={value >= 10}
        onClick={() => onChange(value + 1)}
      >
        +
      </button>
    </div>
  );
}
