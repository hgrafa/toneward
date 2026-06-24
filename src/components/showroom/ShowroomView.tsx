import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useShowroom } from "@/hooks/ShowroomContext";
import { PdfViewer } from "./PdfViewer";

export function ShowroomView() {
	const { t } = useTranslation();
	const { openDocument } = useShowroom();
	const [dragging, setDragging] = useState(false);

	function onDrop(e: React.DragEvent) {
		e.preventDefault();
		setDragging(false);
		const file = e.dataTransfer.files?.[0];
		if (file?.type === "application/pdf") {
			openDocument(file);
		}
	}

	return (
		<div
			className="relative flex h-full flex-col gap-4 p-4"
			onDragOver={(e) => {
				e.preventDefault();
				setDragging(true);
			}}
			onDragLeave={() => setDragging(false)}
			onDrop={onDrop}
		>
			<div className="relative min-h-[60vh] flex-1 overflow-hidden rounded-lg border border-border bg-card">
				<PdfViewer />
			</div>

			{dragging && (
				<div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center rounded-lg border-2 border-primary border-dashed bg-background/80 font-medium text-sm">
					{t("ui.showroom.pdfDrop")}
				</div>
			)}
		</div>
	);
}
