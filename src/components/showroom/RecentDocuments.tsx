import { FileClock, FileText } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useShowroom } from "@/hooks/ShowroomContext";

export function RecentDocuments() {
	const { t } = useTranslation();
	const { recentDocuments, openRecentDocument } = useShowroom();
	const [unavailableName, setUnavailableName] = useState<string | null>(null);

	if (recentDocuments.length === 0) return null;

	async function handleOpen(id: string, name: string) {
		setUnavailableName(null);
		const ok = await openRecentDocument(id);
		if (!ok) setUnavailableName(name);
	}

	return (
		<div className="flex w-full max-w-sm flex-col items-stretch gap-2">
			<div className="flex items-center justify-center gap-1.5 text-muted-foreground text-xs">
				<FileClock className="size-3.5" />
				<span>{t("ui.showroom.recentTitle")}</span>
			</div>
			<ul className="flex flex-col gap-1">
				{recentDocuments.map((doc) => (
					<li key={doc.id}>
						<button
							type="button"
							onClick={() => handleOpen(doc.id, doc.name)}
							className="flex w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-left text-sm hover:bg-muted"
						>
							<FileText className="size-4 shrink-0 text-muted-foreground" />
							<span className="truncate">{doc.name}</span>
						</button>
					</li>
				))}
			</ul>
			{unavailableName && (
				<p className="text-amber-600 text-xs dark:text-amber-500">
					{t("ui.showroom.recentUnavailable", { name: unavailableName })}
				</p>
			)}
		</div>
	);
}
