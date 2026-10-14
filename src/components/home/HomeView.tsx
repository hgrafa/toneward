import type { TFunction } from "i18next";
import { ArrowUpRight, Guitar, Music4, Target } from "lucide-react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { firstName } from "@/components/account/UserAvatar";
import { useAuth } from "@/hooks/AuthContext";
import { useView } from "@/hooks/ViewContext";
import { cn } from "@/lib/utils";
import type { AppView } from "@/types/showroom";

export type PartOfDay = "morning" | "afternoon" | "evening" | "night";

export function partOfDay(hour: number): PartOfDay {
	if (hour >= 5 && hour < 12) return "morning";
	if (hour >= 12 && hour < 18) return "afternoon";
	if (hour >= 18 && hour < 22) return "evening";
	return "night";
}

function phrases(t: TFunction, key: string): string[] {
	const value = t(key, { returnObjects: true });
	return Array.isArray(value)
		? value.filter((p): p is string => typeof p === "string")
		: [];
}

const SHORTCUTS: {
	view: Exclude<AppView, "home">;
	icon: typeof Guitar;
	hint: "fretboardHint" | "showroomHint" | "practiceHint";
}[] = [
	{ view: "fretboard", icon: Guitar, hint: "fretboardHint" },
	{ view: "showroom", icon: Music4, hint: "showroomHint" },
	{ view: "practice", icon: Target, hint: "practiceHint" },
];

export function HomeView() {
	const { t } = useTranslation();
	const { loading, user } = useAuth();
	const { setView } = useView();
	const headingId = useId();
	// Picked once per visit, so the phrase doesn't reshuffle on every render.
	const [part] = useState(() => partOfDay(new Date().getHours()));
	const [seed] = useState(Math.random);

	const name = user ? firstName(user) : "";
	const pool = [
		...phrases(t, `ui.home.phrases.${part}`),
		...phrases(t, "ui.home.phrases.anytime"),
	];
	const phrase = pool[Math.floor(seed * pool.length)];

	return (
		<div className="mx-auto flex min-h-full max-w-[1180px] flex-col justify-center gap-12 px-10 py-12 pl-24">
			<section className="flex flex-col gap-3">
				<h1
					className={cn(
						"font-bold font-display text-[44px] leading-[1.05] tracking-[-0.035em] sm:text-[56px]",
						loading && "invisible",
					)}
				>
					{name
						? t("ui.home.greeting", { name })
						: t("ui.home.greetingAnonymous")}
				</h1>
				<p className="max-w-xl text-lg text-secondary-foreground leading-relaxed">
					{phrase}
				</p>
			</section>

			<section aria-labelledby={headingId} className="flex flex-col gap-4">
				<h2
					id={headingId}
					className="font-semibold text-muted-foreground text-xs uppercase tracking-widest"
				>
					{t("ui.home.shortcuts")}
				</h2>
				<div className="grid gap-4 md:grid-cols-3">
					{SHORTCUTS.map(({ view, icon: Icon, hint }) => (
						<button
							key={view}
							type="button"
							onClick={() => setView(view)}
							className="group hover:-translate-y-0.5 flex flex-col gap-6 rounded-[18px] border border-border bg-card p-5 text-left outline-none transition-[border-color,box-shadow,translate] hover:border-foreground/15 hover:shadow-[0_14px_32px_-14px_rgba(35,32,28,0.3)] focus-visible:ring-2 focus-visible:ring-ring"
						>
							<div className="flex items-center justify-between">
								<span className="flex size-11 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
									<Icon className="size-5" />
								</span>
								<ArrowUpRight className="group-hover:-translate-y-0.5 size-5 text-muted-foreground transition-[color,translate] group-hover:translate-x-0.5 group-hover:text-foreground" />
							</div>
							<div className="flex flex-col gap-1">
								<span className="font-bold font-display text-lg tracking-[-0.02em]">
									{t(`ui.sidebar.${view}`)}
								</span>
								<span className="text-secondary-foreground text-sm leading-relaxed">
									{t(`ui.home.${hint}`)}
								</span>
							</div>
						</button>
					))}
				</div>
			</section>
		</div>
	);
}
