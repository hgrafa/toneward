import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LanguageToggle } from "@/components/LanguageToggle";

describe("LanguageToggle", () => {
	it("renders the current language as an accessible trigger", () => {
		render(<LanguageToggle />);
		// i18n is initialized to "en" in test setup.
		const trigger = screen.getByLabelText("Select language");
		expect(trigger).toBeInTheDocument();
		expect(trigger).toHaveTextContent("EN");
	});
});
