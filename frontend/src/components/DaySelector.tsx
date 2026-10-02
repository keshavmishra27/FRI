interface Props {
  value: string;
  onChange: (value: string) => void;
}

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default function DaySelector({ value, onChange }: Props) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-300">
        Day
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="form-input cursor-pointer"
        id="day-selector"
      >
        {DAYS.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
    </div>
  );
}
