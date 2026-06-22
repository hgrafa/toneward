export interface PracticeScore {
	score: number;
	totalTimeMs: number;
	date: number; // Date.now() at game end
}

const STORAGE_KEY = "toneward.practice.scores";
const MAX_SAVED = 10;

function compareScores(a: PracticeScore, b: PracticeScore): number {
	if (b.score !== a.score) return b.score - a.score;
	return a.totalTimeMs - b.totalTimeMs;
}

export function loadScores(): PracticeScore[] {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return [];
		return (JSON.parse(raw) as PracticeScore[]).sort(compareScores);
	} catch {
		return [];
	}
}

export function saveScore(entry: PracticeScore): void {
	const scores = loadScores();
	scores.push(entry);
	scores.sort(compareScores);
	localStorage.setItem(STORAGE_KEY, JSON.stringify(scores.slice(0, MAX_SAVED)));
}

export function formatTime(ms: number): string {
	const totalSecs = Math.floor(ms / 1000);
	const mins = Math.floor(totalSecs / 60);
	const secs = totalSecs % 60;
	if (mins === 0) return `${secs}s`;
	return `${mins}m ${secs}s`;
}

export function formatDate(ts: number): { date: string; time: string } {
	const d = new Date(ts);
	return {
		date: d.toLocaleDateString([], { month: "short", day: "numeric" }),
		time: d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
	};
}
