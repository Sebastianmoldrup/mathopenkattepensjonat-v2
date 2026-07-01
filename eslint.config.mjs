import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const RAW_PALETTE = /\b(text|bg|border|ring)-(slate|gray|zinc|neutral|stone)-\d+/;

function reportIfPalette(context, node, value) {
  if (typeof value !== "string") return;
  const match = value.match(RAW_PALETTE);
  if (match) {
    context.report({
      node,
      message: `Raw palette class "${match[0]}" is not allowed outside components/ui/. Use a semantic token (bg-background, text-foreground, etc.) instead.`,
    });
  }
}

const noPalettePlugin = {
  rules: {
    "no-raw-palette-colors": {
      meta: {
        type: "suggestion",
        docs: {
          description:
            "Disallow raw Tailwind palette color classes outside src/components/ui/. Use semantic token classes instead.",
        },
      },
      create(context) {
        return {
          JSXAttribute(node) {
            if (node.name?.name !== "className") return;
            if (node.value?.type === "Literal") {
              reportIfPalette(context, node.value, node.value.value);
            }
          },
          CallExpression(node) {
            const name =
              node.callee?.name ??
              node.callee?.property?.name;
            if (name !== "cn" && name !== "clsx" && name !== "cva") return;
            for (const arg of node.arguments) {
              if (arg.type === "Literal") {
                reportIfPalette(context, arg, arg.value);
              }
              if (arg.type === "TemplateLiteral") {
                for (const q of arg.quasis) {
                  reportIfPalette(context, q, q.value.raw);
                }
              }
            }
          },
          TemplateLiteral(node) {
            for (const q of node.quasis) {
              reportIfPalette(context, q, q.value.raw);
            }
          },
        };
      },
    },
  },
};

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/components/ui/**"],
    plugins: { palette: noPalettePlugin },
    rules: {
      "palette/no-raw-palette-colors": "warn",
    },
  },
];

export default eslintConfig;
