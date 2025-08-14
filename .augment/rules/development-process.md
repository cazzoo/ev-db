---
type: "always_apply"
---

- No need to restart the backend and frontend since it is started in dev mode (hot-reload)
- If not started, start the backend with "pnpm --filter backend dev"
- If not started, start the frontend with "pnpm --filter frontend dev"
- check regularly that there are no TSX issues
- Ensure maintainability, avoiding big files. Consider splitting complex logic in smaller chunks/files
- Comment code only as necessary but don't over document, KISS principle
- Provide technical documentation (md file in /docs) for major features, with detailed behaviour
