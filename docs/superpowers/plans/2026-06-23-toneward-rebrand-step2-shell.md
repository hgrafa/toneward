# Toneward Rebrand — Step 2 (App Shell: Header + Floating Nav) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current left sidebar with the Toneward chrome — a fixed top header (logo lockup + section name + language + Metrônomo + Áudio) and a floating left capsule nav — without changing any underlying behavior.

**Architecture:** A new `AppHeader` and `FloatingNav` compose the shell; `App.tsx` switches from a horizontal `flex` (sidebar + main) to a vertical column (header + relative body). The language switch and the Metrônomo/Áudio popovers move out of the sidebar/Braço-toolbar into the header (the popover components keep their logic — only triggers are restyled and relocated, making Metrônomo/Áudio global across tabs). The dead `sidebarCollapsed` state is removed.

**Tech Stack:** Vite + React 19 + TS, Tailwind CSS v4, shadcn/ui, lucide-react, react-i18next, Vitest + @testing-library/react.

## Global Constraints

- Package manager **pnpm**. Verify with `pnpm lint` (Biome) and `pnpm build` (tsc + vite). Tests: `pnpm vitest run <file>`.
- Formatting: **tabs, double quotes, semicolons** — Biome owns it; run `pnpm lint:fix` if needed.
- **Behavior-preserving except the three deliberate relocations:** (1) nav moves from left sidebar → floating left capsule; (2) language switch moves into the header; (3) Metrônomo + Áudio move from the Braço toolbar into the header (now global on every tab). No music/audio/metronome logic changes.
- **Accent discipline:** the brand gradient appears ONLY on the logo mark and the active nav item. Header control pills are stone-neutral; the active/open pill inverts to dark ink (`--foreground` bg, `--background` text). Uses the `bg-brand-gradient` utility added in Step 1.
- **Desktop-first.** Do not add new mobile breakpoints or a hamburger menu (YAGNI); preserve the app's current desktop layout assumptions.
- Section name and nav labels reuse the existing i18n keys `ui.sidebar.fretboard` / `ui.sidebar.showroom` / `ui.sidebar.practice` (values: EN "Fretboard/Showroom/Practice", PT "Braço/Showroom/Prática"). The dead `ui.sidebar.expand` / `ui.sidebar.collapse` keys are removed.
- Logo mark gradient (verbatim): `linear-gradient(150deg,#3A332C 0%,#5B4A45 15%,#C8345F 44%,#F2683C 74%,#FBA63F 100%)`; mark shadow: `0 3px 12px rgba(58,51,44,.32), inset 0 1px 1px rgba(255,255,255,.35)`.

## File Structure

- **Create** `src/components/LanguageToggle.tsx` — the flag Select, extracted from `AppSidebar`, restyled as a header pill. One responsibility: language switching.
- **Create** `src/components/AppHeader.tsx` — fixed top bar: logo lockup + section name (left); `LanguageToggle` + `MetronomePanel` + `AudioControlPanel` (right).
- **Create** `src/components/FloatingNav.tsx` — floating left capsule, hover-expand, three view buttons.
- **Modify** `src/App.tsx` — column layout (header + relative body + floating nav).
- **Delete** `src/components/AppSidebar.tsx` — replaced by the two new components.
- **Modify** `src/components/FretboardView.tsx` — drop Metrônomo/Áudio from the toolbar row.
- **Modify** `src/components/MetronomePanel.tsx`, `src/components/AudioControlPanel.tsx` — restyle the popover trigger as a header pill (logic untouched).
- **Modify** `src/hooks/ViewContext.tsx` + `src/hooks/ViewContext.test.tsx` — remove `sidebarCollapsed`/`toggleSidebar`/`SIDEBAR_KEY`.
- **Modify** `src/i18n/locales/en.ts`, `src/i18n/locales/pt-BR.ts` — remove the dead `sidebar.expand`/`sidebar.collapse` keys.

---

### Task 1: LanguageToggle component

Extract the flag-based language Select out of `AppSidebar` into a reusable header pill.

**Files:**
- Create: `src/components/LanguageToggle.tsx`
- Test: `src/components/LanguageToggle.test.tsx`

**Interfaces:**
- Consumes: `Select*` from `@/components/ui/select`; `i18n` default export from `@/i18n/index`.
- Produces: `export function LanguageToggle()` — a self-contained language switch (no props).

- [ ] **Step 1: Write the failing test**

