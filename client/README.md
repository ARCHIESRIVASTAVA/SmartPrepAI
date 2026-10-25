# SmartPrep AI client

React and TypeScript frontend, built with Vite and deployed on Vercel.

## Scripts

- `npm run dev` starts the dev server
- `npm run build` typechecks and builds for production
- `npm run lint` runs ESLint
- `npm run preview` serves the production build locally

## Structure

- `src/App.tsx`: layout, tab navigation and the server status light
- `src/views/TitleScreen.tsx` and `StageSelect.tsx`: the opening screen and the level-select map
- `src/views/`: one component per tab (Ask, Flashcards, Slides, Quiz blitz, Resume, Questions, Mock interview)
- `src/components/` and `src/lib/`: shared UI pieces and helpers
- `src/lib/progress.ts`: XP, levels, streak and topic scores saved in localStorage
- `src/lib/voice.ts` and `src/lib/shareCard.ts`: speech input/output and the share-card image
- `src/api.ts`: the backend URL and the streaming chat client
- `src/index.css`: design tokens (colors, fonts)
- `src/App.css`: layout and component styles

## Notes

- The backend address is `API_URL` in `src/api.ts`. Change it to `http://localhost:10000` to test against a local server.
- All views stay mounted and are hidden when inactive, so an unfinished answer, upload or interview survives switching tabs.
- Fonts (Schibsted Grotesk and IBM Plex Mono) are bundled with `@fontsource`, so the page makes no external font requests.
