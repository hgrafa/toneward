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
