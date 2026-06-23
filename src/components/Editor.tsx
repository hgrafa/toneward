import { useTranslation } from "react-i18next";
import { useInput } from "@/hooks/useFretboardContext";

export function Editor() {
	const { t } = useTranslation();
	const { inputText, setInputText, parseError } = useInput();

	return (
		<div className="rounded-[18px] border border-border bg-card p-[18px]">
			<label
				htmlFor="note-input"
				className="mb-2.5 block font-bold text-[11px] text-muted-foreground uppercase tracking-[0.08em]"
			>
				{t("ui.editor.label")}
			</label>
			<textarea
				id="note-input"
				value={inputText}
				onChange={(e) => setInputText(e.target.value)}
				placeholder={t("ui.editor.placeholder")}
				spellCheck={false}
				className="min-h-[100px] w-full resize-y rounded-[11px] border border-input bg-muted px-[13px] py-[11px] font-mono text-foreground text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
			/>
			{parseError && (
				<p className="mt-2 text-destructive text-sm">{parseError}</p>
			)}
		</div>
	);
}
