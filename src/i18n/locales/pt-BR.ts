import type { TranslationSchema } from "./en";

const ptBR: TranslationSchema = {
	ui: {
		appName: "Toneward",
		sidebar: {
			expand: "Expandir menu",
			collapse: "Recolher menu",
			fretboard: "Braço",
			showroom: "Showroom",
			langToggle: "Selecionar idioma",
		},
		editor: {
			label: "Notas ou intervalos",
			placeholder:
				"Insira notas: C E G Bb\nou intervalos:\nroot: A\n1 b3 4 5 b7",
		},
		toolbar: {
			notes: "Notas",
			intervals: "Intervalos",
			none: "Nenhum",
			root: "Tônica",
			nps: "NPS",
			frets: "Trastes",
			copy: "Copiar",
			copied: "Copiado",
		},
		tuning: {
			instrument: "Instrumento",
			tuning: "Afinação",
			custom: "Personalizado",
			strings_one: "{{count}} corda",
			strings_other: "{{count}} cordas",
			removeString: "Remover corda",
			addString: "Adicionar corda",
			stringTuning: "Afinação da corda {{n}}",
		},
		metronome: {
			trigger: "Metrônomo",
			start: "Iniciar",
			stop: "Parar",
			reset: "Reiniciar",
		},
		audio: {
			trigger: "Áudio",
			outputTitle: "Saída de áudio",
			outputDesc: "Escolha por qual dispositivo cada som é reproduzido.",
			metronome: "Metrônomo",
			refresh: "Atualizar",
			systemDefault: "Padrão do sistema",
			tip: "Dica: escolha dispositivos diferentes para cada som — ex.: metrônomo no alto-falante e prática no fone.",
			noRoutingMsg:
				"Este navegador usa a saída padrão do sistema. O roteamento por dispositivo requer Chrome ou Edge.",
		},
		boxPatterns: {
			heading: "Padrões de Caixa",
			pattern: "Padrão {{n}}",
		},
		showroom: {
			youtubePlaceholder: "Cole um link do YouTube…",
			load: "Carregar",
			uploadMp3: "Enviar MP3",
			play: "Reproduzir",
			pause: "Pausar",
			seekBack: "Voltar 10 segundos",
			seekForward: "Avançar 10 segundos",
			seek: "Avançar",
			speed: "Velocidade",
			playbackSpeed: "Velocidade de reprodução",
			volume: "Volume",
			expandDock: "Expandir painel",
			collapseDock: "Recolher painel",
			pdfUpload: "Enviar PDF",
			pdfDrag: "…ou arraste um arquivo para a página",
			pdfDrop: "Solte um PDF para abrir",
			pdfClose: "Fechar",
		},
	},
	errors: {
		emptyInput: "Entrada vazia",
		noValidNotes: "Nenhuma nota válida encontrada",
		invalidNote: 'Nota inválida: "{{token}}"',
		missingRoot: "Nota raiz ausente após 'root:'",
		invalidRootNote: 'Nota raiz inválida: "{{token}}"',
		noIntervals: "Nenhum intervalo fornecido",
		invalidInterval: 'Intervalo inválido: "{{token}}"',
		invalidYoutubeLink: "Insira um link válido do YouTube.",
		invalidAudioFile: "Escolha um arquivo de áudio.",
		invalidPdfFile: "Apenas arquivos PDF são suportados.",
	},
};

export default ptBR;
