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
		<div className="flex flex-wrap items-center gap-2.5">
			{/* Display mode (segmented) */}
			<div className="flex items-center gap-1.5 text-muted-foreground">
				<Eye className="size-4" />
			</div>
			<div className="flex gap-0.5 rounded-[11px] bg-[#ece6dd] p-[3px]">
				{DISPLAY_MODES.map((mode) => (
					<button
						key={mode.value}
						type="button"
						onClick={() => setDisplayMode(mode.value)}
						className={`rounded-lg px-3 py-1.5 font-medium text-sm transition-colors ${
							displayMode === mode.value
								? "bg-card text-foreground shadow-sm"
								: "text-secondary-foreground hover:text-foreground"
						}`}
					>
						{mode.label}
					</button>
				))}
			</div>

			{/* Highlight root */}
			<button
				type="button"
				onClick={() => setHighlightRoot(!highlightRoot)}
				className={`flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 font-semibold text-sm transition-colors ${
					highlightRoot
						? "bg-foreground text-background"
						: "border border-border bg-card text-secondary-foreground hover:bg-muted"
				}`}
			>
				<Crosshair className="size-4" />
				{t("ui.toolbar.root")}
			</button>

			{/* Notes per string (segmented) */}
			<div className="flex items-center gap-2">
				<span className="font-semibold text-secondary-foreground text-sm">
					{t("ui.toolbar.nps")}
				</span>
				<div className="flex gap-0.5 rounded-[10px] bg-[#ece6dd] p-[3px]">
					{([2, 3] as const).map((n) => (
						<button
							key={n}
							type="button"
							onClick={() => setNotesPerString(n)}
							className={`rounded-md px-3 py-1 font-medium text-sm tabular-nums transition-colors ${
								notesPerString === n
									? "bg-card text-foreground shadow-sm"
									: "text-secondary-foreground hover:text-foreground"
							}`}
						>
							{n}
						</button>
					))}
				</div>
			</div>

			{/* Fret range */}
			<div className="flex items-center gap-2 text-secondary-foreground text-sm">
				<span className="font-semibold">{t("ui.toolbar.frets")}</span>
				<input
					type="number"
					min={0}
					max={fretRange[1] - 1}
					value={fretRange[0]}
					onChange={(e) => setFretRange([Number(e.target.value), fretRange[1]])}
					className="h-9 w-12 rounded-[9px] border border-input bg-muted text-center font-mono text-sm"
				/>
				<span className="text-muted-foreground">–</span>
				<input
					type="number"
					min={fretRange[0] + 1}
					max={22}
					value={fretRange[1]}
					onChange={(e) => setFretRange([fretRange[0], Number(e.target.value)])}
					className="h-9 w-12 rounded-[9px] border border-input bg-muted text-center font-mono text-sm"
				/>
			</div>

			<div className="flex-1" />

			{/* Copy image */}
			<button
				type="button"
				onClick={handleCopy}
				className="flex items-center gap-1.5 rounded-[10px] border border-border bg-card px-3 py-1.5 font-semibold text-secondary-foreground text-sm transition-colors hover:bg-muted"
			>
				{copied ? (
					<>
						<Check className="size-4" />
						{t("ui.toolbar.copied")}
					</>
				) : (
					<>
						<Copy className="size-4" />
						{t("ui.toolbar.copy")}
					</>
				)}
			</button>
		</div>
	);
}
