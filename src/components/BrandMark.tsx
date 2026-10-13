import { cn } from "@/lib/utils";

const MARK_GRADIENT =
	"linear-gradient(150deg,#3A332C 0%,#5B4A45 15%,#C8345F 44%,#F2683C 74%,#FBA63F 100%)";
const MARK_SHADOW =
	"0 3px 12px rgba(58,51,44,.32), inset 0 1px 1px rgba(255,255,255,.35)";

export function BrandMark({ className }: { className?: string }) {
	return (
		<div
			aria-hidden="true"
			className={cn(
				"flex size-9 items-center justify-center rounded-[11px] font-display font-bold text-base text-white",
				className,
			)}
			style={{ background: MARK_GRADIENT, boxShadow: MARK_SHADOW }}
		>
			T
		</div>
	);
}
