import type { User } from "@supabase/supabase-js";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function displayName(user: User): string {
	const meta = user.user_metadata;
	return meta.full_name ?? meta.name ?? user.email ?? "";
}

/** "Hugo" for "Hugo Rafael"; the email's local part when no name was given. */
export function firstName(user: User): string {
	const meta = user.user_metadata;
	const name: string | undefined = meta.full_name ?? meta.name;
	if (name?.trim()) return name.trim().split(/\s+/)[0];
	return user.email?.split("@")[0] ?? "";
}

export function UserAvatar({
	user,
	className,
}: {
	user: User;
	className?: string;
}) {
	const [broken, setBroken] = useState(false);
	const src: string | undefined =
		user.user_metadata.avatar_url ?? user.user_metadata.picture;
	const initial = displayName(user).charAt(0).toUpperCase() || "?";

	if (src && !broken) {
		return (
			<img
				src={src}
				alt=""
				referrerPolicy="no-referrer"
				onError={() => setBroken(true)}
				className={cn("size-7 shrink-0 rounded-full object-cover", className)}
			/>
		);
	}

	return (
		<span
			aria-hidden="true"
			className={cn(
				"flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary font-display font-bold text-secondary-foreground text-xs",
				className,
			)}
		>
			{initial}
		</span>
	);
}
