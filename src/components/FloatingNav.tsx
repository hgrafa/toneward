import { Guitar, Music4, Target } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useView } from "@/hooks/ViewContext";
import type { AppView } from "@/types/showroom";

export function FloatingNav() {
	const { t } = useTranslation();
	const { view, setView } = useView();
	const [expanded, setExpanded] = useState(false);

	const NAV: { view: AppView; label: string; icon: typeof Guitar }[] = [
		{ view: "fretboard", label: t("ui.sidebar.fretboard"), icon: Guitar },
		{ view: "showroom", label: t("ui.sidebar.showroom"), icon: Music4 },
		{ view: "practice", label: t("ui.sidebar.practice"), icon: Target },
	];

	return (
		<nav
			onMouseEnter={() => setExpanded(true)}
			onMouseLeave={() => setExpanded(false)}
			className={`-translate-y-1/2 absolute top-1/2 left-3 z-30 flex flex-col gap-1 rounded-2xl border border-border bg-background/80 p-1.5 shadow-lg backdrop-blur-lg transition-[width] duration-200 ${
				expanded ? "w-44" : "w-[52px]"
			}`}
		>
			{NAV.map(({ view: v, label, icon: Icon }) => {
				const active = view === v;
				return (
					<button
						key={v}
						type="button"
						onClick={() => setView(v)}
						aria-current={active ? "page" : undefined}
						title={label}
						className={`flex h-10 items-center gap-3 overflow-hidden rounded-xl px-2.5 font-medium text-sm transition-colors ${
							active
								? "bg-brand-gradient text-white"
								: "text-muted-foreground hover:bg-muted"
						}`}
					>
						<Icon className="size-5 shrink-0" />
						{expanded && <span className="whitespace-nowrap">{label}</span>}
					</button>
				);
			})}
		</nav>
	);
}
