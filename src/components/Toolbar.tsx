import { toBlob } from "html-to-image";
import { Check, Copy, Crosshair, Eye } from "lucide-react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDisplay } from "@/hooks/useFretboardContext";
import type { DisplayMode } from "@/types/music";

interface ToolbarProps {
	fretboardRef: React.RefObject<HTMLDivElement | null>;
}

export function Toolbar({ fretboardRef }: ToolbarProps) {
	const { t } = useTranslation();
	const {
		displayMode,
		setDisplayMode,
		highlightRoot,
		setHighlightRoot,
		fretRange,
		setFretRange,
		notesPerString,
		setNotesPerString,
	} = useDisplay();

	const [copied, setCopied] = useState(false);

	const DISPLAY_MODES: { value: DisplayMode; label: string }[] = [
		{ value: "note", label: t("ui.toolbar.notes") },
		{ value: "interval", label: t("ui.toolbar.intervals") },
		{ value: "none", label: t("ui.toolbar.none") },
	];

	const handleCopy = useCallback(async () => {
		const node = fretboardRef.current;
		if (!node) return;

		try {
			const blob = await toBlob(node, {
				backgroundColor: "#ffffff",
				pixelRatio: 2,
			});
			if (!blob) return;

			await navigator.clipboard.write([
				new ClipboardItem({ [blob.type]: blob }),
			]);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch (err) {
			console.error("Failed to copy image:", err);
		}
	}, [fretboardRef]);

	return (
		<div className="flex flex-wrap items-center gap-4">
			{/* Display mode */}
			<div className="flex items-center gap-2">
				<Eye className="size-4 text-muted-foreground" />
				<div className="flex rounded-md border border-input">
					{DISPLAY_MODES.map((mode) => (
						<button
							key={mode.value}
							type="button"
							onClick={() => setDisplayMode(mode.value)}
							className={`px-3 py-1.5 text-xs font-medium transition-colors first:rounded-l-md last:rounded-r-md ${
								displayMode === mode.value
									? "bg-primary text-primary-foreground"
									: "bg-background text-muted-foreground hover:bg-muted"
							}`}
						>
							{mode.label}
						</button>
					))}
				</div>
			</div>

			{/* Highlight root */}
			<button
				type="button"
				onClick={() => setHighlightRoot(!highlightRoot)}
				className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
					highlightRoot
						? "border-primary bg-primary text-primary-foreground"
						: "border-input bg-background text-muted-foreground hover:bg-muted"
				}`}
			>
				<Crosshair className="size-3.5" />
				{t("ui.toolbar.root")}
			</button>

			{/* Notes per string */}
			<div className="flex items-center gap-2">
				<span className="text-xs text-muted-foreground">
					{t("ui.toolbar.nps")}
				</span>
				<div className="flex rounded-md border border-input">
					{([2, 3] as const).map((n) => (
						<button
							key={n}
							type="button"
							onClick={() => setNotesPerString(n)}
							className={`px-3 py-1.5 text-xs font-medium transition-colors first:rounded-l-md last:rounded-r-md ${
								notesPerString === n
									? "bg-primary text-primary-foreground"
									: "bg-background text-muted-foreground hover:bg-muted"
							}`}
						>
							{n}
						</button>
					))}
				</div>
			</div>

			{/* Fret range */}
			<div className="flex items-center gap-2 text-xs text-muted-foreground">
				<span>{t("ui.toolbar.frets")}</span>
				<input
					type="number"
					min={0}
					max={fretRange[1] - 1}
					value={fretRange[0]}
					onChange={(e) => setFretRange([Number(e.target.value), fretRange[1]])}
					className="w-12 rounded-md border border-input bg-background px-2 py-1 text-center text-xs"
				/>
				<span>–</span>
				<input
					type="number"
					min={fretRange[0] + 1}
					max={22}
					value={fretRange[1]}
					onChange={(e) => setFretRange([fretRange[0], Number(e.target.value)])}
					className="w-12 rounded-md border border-input bg-background px-2 py-1 text-center text-xs"
				/>
			</div>

			{/* Copy image */}
			<button
				type="button"
				onClick={handleCopy}
				className="flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
			>
				{copied ? (
					<>
						<Check className="size-3.5" />
						{t("ui.toolbar.copied")}
					</>
				) : (
					<>
						<Copy className="size-3.5" />
						{t("ui.toolbar.copy")}
					</>
				)}
			</button>
		</div>
	);
}
