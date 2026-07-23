import type { Theme } from "@blocknote/mantine";
import { lightDefaultTheme } from "@blocknote/mantine";

// Used for the public article/story detail page: transparent background so
// the content blends into the page instead of sitting in a white box.
export const readerTheme = {
  ...lightDefaultTheme,
  colors: {
    ...lightDefaultTheme.colors,
    editor: {
      text: "#1a1a1a",
      background: "transparent",
    },
  },
} satisfies Theme;
