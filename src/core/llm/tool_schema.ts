import OpenAI from "openai";

export const HARNESS_TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "ui_dump",
      description: "Get collapsed, interactive UI tree with synthesized element keys (SEKs).",
      parameters: {
        type: "object",
        properties: {
          full: {
            type: "boolean",
            description: "If true, returns full tree details rather than collapsed interactive tree.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "ui_tap",
      description: "Tap an interactive element by its synthesized element key (SEK).",
      parameters: {
        type: "object",
        properties: {
          element_key: {
            type: "string",
            description: "The SEK of the target element (e.g. auth_screen/button:log-in or id:btn_submit).",
          },
        },
        required: ["element_key"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "ui_type",
      description: "Type text into a focused text input field element key (SEK).",
      parameters: {
        type: "object",
        properties: {
          element_key: {
            type: "string",
            description: "The SEK of the target text input.",
          },
          text: {
            type: "string",
            description: "The text to type into the element.",
          },
          clear_first: {
            type: "boolean",
            description: "Clear existing text before typing.",
          },
        },
        required: ["element_key", "text"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "flutter_hot_reload",
      description: "Trigger instant Flutter hot reload via Dart Tooling Daemon (DTD).",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "flutter_analyze",
      description: "Run Dart analyzer / LSP check to verify zero compile or type errors.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "logcat_tail",
      description: "Fetch recent crash logs and stack traces filtered for current package.",
      parameters: {
        type: "object",
        properties: {
          lines: {
            type: "number",
            description: "Number of logcat lines to tail (default 200).",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_files",
      description: "List existing files in the workspace directory to discover project structure.",
      parameters: {
        type: "object",
        properties: {
          dir_path: {
            type: "string",
            description: "Directory path relative to workspace root (optional, defaults to root).",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read the full line contents of an existing source file before editing.",
      parameters: {
        type: "object",
        properties: {
          target_file: {
            type: "string",
            description: "Workspace-relative or absolute path to target file.",
          },
        },
        required: ["target_file"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_file",
      description: "Create a new source file or asset in the workspace directory.",
      parameters: {
        type: "object",
        properties: {
          target_file: {
            type: "string",
            description: "Workspace-relative or absolute path to new file.",
          },
          content: {
            type: "string",
            description: "Initial text content of the file.",
          },
        },
        required: ["target_file", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "edit_file",
      description: "Apply targeted replacements to an existing source code file.",
      parameters: {
        type: "object",
        properties: {
          target_file: {
            type: "string",
            description: "Absolute or workspace-relative path to file.",
          },
          instruction: {
            type: "string",
            description: "Explanation of the code change.",
          },
          target_content: {
            type: "string",
            description: "Exact line content to be replaced.",
          },
          replacement_content: {
            type: "string",
            description: "Replacement line content.",
          },
        },
        required: ["target_file", "instruction", "target_content", "replacement_content"],
      },
    },
  },
];
