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

const VALID_VIEWS: AppView[] = ["home", "fretboard", "showroom", "practice"];

function loadView(): AppView {
	try {
		const saved = localStorage.getItem(VIEW_KEY);
		return VALID_VIEWS.includes(saved as AppView) ? (saved as AppView) : "home";
	} catch {
		/* storage unavailable */
		return "home";
	}
}

interface ViewState {
	view: AppView;
	setView: (view: AppView) => void;
	/** The full-screen account screen, layered over the current view. */
	accountOpen: boolean;
	setAccountOpen: (open: boolean) => void;
}

const ViewContext = createContext<ViewState | null>(null);

export function ViewProvider({ children }: { children: ReactNode }) {
	const [view, setView] = useState<AppView>(loadView);
	const [accountOpen, setAccountOpen] = useState(false);

	useEffect(() => {
		try {
			localStorage.setItem(VIEW_KEY, view);
		} catch {
			/* storage unavailable */
		}
	}, [view]);

	const value = useMemo<ViewState>(
		() => ({ view, setView, accountOpen, setAccountOpen }),
		[view, accountOpen],
	);

	return <ViewContext.Provider value={value}>{children}</ViewContext.Provider>;
}

export function useView(): ViewState {
	const ctx = useContext(ViewContext);
	if (!ctx) throw new Error("useView must be used within a ViewProvider");
	return ctx;
}
