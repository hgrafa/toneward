import { useTranslation } from "react-i18next";
import { useInput } from "@/hooks/useFretboardContext";

export function Editor() {
	const { t } = useTranslation();
	const { inputText, setInputText, parseError } = useInput();

	return (
		<div className="flex flex-col gap-2">
			<label
				htmlFor="note-input"
				className="text-sm font-medium text-muted-foreground"
			>
				{t("ui.editor.label")}
			</label>
			<textarea
				id="note-input"
				value={inputText}
				onChange={(e) => setInputText(e.target.value)}
				placeholder={t("ui.editor.placeholder")}
				spellCheck={false}
				className="min-h-[100px] w-full resize-y rounded-md border border-input bg-background px-3 py-2 font-mono text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
			/>
			{parseError && <p className="text-sm text-destructive">{parseError}</p>}
		</div>
	);
}
