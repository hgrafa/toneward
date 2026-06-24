import { FileText, Upload } from "lucide-react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { useShowroom } from "@/hooks/ShowroomContext";

export function PdfViewer() {
	const { t } = useTranslation();
	const {
		currentDocument,
		unavailableDocumentName,
		openDocument,
		closeDocument,
	} = useShowroom();
	const [error, setError] = useState<string | null>(null);
	const inputId = useId();

	function acceptFile(file: File | undefined) {
		if (!file) return;
		if (file.type !== "application/pdf") {
			setError(t("errors.invalidPdfFile"));
			return;
		}
		setError(null);
		openDocument(file);
	}

	if (currentDocument) {
		return (
			<div className="flex h-full flex-col">
				<div className="flex items-center justify-between border-border border-b px-4 py-2 text-sm">
					<span className="flex items-center gap-2 truncate text-muted-foreground">
						<FileText className="size-4 shrink-0" />
						<span className="truncate">{currentDocument.name}</span>
					</span>
					<button
						type="button"
						onClick={closeDocument}
						className="rounded-md border border-input px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
					>
						{t("ui.showroom.pdfClose")}
					</button>
				</div>
				<iframe
					title={currentDocument.name}
					src={currentDocument.objectUrl}
					className="h-full w-full flex-1 border-0"
				/>
			</div>
		);
	}

	return (
		<div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
			<FileText className="size-10 text-muted-foreground" />
			<label
				htmlFor={inputId}
				className="flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
			>
				<Upload className="size-4" />
				{t("ui.showroom.pdfUpload")}
			</label>
			<p className="text-xs text-muted-foreground">
				{t("ui.showroom.pdfDrag")}
			</p>
			{unavailableDocumentName && (
				<p className="max-w-sm text-xs text-amber-600 dark:text-amber-500">
					{t("ui.showroom.pdfUnavailable", {
						name: unavailableDocumentName,
					})}
				</p>
			)}
			{error && <p className="text-xs text-destructive">{error}</p>}
			<input
				id={inputId}
				type="file"
				accept="application/pdf"
				className="sr-only"
				onChange={(e) => acceptFile(e.target.files?.[0])}
			/>
		</div>
	);
}
