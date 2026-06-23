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

interface ViewState {
	view: AppView;
	setView: (view: AppView) => void;
}

const ViewContext = createContext<ViewState | null>(null);

export function ViewProvider({ children }: { children: ReactNode }) {
	const [view, setView] = useState<AppView>(loadView);

	useEffect(() => {
		try {
			localStorage.setItem(VIEW_KEY, view);
		} catch {
			/* storage unavailable */
		}
	}, [view]);

	const value = useMemo<ViewState>(() => ({ view, setView }), [view]);

	return <ViewContext.Provider value={value}>{children}</ViewContext.Provider>;
}

export function useView(): ViewState {
	const ctx = useContext(ViewContext);
	if (!ctx) throw new Error("useView must be used within a ViewProvider");
	return ctx;
}
