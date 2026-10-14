import type { User } from "@supabase/supabase-js";
import { ChevronDown, LogIn, LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/AuthContext";
import { useView } from "@/hooks/ViewContext";
import { displayName, firstName, UserAvatar } from "./UserAvatar";

const PILL =
	"flex h-9 items-center gap-2 rounded-lg border border-border bg-card font-semibold text-secondary-foreground text-sm transition-colors hover:bg-muted";

export function AccountButton() {
	const { t } = useTranslation();
	const { configured, loading, user } = useAuth();
	const { setAccountOpen } = useView();

	if (!configured) return null;
	if (loading) {
		return <div aria-hidden="true" className="size-9 rounded-lg bg-muted" />;
	}

	if (user) return <AccountMenu user={user} />;

	return (
		<button
			type="button"
			aria-label={t("ui.account.signIn")}
			onClick={() => setAccountOpen(true)}
			className={`${PILL} px-3`}
		>
			<LogIn className="size-4 shrink-0" />
			<span className="hidden sm:inline">{t("ui.account.signIn")}</span>
		</button>
	);
}

function AccountMenu({ user }: { user: User }) {
	const { t } = useTranslation();
	const { signOut, error } = useAuth();
	const name = displayName(user);
	const first = firstName(user);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					aria-label={t("ui.account.menuLabel", { name: first })}
					className={`${PILL} px-1.5 data-[state=open]:border-transparent data-[state=open]:bg-foreground data-[state=open]:text-background sm:pr-2.5`}
				>
					<UserAvatar user={user} className="size-6" />
					<span className="hidden max-w-32 truncate sm:inline">{first}</span>
					<ChevronDown className="hidden size-3.5 shrink-0 opacity-70 sm:block" />
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" sideOffset={10} className="w-56 p-1.5">
				<DropdownMenuLabel className="flex items-center gap-2.5 px-2 py-2">
					<UserAvatar user={user} className="size-8 text-sm" />
					<span className="truncate font-semibold text-foreground">{name}</span>
				</DropdownMenuLabel>
				{error && (
					<p
						role="alert"
						className="mx-2 mb-1 rounded-md bg-destructive/10 px-2 py-1.5 text-destructive text-xs"
					>
						{error}
					</p>
				)}
				<DropdownMenuSeparator />
				<DropdownMenuItem onSelect={signOut} className="font-medium">
					<LogOut />
					{t("ui.account.signOut")}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