Create `src/components/LanguageToggle.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LanguageToggle } from "@/components/LanguageToggle";

describe("LanguageToggle", () => {
	it("renders the current language as an accessible trigger", () => {
		render(<LanguageToggle />);
		// i18n is initialized to "en" in test setup.
		const trigger = screen.getByLabelText("Select language");
		expect(trigger).toBeInTheDocument();
		expect(trigger).toHaveTextContent("EN");
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/LanguageToggle.test.tsx`
Expected: FAIL — module `@/components/LanguageToggle` does not exist.

- [ ] **Step 3: Create the component**

Create `src/components/LanguageToggle.tsx`:

```tsx
import { useTranslation } from "react-i18next";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from "@/components/ui/select";
import i18n from "@/i18n/index";

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

export function LanguageToggle() {
	const { t } = useTranslation();
	const lang = i18n.language.startsWith("pt") ? "pt-BR" : "en";

	return (
		<Select value={lang} onValueChange={(v) => i18n.changeLanguage(v)}>
			<SelectTrigger
				size="sm"
				aria-label={t("ui.sidebar.langToggle")}
				className="h-9 gap-2 rounded-lg border-border bg-card px-3 font-semibold text-secondary-foreground"
			>
				{lang === "pt-BR" ? <BrazilFlag /> : <USFlag />}
				<span className="text-xs">{lang === "pt-BR" ? "PT" : "EN"}</span>
			</SelectTrigger>
			<SelectContent position="popper" align="end">
				<SelectItem value="en">
					<USFlag /> English
				</SelectItem>
				<SelectItem value="pt-BR">
					<BrazilFlag /> Português
				</SelectItem>
			</SelectContent>
		</Select>
	);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/components/LanguageToggle.test.tsx`
Expected: PASS.

- [ ] **Step 5: Verify build + lint**

Run: `pnpm build && pnpm lint`
Expected: both succeed.

- [ ] **Step 6: Commit**

```bash
git add src/components/LanguageToggle.tsx src/components/LanguageToggle.test.tsx
git commit -m "feat: extract LanguageToggle as a header pill"
```

---

### Task 2: AppHeader component

Fixed frosted top bar: logo lockup + current section name on the left; language + Metrônomo + Áudio on the right.

**Files:**
- Create: `src/components/AppHeader.tsx`
- Test: `src/components/AppHeader.test.tsx`

**Interfaces:**
- Consumes: `LanguageToggle` (Task 1); `MetronomePanel` from `@/components/MetronomePanel`; `AudioControlPanel` from `@/components/AudioControlPanel`; `useView` from `@/hooks/ViewContext`; `AppView` from `@/types/showroom`.
- Produces: `export function AppHeader()` — must be rendered inside `ViewProvider`, `AudioDevicesProvider`, and `MetronomeProvider`.

- [ ] **Step 1: Write the failing test**

Create `src/components/AppHeader.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppHeader } from "@/components/AppHeader";
import { AudioDevicesProvider } from "@/hooks/AudioDevicesContext";
import { MetronomeProvider } from "@/hooks/MetronomeContext";
import { ViewProvider } from "@/hooks/ViewContext";

function renderHeader() {
	return render(
		<ViewProvider>
			<AudioDevicesProvider>
				<MetronomeProvider>
					<AppHeader />
				</MetronomeProvider>
			</AudioDevicesProvider>
		</ViewProvider>,
	);
}

describe("AppHeader", () => {
	it("shows the brand lockup and the current section name", () => {
		renderHeader();
		expect(screen.getByText("Practice OS")).toBeInTheDocument();
		// Default view is "fretboard" → section label "Fretboard" (en).
		expect(screen.getByText("Fretboard")).toBeInTheDocument();
	});

	it("renders the global Metronome and Audio controls", () => {
		renderHeader();
		expect(screen.getByText("Metronome")).toBeInTheDocument();
		expect(screen.getByText("Audio")).toBeInTheDocument();
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/AppHeader.test.tsx`
Expected: FAIL — module `@/components/AppHeader` does not exist.

- [ ] **Step 3: Create the component**

Create `src/components/AppHeader.tsx`:

