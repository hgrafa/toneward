import { useTranslation } from "react-i18next";
import { AudioControlPanel } from "@/components/AudioControlPanel";
import { AccountButton } from "@/components/account/AccountButton";
import { BrandMark } from "@/components/BrandMark";
import { LanguageToggle } from "@/components/LanguageToggle";
import { MetronomePanel } from "@/components/MetronomePanel";
import { StudyTimerButton } from "@/components/StudyTimerButton";
import { useView } from "@/hooks/ViewContext";
import type { AppView } from "@/types/showroom";

export function AppHeader() {
	const { t } = useTranslation();
	const { view } = useView();

	const sectionLabel: Record<AppView, string> = {
		home: t("ui.sidebar.home"),
		fretboard: t("ui.sidebar.fretboard"),
		showroom: t("ui.sidebar.showroom"),
		practice: t("ui.sidebar.practice"),
	};

	return (
		<header className="flex h-[60px] min-w-0 shrink-0 items-center justify-between gap-2 border-border border-b bg-background/80 px-3 backdrop-blur-lg sm:px-5">
			<div className="flex shrink-0 items-center gap-3.5">
				<div className="flex items-center gap-3">
					<BrandMark />
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
				<AccountButton />
			</div>
		</header>
	);
}
