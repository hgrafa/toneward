import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import type { AppView } from "@/types/showroom";

const VIEW_KEY = "fretboard.view";
const SIDEBAR_KEY = "fretboard.sidebarCollapsed";

const VALID_VIEWS: AppView[] = ["fretboard", "showroom", "practice"];

function loadView(): AppView {
	try {
		const saved = localStorage.getItem(VIEW_KEY);
		return VALID_VIEWS.includes(saved as AppView)
			? (saved as AppView)
			: "fretboard";
	} catch {
		/* storage unavailable */
		return "fretboard";
	}
}

function loadCollapsed(): boolean {
	try {
		return localStorage.getItem(SIDEBAR_KEY) === "true";
	} catch {
		/* storage unavailable */
		return false;
	}
}

interface ViewState {
	view: AppView;
	setView: (view: AppView) => void;
	sidebarCollapsed: boolean;
	toggleSidebar: () => void;
}

const ViewContext = createContext<ViewState | null>(null);

export function ViewProvider({ children }: { children: ReactNode }) {
	const [view, setView] = useState<AppView>(loadView);
	const [sidebarCollapsed, setSidebarCollapsed] =
		useState<boolean>(loadCollapsed);

	useEffect(() => {
		try {
			localStorage.setItem(VIEW_KEY, view);
		} catch {
			/* storage unavailable */
		}
	}, [view]);

	useEffect(() => {
		try {
			localStorage.setItem(SIDEBAR_KEY, String(sidebarCollapsed));
		} catch {
			/* storage unavailable */
		}
	}, [sidebarCollapsed]);

	const value = useMemo<ViewState>(
		() => ({
			view,
			setView,
			sidebarCollapsed,
			toggleSidebar: () => setSidebarCollapsed((c) => !c),
		}),
		[view, sidebarCollapsed],
	);

	return <ViewContext.Provider value={value}>{children}</ViewContext.Provider>;
}

export function useView(): ViewState {
	const ctx = useContext(ViewContext);
	if (!ctx) throw new Error("useView must be used within a ViewProvider");
	return ctx;
}
