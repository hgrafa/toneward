const en = {
	ui: {
		appName: "Scale Training",
		sidebar: {
			expand: "Expand sidebar",
			collapse: "Collapse sidebar",
			fretboard: "Fretboard",
			showroom: "Showroom",
			langToggle: "PT",
		},
		editor: {
			label: "Notes or intervals",
			placeholder: "Enter notes: C E G Bb\nor intervals:\nroot: A\n1 b3 4 5 b7",
		},
		toolbar: {
			notes: "Notes",
			intervals: "Intervals",
			none: "None",
			root: "Root",
			nps: "NPS",
			frets: "Frets",
			copy: "Copy",
			copied: "Copied",
		},
		tuning: {
			instrument: "Instrument",
			tuning: "Tuning",
			custom: "Custom",
			strings_one: "{{count}} string",
			strings_other: "{{count}} strings",
			removeString: "Remove string",
			addString: "Add string",
			stringTuning: "String {{n}} tuning",
		},
		metronome: {
			trigger: "Metronome",
			start: "Start",
			stop: "Stop",
			reset: "Reset",
		},
		audio: {
			trigger: "Audio",
			outputTitle: "Audio output",
			outputDesc: "Choose which device each sound plays through.",
			metronome: "Metronome",
			refresh: "Refresh",
			systemDefault: "System default",
			tip: "Tip: pick different devices per sound to play them separately — e.g. a click on your speakers while practice plays on headphones.",
			noRoutingMsg:
				"This browser plays through the system default output. Per-device routing needs Chrome or Edge.",
		},
		boxPatterns: {
			heading: "Box Patterns",
			pattern: "Pattern {{n}}",
		},
		showroom: {
			youtubePlaceholder: "Paste a YouTube link…",
			load: "Load",
			uploadMp3: "Upload MP3",
		},
	},
	errors: {
		emptyInput: "Empty input",
		noValidNotes: "No valid notes found",
		invalidNote: 'Invalid note: "{{token}}"',
		missingRoot: "Missing root note after 'root:'",
		invalidRootNote: 'Invalid root note: "{{token}}"',
		noIntervals: "No intervals provided",
		invalidInterval: 'Invalid interval: "{{token}}"',
		invalidYoutubeLink: "Enter a valid YouTube link.",
		invalidAudioFile: "Choose an audio file.",
	},
};

export default en;
export type TranslationSchema = typeof en;
