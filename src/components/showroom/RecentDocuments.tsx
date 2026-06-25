import { FileClock, FileText } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useShowroom } from "@/hooks/ShowroomContext";

/** How many recent files to show in the empty-state box. */
const MAX_VISIBLE = 5;

export function RecentDocuments() {
	const { t } = useTranslation();
	const { recentDocuments, openRecentDocument } = useShowroom();
	const [unavailableName, setUnavailableName] = useState<string | null>(null);

	const docs = recentDocuments.slice(0, MAX_VISIBLE);

	async function handleOpen(id: string, name: string) {
		setUnavailableName(null);
		const ok = await openRecentDocument(id);
		if (!ok) setUnavailableName(name);
	}

	return (
		<div className="flex w-full max-w-sm flex-col items-stretch gap-2 rounded-lg border border-border bg-card p-3 text-left">
			<div className="flex items-center gap-1.5 text-muted-foreground text-xs">
				<FileClock className="size-3.5" />
				<span>{t("ui.showroom.recentTitle")}</span>
			</div>

			{docs.length === 0 ? (
				<p className="py-2 text-center text-muted-foreground text-xs">
					{t("ui.showroom.recentEmpty")}
				</p>
			) : (
				<ul className="flex flex-col">
					{docs.map((doc) => (
						<li key={doc.id}>
							<button
								type="button"
								onClick={() => handleOpen(doc.id, doc.name)}
								title={doc.name}
								className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm hover:bg-muted"
							>
								<FileText className="size-4 shrink-0 text-muted-foreground" />
								<span className="min-w-0 truncate">{doc.name}</span>
							</button>
						</li>
					))}
				</ul>
			)}

			{unavailableName && (
				<p className="text-amber-600 text-xs dark:text-amber-500">
					{t("ui.showroom.recentUnavailable", { name: unavailableName })}
				</p>
			)}
		</div>
	);
}
