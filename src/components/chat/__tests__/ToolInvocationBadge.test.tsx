import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolInvocationBadge, getLabel } from "../ToolInvocationBadge";
import type { ToolInvocation } from "ai";

afterEach(() => {
  cleanup();
});

// --- getLabel unit tests ---

test("getLabel: create → 'Creating <file>'", () => {
  expect(getLabel("str_replace_editor", { command: "create", path: "/src/App.jsx" })).toBe("Creating App.jsx");
});

test("getLabel: str_replace → 'Editing <file>'", () => {
  expect(getLabel("str_replace_editor", { command: "str_replace", path: "/src/Button.tsx" })).toBe("Editing Button.tsx");
});

test("getLabel: insert → 'Editing <file>'", () => {
  expect(getLabel("str_replace_editor", { command: "insert", path: "/src/index.tsx" })).toBe("Editing index.tsx");
});

test("getLabel: view → 'Reading <file>'", () => {
  expect(getLabel("str_replace_editor", { command: "view", path: "/src/utils.ts" })).toBe("Reading utils.ts");
});

test("getLabel: undo_edit → 'Undoing edit in <file>'", () => {
  expect(getLabel("str_replace_editor", { command: "undo_edit", path: "/src/App.jsx" })).toBe("Undoing edit in App.jsx");
});

test("getLabel: file_manager rename → 'Renaming <file>'", () => {
  expect(getLabel("file_manager", { command: "rename", path: "/src/Old.tsx" })).toBe("Renaming Old.tsx");
});

test("getLabel: file_manager delete → 'Deleting <file>'", () => {
  expect(getLabel("file_manager", { command: "delete", path: "/src/Unused.tsx" })).toBe("Deleting Unused.tsx");
});

test("getLabel: unknown tool → returns tool name", () => {
  expect(getLabel("some_other_tool", {})).toBe("some_other_tool");
});

test("getLabel: missing path → uses 'file' fallback", () => {
  expect(getLabel("str_replace_editor", { command: "create" })).toBe("Creating file");
});

test("getLabel: nested path → uses only filename", () => {
  expect(getLabel("str_replace_editor", { command: "create", path: "/a/b/c/Component.tsx" })).toBe("Creating Component.tsx");
});

// --- ToolInvocationBadge rendering tests ---

function makeInvocation(
  toolName: string,
  args: Record<string, string>,
  state: "call" | "partial-call" | "result" = "call"
): ToolInvocation {
  if (state === "result") {
    return { toolCallId: "1", toolName, args, state, result: "ok" } as ToolInvocation;
  }
  return { toolCallId: "1", toolName, args, state } as ToolInvocation;
}

test("renders friendly label", () => {
  render(<ToolInvocationBadge toolInvocation={makeInvocation("str_replace_editor", { command: "create", path: "/src/App.jsx" })} />);
  expect(screen.getByText("Creating App.jsx")).toBeDefined();
});

test("shows spinner when state is 'call'", () => {
  const { container } = render(
    <ToolInvocationBadge toolInvocation={makeInvocation("str_replace_editor", { command: "create", path: "/src/App.jsx" }, "call")} />
  );
  expect(container.querySelector(".animate-spin")).not.toBeNull();
});

test("shows spinner when state is 'partial-call'", () => {
  const { container } = render(
    <ToolInvocationBadge toolInvocation={makeInvocation("str_replace_editor", { command: "create", path: "/src/App.jsx" }, "partial-call")} />
  );
  expect(container.querySelector(".animate-spin")).not.toBeNull();
});

test("hides spinner when state is 'result'", () => {
  const { container } = render(
    <ToolInvocationBadge toolInvocation={makeInvocation("str_replace_editor", { command: "create", path: "/src/App.jsx" }, "result")} />
  );
  expect(container.querySelector(".animate-spin")).toBeNull();
});
