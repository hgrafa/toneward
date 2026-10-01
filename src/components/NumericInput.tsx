import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";

interface NumericInputProps {
	value: number;
	onChange: (value: number) => void;
	min: number;
	max: number;
	label: string;
	className?: string;
}

export function NumericInput({
	value,
	onChange,
	min,
	max,
	label,
	className,
}: NumericInputProps) {
	const [draft, setDraft] = useState(String(value));
	useEffect(() => setDraft(String(value)), [value]);

	const commit = (text: string) => {
		const parsed = Number(text);
		if (text.trim() === "" || !Number.isInteger(parsed)) {
			setDraft(String(value));
			return;
		}
		const next = Math.min(max, Math.max(min, parsed));
		setDraft(String(next));
		if (next !== value) onChange(next);
	};

	return (
		<Input
			type="number"
			inputMode="numeric"
			min={min}
			max={max}
			step={1}
			aria-label={label}
			value={draft}
			onFocus={(event) => event.currentTarget.select()}
			onChange={(event) => setDraft(event.target.value)}
			onBlur={(event) => commit(event.currentTarget.value)}
			onKeyDown={(event) => {
				if (event.key === "Enter") {
					event.currentTarget.blur();
				} else if (event.key === "Escape") {
					event.currentTarget.value = String(value);
					setDraft(String(value));
					event.currentTarget.blur();
				}
			}}
			className={`[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${className ?? ""}`}
		/>
	);
}