```tsx
import { useTranslation } from "react-i18next";
import { AudioControlPanel } from "@/components/AudioControlPanel";
import { LanguageToggle } from "@/components/LanguageToggle";
import { MetronomePanel } from "@/components/MetronomePanel";
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
		<header className="flex h-[60px] shrink-0 items-center justify-between border-border border-b bg-background/80 px-5 backdrop-blur-lg">
			<div className="flex items-center gap-3.5">
				<div className="flex items-center gap-3">
					<div
						className="flex size-9 items-center justify-center rounded-[11px] font-display font-bold text-base text-white"
						style={{ background: MARK_GRADIENT, boxShadow: MARK_SHADOW }}
					>
						T
					</div>
					<div className="flex flex-col leading-none">
						<span className="font-display font-bold text-[19px] tracking-[-0.02em]">
							{t("ui.appName")}
						</span>
						<span className="mt-[3px] font-semibold text-[11px] text-muted-foreground">
							Practice OS
						</span>
					</div>
				</div>
				<div className="h-[30px] w-px bg-border" />
				<span className="font-semibold text-secondary-foreground text-sm tracking-[-0.01em]">
					{sectionLabel[view]}
				</span>
			</div>
			<div className="flex items-center gap-2">
				<LanguageToggle />
				<MetronomePanel />
				<AudioControlPanel />
			</div>
		</header>
	);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/components/AppHeader.test.tsx`
Expected: PASS (both tests).

- [ ] **Step 5: Verify build + lint**

Run: `pnpm build && pnpm lint`
Expected: both succeed.

- [ ] **Step 6: Commit**

```bash
git add src/components/AppHeader.tsx src/components/AppHeader.test.tsx
git commit -m "feat: add AppHeader with brand lockup and global controls"
```

---

### Task 3: FloatingNav component

Floating left capsule that hover-expands to reveal labels; active item uses the brand gradient.

**Files:**
- Create: `src/components/FloatingNav.tsx`
- Test: `src/components/FloatingNav.test.tsx`

**Interfaces:**
- Consumes: `useView` from `@/hooks/ViewContext`; `AppView` from `@/types/showroom`; `Guitar`/`Music4`/`Target` from `lucide-react`.
- Produces: `export function FloatingNav()` — must be rendered inside `ViewProvider`; positioned `absolute` within a `relative` parent.

- [ ] **Step 1: Write the failing test**

Create `src/components/FloatingNav.test.tsx`:

```tsx
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FloatingNav } from "@/components/FloatingNav";
import { ViewProvider } from "@/hooks/ViewContext";

describe("FloatingNav", () => {
	it("renders the three views and marks the active one", () => {
		render(
			<ViewProvider>
				<FloatingNav />
			</ViewProvider>,
		);
		const fretboard = screen.getByRole("button", { name: "Fretboard" });
		expect(fretboard).toHaveAttribute("aria-current", "page");
		expect(screen.getByRole("button", { name: "Showroom" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Practice" })).toBeInTheDocument();
	});

	it("switches the active view on click", () => {
		render(
			<ViewProvider>
				<FloatingNav />
			</ViewProvider>,
		);
		act(() => screen.getByRole("button", { name: "Showroom" }).click());
		expect(screen.getByRole("button", { name: "Showroom" })).toHaveAttribute(
			"aria-current",
			"page",
		);
		expect(screen.getByRole("button", { name: "Fretboard" })).not.toHaveAttribute(
			"aria-current",
		);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/FloatingNav.test.tsx`
Expected: FAIL — module `@/components/FloatingNav` does not exist.

- [ ] **Step 3: Create the component**

Create `src/components/FloatingNav.tsx`:

```tsx
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
```

Note: `aria-current={active ? "page" : undefined}` makes the accessible button name just the label, and the test's `not.toHaveAttribute("aria-current")` holds for inactive items.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/components/FloatingNav.test.tsx`
Expected: PASS (both tests).

- [ ] **Step 5: Verify build + lint**

Run: `pnpm build && pnpm lint`
Expected: both succeed.

- [ ] **Step 6: Commit**

```bash
git add src/components/FloatingNav.tsx src/components/FloatingNav.test.tsx
git commit -m "feat: add floating left capsule nav"
```

---

### Task 4: Wire the shell + retire the sidebar

Switch `App.tsx` to the header+body layout, delete `AppSidebar`, remove Metrônomo/Áudio from the Braço toolbar, and restyle the two popover triggers as header pills.

**Files:**
- Modify: `src/App.tsx`
- Delete: `src/components/AppSidebar.tsx`
- Modify: `src/components/FretboardView.tsx`
- Modify: `src/components/MetronomePanel.tsx` (trigger className only)
- Modify: `src/components/AudioControlPanel.tsx` (trigger className only)
- Test: `src/App.test.tsx` (new smoke test)

