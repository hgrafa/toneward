import { useRef, useState } from "react";
import { useShowroom } from "@/hooks/ShowroomContext";
import { useMediaPlayer } from "@/hooks/useMediaPlayer";
import { AudioDock } from "./AudioDock";
import { MediaSourceBar } from "./MediaSourceBar";
import { PdfViewer } from "./PdfViewer";

export function ShowroomView() {
	const { audioSource, setCurrentDocument } = useShowroom();
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const ytContainerRef = useRef<HTMLDivElement | null>(null);
	const [dragging, setDragging] = useState(false);

	const api = useMediaPlayer(audioSource, audioRef, ytContainerRef);

	function onDrop(e: React.DragEvent) {
		e.preventDefault();
		setDragging(false);
		const file = e.dataTransfer.files?.[0];
		if (file?.type === "application/pdf") {
			setCurrentDocument({
				name: file.name,
				objectUrl: URL.createObjectURL(file),
			});
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
			<MediaSourceBar />

			<div className="relative min-h-[60vh] flex-1 overflow-hidden rounded-lg border border-border bg-card pb-16">
				<PdfViewer />
			</div>

			{dragging && (
				<div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center rounded-lg border-2 border-primary border-dashed bg-background/80 text-sm font-medium">
					Drop a PDF to open it
				</div>
			)}

			{audioSource && (
				<AudioDock
					api={api}
					title={audioSource.title}
					kind={audioSource.kind}
					audioRef={audioRef}
					ytContainerRef={ytContainerRef}
				/>
			)}
		</div>
	);
}
