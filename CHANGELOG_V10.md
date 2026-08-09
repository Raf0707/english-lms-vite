# Frontend V10

- Added a student in-app catalogue at `/app/catalog` and a sidebar/search entry for it.
- Catalogue now reloads published courses on focus/visibility and has a manual refresh button.
- Added a selection-aware rich text editor for lesson text blocks:
  - font family and size;
  - bold, italic, underline, strike-through;
  - left/center/right/justify alignment;
  - ordered/unordered lists;
  - text and highlight colors;
  - paragraph/heading/blockquote formatting;
  - undo/redo, clear formatting and voice insertion.
- Rich text is persisted in block JSON as `richTextHtml`; plain text remains in `content` for TTS/search/backward compatibility.
- Student lesson renderer sanitizes and renders rich text safely.
