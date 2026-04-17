import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { useEffect, useState } from "react";
import { api } from "../api";
import type { Media } from "../types";

interface Props {
  value: string;
  onChange: (html: string) => void;
}

const toolbar = [
  { cmd: "h2", label: "H2" },
  { cmd: "h3", label: "H3" },
  { cmd: "bold", label: "B" },
  { cmd: "italic", label: "I" },
  { cmd: "ul", label: "• Liste" },
  { cmd: "ol", label: "1. Liste" },
  { cmd: "blockquote", label: "❝" },
  { cmd: "link", label: "Link" },
  { cmd: "image", label: "Bild" },
];

export default function RichTextEditor({ value, onChange }: Props) {
  const [inserting, setInserting] = useState(false);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        codeBlock: false,
        code: false,
        horizontalRule: false,
        hardBreak: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        protocols: ["http", "https", "mailto"],
      }),
      Image,
    ],
    content: value || "",
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) return null;

  async function insertImage() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/jpeg,image/webp";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setInserting(true);
      try {
        const form = new FormData();
        form.append("kind", "news");
        form.append("file", file);
        const media = await api.upload<Media>("/api/media", form);
        const src = media.variants["800w"] || media.variants["400w"] || media.variants.fallbackJpg;
        if (src) editor!.chain().focus().setImage({ src, alt: file.name }).run();
      } finally {
        setInserting(false);
      }
    };
    input.click();
  }

  function run(cmd: string) {
    switch (cmd) {
      case "h2": editor!.chain().focus().toggleHeading({ level: 2 }).run(); break;
      case "h3": editor!.chain().focus().toggleHeading({ level: 3 }).run(); break;
      case "bold": editor!.chain().focus().toggleBold().run(); break;
      case "italic": editor!.chain().focus().toggleItalic().run(); break;
      case "ul": editor!.chain().focus().toggleBulletList().run(); break;
      case "ol": editor!.chain().focus().toggleOrderedList().run(); break;
      case "blockquote": editor!.chain().focus().toggleBlockquote().run(); break;
      case "link": {
        const existing = editor!.getAttributes("link").href as string | undefined;
        const url = window.prompt("URL", existing || "https://");
        if (url === null) return;
        if (url === "") {
          editor!.chain().focus().extendMarkRange("link").unsetLink().run();
        } else {
          editor!.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
        }
        break;
      }
      case "image": insertImage(); break;
    }
  }

  return (
    <div className="rounded-sm border border-neutral-800 bg-neutral-950">
      <div className="flex flex-wrap gap-1 border-b border-neutral-800 p-2">
        {toolbar.map((t) => (
          <button
            key={t.cmd}
            type="button"
            onClick={() => run(t.cmd)}
            className="rounded-sm border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs hover:bg-neutral-800"
          >
            {t.label}
          </button>
        ))}
        {inserting && <span className="px-2 py-1 text-xs text-neutral-400">Bild wird hochgeladen…</span>}
      </div>
      <EditorContent
        editor={editor}
        className="prose prose-invert max-w-none px-4 py-3 [&_.ProseMirror]:min-h-[240px] [&_.ProseMirror]:outline-none"
      />
    </div>
  );
}
