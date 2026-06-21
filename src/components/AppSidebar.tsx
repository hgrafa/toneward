import { Guitar, Music4, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from "@/components/ui/select";
import { useView } from "@/hooks/ViewContext";
import i18n from "@/i18n/index";
import type { AppView } from "@/types/showroom";

function BrazilFlag() {
	return (
		<svg width="20" height="14" viewBox="0 0 20 14" aria-hidden="true">
			<rect width="20" height="14" rx="1" fill="#009c3b" />
			<polygon points="10,1.5 18.5,7 10,12.5 1.5,7" fill="#ffdf00" />
			<circle cx="10" cy="7" r="3" fill="#002776" />
		</svg>
	);
}

function USFlag() {
	const sh = 14 / 13;
	return (
		<svg width="20" height="14" viewBox="0 0 20 14" aria-hidden="true">
			<rect width="20" height="14" rx="1" fill="#fff" />
			{[0, 2, 4, 6, 8, 10, 12].map((i) => (
				<rect key={i} x="0" y={i * sh} width="20" height={sh} fill="#b22234" />
			))}
			<rect x="0" y="0" width="8" height={7 * sh} fill="#3c3b6e" />
		</svg>
	);
}

export function AppSidebar() {
	const { t } = useTranslation();
	const { view, setView, sidebarCollapsed, toggleSidebar } = useView();
	const lang = i18n.language.startsWith("pt") ? "pt-BR" : "en";

	const NAV: { view: AppView; label: string; icon: typeof Guitar }[] = [
		{ view: "fretboard", label: t("ui.sidebar.fretboard"), icon: Guitar },
		{ view: "showroom", label: t("ui.sidebar.showroom"), icon: Music4 },
	];

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

			<div
				className={`px-2 pb-1 ${sidebarCollapsed ? "flex justify-center" : ""}`}
			>
				<Select value={lang} onValueChange={(v) => i18n.changeLanguage(v)}>
					<SelectTrigger
						size="sm"
						aria-label={t("ui.sidebar.langToggle")}
						className={sidebarCollapsed ? "w-auto gap-1 px-2" : "w-full"}
					>
						{lang === "pt-BR" ? <BrazilFlag /> : <USFlag />}
						{!sidebarCollapsed && (
							<span className="text-xs">
								{lang === "pt-BR" ? "Português" : "English"}
							</span>
						)}
					</SelectTrigger>
					<SelectContent position="popper" align="start">
						<SelectItem value="en">
							<USFlag /> English
						</SelectItem>
						<SelectItem value="pt-BR">
							<BrazilFlag /> Português
						</SelectItem>
					</SelectContent>
				</Select>
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
		</aside>
	);
}
