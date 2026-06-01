import { useInput } from "@/hooks/useFretboardContext";

export function Editor() {
	const { inputText, setInputText, parseError } = useInput();

	return (
		<div className="flex flex-col gap-2">
			<label
				htmlFor="note-input"
				className="text-sm font-medium text-muted-foreground"
			>
				Notes or intervals
			</label>
			<textarea
				id="note-input"
				value={inputText}
				onChange={(e) => setInputText(e.target.value)}
				placeholder={`Enter notes: C E G Bb\nor intervals:\nroot: A\n1 b3 4 5 b7`}
				spellCheck={false}
				className="min-h-[100px] w-full resize-y rounded-md border border-input bg-background px-3 py-2 font-mono text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
			/>
			{parseError && <p className="text-sm text-destructive">{parseError}</p>}
		</div>
	);
}
