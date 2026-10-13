import { LogIn } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/AuthContext";
import { useView } from "@/hooks/ViewContext";
import { UserAvatar } from "./UserAvatar";

const PILL =
	"flex h-9 items-center gap-2 rounded-lg border border-border bg-card font-semibold text-secondary-foreground text-sm transition-colors hover:bg-muted data-[active=true]:border-transparent data-[active=true]:bg-foreground data-[active=true]:text-background";

export function AccountButton() {
	const { t } = useTranslation();
	const { configured, loading, user } = useAuth();
	const { view, setView } = useView();

	if (!configured) return null;
	if (loading) {
		return <div aria-hidden="true" className="size-9 rounded-lg bg-muted" />;
	}

	const active = view === "account";

	if (user) {
		return (
			<button
				type="button"
				aria-label={t("ui.account.section")}
				data-active={active}
				onClick={() => setView("account")}
				className={`${PILL} w-9 justify-center`}
			>
				<UserAvatar user={user} className="size-6" />
			</button>
		);
	}

	return (
		<button
			type="button"
			aria-label={t("ui.account.signIn")}
			data-active={active}
			onClick={() => setView("account")}
			className={`${PILL} px-3`}
		>
			<LogIn className="size-4 shrink-0" />
			<span className="hidden sm:inline">{t("ui.account.signIn")}</span>
		</button>
	);
}
