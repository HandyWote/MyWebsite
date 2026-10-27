import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PixelProvider } from "../PixelProvider";
import PixelPromptInput, {
	type PixelPromptInputProps,
} from "./PixelPromptInput";

type ControlledProps = Omit<PixelPromptInputProps, "value" | "onChange"> & {
	initialValue?: string;
	onValue?: (value: string) => void;
};

/** 受控包装：真实使用形态，值由父组件持有。 */
function Controlled({ initialValue = "", onValue, ...props }: ControlledProps) {
	const [value, setValue] = useState(initialValue);
	return (
		<PixelPromptInput
			{...props}
			value={value}
			onChange={(next) => {
				setValue(next);
				onValue?.(next);
			}}
		/>
	);
}

const renderPrompt = (ui: ReactNode) =>
	render(<PixelProvider>{ui}</PixelProvider>);

/** 镜像层（可见文本 + 光标）对读屏隐藏，因此用 aria-hidden 定位它。 */
const mirrorOf = (container: HTMLElement): HTMLElement => {
	const mirror = container.querySelector<HTMLElement>('[aria-hidden="true"]');
	if (!mirror) throw new Error("mirror layer not found");
	return mirror;
};

function setPointer(matches: boolean): void {
	vi.mocked(window.matchMedia).mockImplementation(
		(query: string) =>
			({
				matches,
				media: query,
				onchange: null,
				addListener: vi.fn(),
				removeListener: vi.fn(),
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				dispatchEvent: vi.fn(),
			}) as unknown as MediaQueryList,
	);
}

afterEach(() => {
	setPointer(false);
});

describe("PixelPromptInput", () => {
	it("renders the prompt label and echoes typed text in the mirror layer", () => {
		const onValue = vi.fn();
		const { container } = renderPrompt(
			<Controlled prompt="ada@~ $" onValue={onValue} />,
		);

		// 标签与输入框关联：点标签文本即聚焦/label 查询可用。
		const input = screen.getByLabelText("ada@~ $");
		fireEvent.change(input, { target: { value: "help" } });

		expect(onValue).toHaveBeenCalledWith("help");
		expect(input).toHaveValue("help");
		expect(mirrorOf(container).textContent).toBe("help");
	});

	it("exposes exactly one textbox to assistive tech (mirror is aria-hidden)", () => {
		const { container } = renderPrompt(
			<Controlled prompt="$" initialValue="whoami" />,
		);

		expect(screen.getAllByRole("textbox")).toHaveLength(1);
		expect(mirrorOf(container)).toHaveAttribute("aria-hidden", "true");
	});

	it("masks a secret value in the mirror but keeps the real value in the input", () => {
		const { container } = renderPrompt(
			<Controlled prompt="password:" mode="secret" initialValue="hunter2" />,
		);

		const input = screen.getByLabelText("Password");
		expect(input).toHaveValue("hunter2");
		expect(mirrorOf(container).textContent).toBe("*******");
	});

	it("gives every instance its own stable id", () => {
		renderPrompt(
			<>
				<Controlled prompt="first$" ariaLabel="first" />
				<Controlled prompt="second$" ariaLabel="second" />
			</>,
		);

		const first = screen.getByLabelText("first");
		const second = screen.getByLabelText("second");
		expect(first.id).toBeTruthy();
		expect(second.id).toBeTruthy();
		expect(first.id).not.toBe(second.id);
		// useId 只在重挂后仍然唯一，不依赖 cwd 之类会变的输入。
		expect(screen.getByLabelText("first$")).toBe(first);
	});

	it("submits on Enter", () => {
		const onSubmit = vi.fn();
		renderPrompt(
			<Controlled prompt="$" initialValue="help" onSubmit={onSubmit} />,
		);

		fireEvent.keyDown(screen.getByLabelText("Prompt input"), {
			key: "Enter",
		});

		expect(onSubmit).toHaveBeenCalledTimes(1);
	});

	it("ignores other keys and Enter used to confirm an IME composition", () => {
		const onSubmit = vi.fn();
		renderPrompt(<Controlled prompt="$" onSubmit={onSubmit} />);
		const input = screen.getByLabelText("Prompt input");

		fireEvent.keyDown(input, { key: "a" });
		fireEvent.keyDown(input, { key: "Enter", isComposing: true });

		expect(onSubmit).not.toHaveBeenCalled();
	});

	it("lets onKeyDown take over Enter before onSubmit runs", () => {
		const order: string[] = [];
		const onSubmit = vi.fn(() => order.push("submit"));
		renderPrompt(
			<Controlled
				prompt="$"
				onSubmit={onSubmit}
				onKeyDown={(event) => {
					order.push(`key:${event.key}`);
					if (event.key === "Enter") event.preventDefault();
				}}
			/>,
		);

		fireEvent.keyDown(screen.getByLabelText("Prompt input"), {
			key: "Enter",
		});

		expect(order).toEqual(["key:Enter"]);
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it("blinks the cursor only while the real input is focused", () => {
		const { container } = renderPrompt(<Controlled prompt="$" />);
		const input = screen.getByLabelText("Prompt input");
		expect(container.querySelector(".cursor-blink")).toBeNull();

		act(() => {
			input.focus();
		});
		expect(document.activeElement).toBe(input);
		expect(container.querySelector(".cursor-blink")).not.toBeNull();

		act(() => {
			input.blur();
		});
		expect(document.activeElement).not.toBe(input);
		expect(container.querySelector(".cursor-blink")).toBeNull();
	});

	it("keeps focus while busy instead of disabling the input", () => {
		const { unmount } = renderPrompt(<Controlled prompt="$" disabled />);
		expect(screen.getByLabelText("Prompt input")).toBeDisabled();
		unmount();

		// busy 不能用 disabled：disabled 会让浏览器把焦点扔回 body，正在提交的
		// 密码框随即失焦（工单 #16「输错一次就得重新点一下」）。readOnly 只挡输入。
		const busyRender = renderPrompt(<Controlled prompt="$" busy />);
		const busyInput = screen.getByLabelText("Prompt input");
		expect(busyInput).not.toBeDisabled();
		expect(busyInput).toHaveAttribute("readonly");
		// busy 期间输入不生效（readOnly），但已有焦点不被拿走。
		act(() => {
			busyInput.focus();
		});
		expect(document.activeElement).toBe(busyInput);
		// 注：「readOnly 拒绝输入」是浏览器行为，fireEvent 会绕过它，所以不断言；
		// 这里只钉住「没被 disabled、焦点还在」，这两条才是旧实现丢掉的。
		busyRender.unmount();
	});

	it("auto-focuses on fine-pointer devices only", () => {
		setPointer(true);
		const first = renderPrompt(
			<Controlled prompt="$" autoFocusPolicy="fine-pointer" />,
		);
		expect(document.activeElement).toBe(screen.getByLabelText("Prompt input"));
		first.unmount();

		setPointer(false);
		renderPrompt(<Controlled prompt="$" autoFocusPolicy="fine-pointer" />);
		expect(document.activeElement).not.toBe(
			screen.getByLabelText("Prompt input"),
		);
	});

	it("never steals focus from an already focused element on mount", () => {
		setPointer(true);
		const comment = document.createElement("input");
		document.body.appendChild(comment);
		comment.id = "comment-box";
		comment.focus();

		renderPrompt(<Controlled prompt="$" autoFocusPolicy="fine-pointer" />);

		expect(document.activeElement).toBe(comment);
	});
});
