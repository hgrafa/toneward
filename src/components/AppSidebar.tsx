import { Guitar, Music4, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useView } from "@/hooks/ViewContext";
import type { AppView } from "@/types/showroom";

const NAV: { view: AppView; label: string; icon: typeof Guitar }[] = [
	{ view: "fretboard", label: "Fretboard", icon: Guitar },
	{ view: "showroom", label: "Showroom", icon: Music4 },
];

export function AppSidebar() {
	const { view, setView, sidebarCollapsed, toggleSidebar } = useView();

	return (
		<aside
			className={`flex shrink-0 flex-col border-border border-r bg-card transition-[width] ${
				sidebarCollapsed ? "w-14" : "w-48"
			}`}
		>
			<div className="flex h-14 items-center justify-between px-3">
				{!sidebarCollapsed && (
					<span className="font-bold text-sm tracking-tight">
						Scale Training
					</span>
				)}
				<button
					type="button"
					aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
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
		</aside>
	);
}
