"use client";

import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";

export default function Editor({
  initialContent,
  onChange,
}: {
  initialContent?: any;
  onChange: (blocks: any) => void;
}) {
  const editor = useCreateBlockNote({
    initialContent:
      initialContent && initialContent.length > 0 ? initialContent : undefined,
  });

  return (
    <div className="border border-black/10 bg-white min-h-[300px]">
      <BlockNoteView
        editor={editor}
        theme="light"
        onChange={() => onChange(editor.document)}
      />
    </div>
  );
}
