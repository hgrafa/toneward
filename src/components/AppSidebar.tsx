import { Guitar, Music4, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useView } from "@/hooks/ViewContext";
import i18n from "@/i18n/index";
import type { AppView } from "@/types/showroom";

export function AppSidebar() {
	const { t } = useTranslation();
	const { view, setView, sidebarCollapsed, toggleSidebar } = useView();

	const NAV: { view: AppView; label: string; icon: typeof Guitar }[] = [
		{ view: "fretboard", label: t("ui.sidebar.fretboard"), icon: Guitar },
		{ view: "showroom", label: t("ui.sidebar.showroom"), icon: Music4 },
	];

	function toggleLanguage() {
		const next = i18n.language.startsWith("pt") ? "en" : "pt-BR";
		i18n.changeLanguage(next);
	}

	return (
		<aside
			className={`flex shrink-0 flex-col border-border border-r bg-card transition-[width] ${
				sidebarCollapsed ? "w-14" : "w-48"
			}`}
		>
			<div className="flex h-14 items-center justify-between px-3">
				{!sidebarCollapsed && (
					<span className="font-bold text-sm tracking-tight">
						{t("ui.appName")}
					</span>
				)}
				<button
					type="button"
					aria-label={
						sidebarCollapsed ? t("ui.sidebar.expand") : t("ui.sidebar.collapse")
					}
					onClick={toggleSidebar}
					className="text-muted-foreground hover:text-foreground"
				>
					{sidebarCollapsed ? (
						<PanelLeftOpen className="size-5" />
					) : (
						<PanelLeftClose className="size-5" />
					)}
				</button>
			</div>

			<nav className="flex flex-col gap-1 p-2">
				{NAV.map(({ view: v, label, icon: Icon }) => (
					<button
						key={v}
						type="button"
						onClick={() => setView(v)}
						aria-current={view === v ? "page" : undefined}
						className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
							view === v
								? "bg-primary text-primary-foreground"
								: "text-muted-foreground hover:bg-muted"
						} ${sidebarCollapsed ? "justify-center" : ""}`}
						title={label}
					>
						<Icon className="size-5 shrink-0" />
						{!sidebarCollapsed && label}
					</button>
				))}
			</nav>

			<div className="mt-auto p-2">
				<button
					type="button"
					onClick={toggleLanguage}
					className={`flex w-full items-center justify-center rounded-md px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted ${
						sidebarCollapsed ? "" : "gap-1.5"
					}`}
					title={t("ui.sidebar.langToggle")}
				>
					{t("ui.sidebar.langToggle")}
				</button>
			</div>
		</aside>
	);
}
