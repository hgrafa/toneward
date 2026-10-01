import { useTranslation } from "react-i18next";
import { AudioControlPanel } from "@/components/AudioControlPanel";
import { LanguageToggle } from "@/components/LanguageToggle";
import { MetronomePanel } from "@/components/MetronomePanel";
import { StudyTimerButton } from "@/components/StudyTimerButton";
import { useView } from "@/hooks/ViewContext";
import type { AppView } from "@/types/showroom";

const MARK_GRADIENT =
	"linear-gradient(150deg,#3A332C 0%,#5B4A45 15%,#C8345F 44%,#F2683C 74%,#FBA63F 100%)";
const MARK_SHADOW =
	"0 3px 12px rgba(58,51,44,.32), inset 0 1px 1px rgba(255,255,255,.35)";

export function AppHeader() {
	const { t } = useTranslation();
	const { view } = useView();

	const sectionLabel: Record<AppView, string> = {
		fretboard: t("ui.sidebar.fretboard"),
		showroom: t("ui.sidebar.showroom"),
		practice: t("ui.sidebar.practice"),
	};

	return (
		<header className="flex h-[60px] min-w-0 shrink-0 items-center justify-between gap-2 border-border border-b bg-background/80 px-3 backdrop-blur-lg sm:px-5">
			<div className="flex shrink-0 items-center gap-3.5">
				<div className="flex items-center gap-3">
					<div
						className="flex size-9 items-center justify-center rounded-[11px] font-display font-bold text-base text-white"
						style={{ background: MARK_GRADIENT, boxShadow: MARK_SHADOW }}
					>
						T
					</div>
					<span className="hidden font-display font-bold text-[19px] tracking-[-0.02em] min-[360px]:inline">
						{t("ui.appName")}
					</span>
				</div>
				<div className="hidden h-[30px] w-px bg-border md:block" />
				<span className="hidden font-semibold text-secondary-foreground text-sm tracking-[-0.01em] md:inline">
					{sectionLabel[view]}
				</span>
			</div>
			<div className="flex shrink-0 items-center gap-1 sm:gap-2">
				<StudyTimerButton />
				<MetronomePanel />
				<AudioControlPanel />
				<LanguageToggle />
			</div>
		</header>
	);
}
