export type AppView = "fretboard" | "showroom" | "practice";

export type AudioSource =
	| { kind: "youtube"; videoId: string; url: string; title: string }
	| { kind: "mp3"; objectUrl: string; title: string };

export interface ShowroomDocument {
	name: string;
	objectUrl: string;
}
