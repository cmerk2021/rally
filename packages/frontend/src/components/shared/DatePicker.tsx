import { Input } from "@/components/ui/input";

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  type?: "date" | "datetime-local";
  className?: string;
  disabled?: boolean;
}

export function DatePicker({ value, onChange, type = "date", className, disabled }: DatePickerProps) {
  // Convert ISO to the value the input expects
  const inputValue = (() => {
    if (!value) return "";
    try {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return "";
      if (type === "datetime-local") {
        const pad = (n: number) => String(n).padStart(2, "0");
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      }
      return d.toISOString().slice(0, 10);
    } catch {
      return "";
    }
  })();

  return (
    <Input
      type={type}
      className={className}
      disabled={disabled}
      value={inputValue}
      onChange={(e) => {
        const v = e.target.value;
        if (!v) {
          onChange("");
          return;
        }
        const d = new Date(v);
        onChange(d.toISOString());
      }}
    />
  );
}