**Interfaces:**
- Consumes: `AppHeader` (Task 2), `FloatingNav` (Task 3).
- Produces: the assembled shell. `App` default export unchanged in signature.

- [ ] **Step 1: Write the failing smoke test**

Create `src/App.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "@/App";

describe("App shell", () => {
	it("mounts with the header and the floating nav", () => {
		render(<App />);
		// Brand subtitle lives only in the header.
		expect(screen.getByText("Practice OS")).toBeInTheDocument();
		// Floating nav exposes the three views as buttons.
		expect(screen.getByRole("button", { name: "Fretboard" })).toHaveAttribute(
			"aria-current",
			"page",
		);
		expect(screen.getByRole("button", { name: "Showroom" })).toBeInTheDocument();
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/App.test.tsx`
Expected: FAIL — `App` still renders `AppSidebar` (no "Practice OS" text, no nav buttons with those names).

- [ ] **Step 3: Rewrite `src/App.tsx`**

Replace the whole file with:

```tsx
import { AppHeader } from "@/components/AppHeader";
import { FloatingNav } from "@/components/FloatingNav";
import { FretboardView } from "@/components/FretboardView";
import { PracticeView } from "@/components/practice/PracticeView";
import { ShowroomView } from "@/components/showroom/ShowroomView";
import { AudioDevicesProvider } from "@/hooks/AudioDevicesContext";
import { MetronomeProvider } from "@/hooks/MetronomeContext";
import { ShowroomProvider } from "@/hooks/ShowroomContext";
import { FretboardProvider } from "@/hooks/useFretboardContext";
import { useView, ViewProvider } from "@/hooks/ViewContext";

export default function App() {
	return (
		<ViewProvider>
			<FretboardProvider>
				<AudioDevicesProvider>
					<MetronomeProvider>
						<ShowroomProvider>
							<AppShell />
						</ShowroomProvider>
					</MetronomeProvider>
				</AudioDevicesProvider>
			</FretboardProvider>
		</ViewProvider>
	);
}

function AppShell() {
	const { view } = useView();

	return (
		<div className="flex h-screen flex-col bg-background text-foreground">
			<AppHeader />
			<div className="relative flex-1 overflow-hidden">
				<main className="h-full overflow-y-auto">
					{view === "fretboard" && <FretboardView />}
					{view === "showroom" && <ShowroomView />}
					{view === "practice" && <PracticeView />}
				</main>
				<FloatingNav />
			</div>
		</div>
	);
}
```

- [ ] **Step 4: Delete `AppSidebar` and trim `FretboardView`**

Delete the file:

```bash
git rm src/components/AppSidebar.tsx
```

In `src/components/FretboardView.tsx`, remove the `MetronomePanel` and `AudioControlPanel` imports (lines importing them) and replace the toolbar row:

```tsx
			<div className="flex flex-wrap items-center gap-4">
				<Toolbar fretboardRef={fretboardRef} />
				<MetronomePanel />
				<AudioControlPanel />
			</div>
```

with:

```tsx
			<Toolbar fretboardRef={fretboardRef} />
```

Also delete the now-unused import lines:
`import { AudioControlPanel } from "@/components/AudioControlPanel";`
and
`import { MetronomePanel } from "@/components/MetronomePanel";`

- [ ] **Step 5: Restyle the two popover triggers as header pills**

In `src/components/MetronomePanel.tsx`, change the `PopoverTrigger` `<button>` className from:

```tsx
						className="flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted data-[state=open]:border-foreground/30 data-[state=open]:text-foreground"
```

to:

```tsx
						className="flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 font-semibold text-secondary-foreground text-sm transition-colors hover:bg-muted data-[state=open]:border-transparent data-[state=open]:bg-foreground data-[state=open]:text-background"
```

In `src/components/AudioControlPanel.tsx`, apply the identical className change to its `PopoverTrigger` `<button>` (same before/after strings as above).

(Leave the icon elements and all popover-content/logic untouched in both files.)

- [ ] **Step 6: Run the smoke test + full suite**

Run: `pnpm vitest run src/App.test.tsx`
Expected: PASS.
Run: `pnpm vitest run`
Expected: all files pass (no test still imports `AppSidebar`).

- [ ] **Step 7: Verify build + lint**

