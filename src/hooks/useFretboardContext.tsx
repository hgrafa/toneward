import type { ReactNode } from "react";
import { DerivedProvider } from "./DerivedContext";
import { DisplayProvider } from "./DisplayContext";
import { InputProvider } from "./InputContext";
import { InstrumentProvider } from "./InstrumentContext";

export { useDerived } from "./DerivedContext";
export { useDisplay } from "./DisplayContext";
export { useInput } from "./InputContext";
export { useInstrument } from "./InstrumentContext";

export function FretboardProvider({ children }: { children: ReactNode }) {
	return (
		<InstrumentProvider>
			<DisplayProvider>
				<InputProvider>
					<DerivedProvider>{children}</DerivedProvider>
				</InputProvider>
			</DisplayProvider>
		</InstrumentProvider>
	);
}
