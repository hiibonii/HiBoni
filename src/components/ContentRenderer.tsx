"use client";

import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { readerTheme } from "@/lib/blocknoteTheme";

export default function ContentRenderer({ content }: { content: any }) {
  const editor = useCreateBlockNote({
    initialContent: content && content.length > 0 ? content : undefined,
    domAttributes: {
      editor: { class: "hiboni-reader-editor" },
    },
  });

  if (!content || content.length === 0) {
    return <p className="text-black/50">No content yet.</p>;
  }

  return (
    <div className="bn-readonly">
      <BlockNoteView editor={editor} editable={false} theme={readerTheme} />
    </div>
  );
}