Run: `pnpm build && pnpm lint`
Expected: both succeed (no unused-import or missing-module errors).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: wire AppHeader + FloatingNav shell, retire left sidebar"
```

---

### Task 5: Remove dead sidebar-collapse state

`sidebarCollapsed` had one consumer (`AppSidebar`, now deleted). Remove it from `ViewContext`, update its test, and drop the dead i18n keys.

**Files:**
- Modify: `src/hooks/ViewContext.tsx`
- Modify: `src/hooks/ViewContext.test.tsx`
- Modify: `src/i18n/locales/en.ts`, `src/i18n/locales/pt-BR.ts`

**Interfaces:**
- Produces: `ViewState` shrinks to `{ view, setView }`. No other module may reference `sidebarCollapsed`/`toggleSidebar` after this task.

- [ ] **Step 1: Update the test first (drop the collapse cases)**

Replace `src/hooks/ViewContext.test.tsx` with:

```tsx
import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useView, ViewProvider } from "./ViewContext";

function Probe() {
	const { view, setView } = useView();
	return (
		<div>
			<span data-testid="view">{view}</span>
			<button type="button" onClick={() => setView("showroom")}>
				go showroom
			</button>
		</div>
	);
}

describe("ViewContext", () => {
	beforeEach(() => localStorage.clear());

	it("defaults to the fretboard view", () => {
		render(
			<ViewProvider>
				<Probe />
			</ViewProvider>,
		);
		expect(screen.getByTestId("view")).toHaveTextContent("fretboard");
	});

	it("switches view and persists it to localStorage", () => {
		render(
			<ViewProvider>
				<Probe />
			</ViewProvider>,
		);
		act(() => screen.getByText("go showroom").click());
		expect(screen.getByTestId("view")).toHaveTextContent("showroom");
		expect(localStorage.getItem("fretboard.view")).toBe("showroom");
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/hooks/ViewContext.test.tsx`
Expected: PASS for the two kept cases is NOT yet guaranteed — but the build/type check will fail later if `ViewState` still carries the old fields used elsewhere. Run it now; expected: PASS (the new test only uses `view`/`setView`, which still exist). This step exists to lock the reduced surface before trimming the provider.

- [ ] **Step 3: Trim `ViewContext.tsx`**

Replace `src/hooks/ViewContext.tsx` with:

```tsx
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
```

- [ ] **Step 4: Remove the dead i18n keys**

In `src/i18n/locales/en.ts`, delete these two lines from the `sidebar` block:

```ts
			expand: "Expand sidebar",
			collapse: "Collapse sidebar",
```

In `src/i18n/locales/pt-BR.ts`, delete the matching two lines:

```ts
			expand: "Expandir menu",
			collapse: "Recolher menu",
```

(Keep `fretboard`, `showroom`, `practice`, `langToggle` in both.)

- [ ] **Step 5: Run the full suite + build + lint**

Run: `pnpm vitest run`
Expected: all pass.
Run: `pnpm build && pnpm lint`
Expected: both succeed — tsc confirms nothing else referenced `sidebarCollapsed`/`toggleSidebar` or the removed keys.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: drop dead sidebar-collapse state and i18n keys"
```

---

## Self-Review

**Spec coverage (Step 2 section of the design spec):**
- AppHeader: fixed frosted bar, logo lockup, section name, language + Metrônomo + Áudio → Tasks 1, 2, 4 (trigger restyle) ✓
- Metrônomo/Áudio become global header popovers, removed from Braço toolbar → Task 4 ✓
- FloatingNav: left capsule, hover-expand, active = gradient → Task 3 ✓
- App.tsx column layout, sidebar floats → Task 4 ✓
- Language switch moved out of the sidebar → Tasks 1, 2 ✓
- `sidebarCollapsed` retired → Task 5 ✓

**Placeholder scan:** none — every step has exact paths, complete code, commands, and expected output.

**Type consistency:** `LanguageToggle()` (Task 1) consumed by `AppHeader` (Task 2). `AppHeader`/`FloatingNav` (Tasks 2/3) consumed by `App.tsx` (Task 4). `AppView` (`@/types/showroom`) used consistently. `ViewState` reduced to `{ view, setView }` in Task 5; the Task 5 test and all post-Task-4 consumers (only `AppHeader`/`FloatingNav`, which use `view`/`setView`) match. The Metrônomo/Áudio trigger className change is identical in both files (Task 4 Step 5).

**Notes:** AppHeader has no standalone visual assertion beyond text presence — its layout is verified by the Task 4 `<App/>` smoke test and human review. The two audio providers are jsdom-safe (the `Metronome` engine creates its `AudioContext` lazily), so the smoke render does not throw.
