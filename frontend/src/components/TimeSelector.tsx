interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
  id: string;
}

export default function TimeSelector({ label, value, onChange, id }: Props) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-slate-300"
      >
        {label}
      </label>
      <input
        type="time"
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="form-input"
      />
    </div>
  );
}
