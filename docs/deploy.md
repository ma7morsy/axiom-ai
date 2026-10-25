# Deploy (GitHub + Render + Cloudflare Pages)

1. Push this repository to GitHub.
2. Render: New > Blueprint > select the repository. It reads `render.yaml`, creates the database and the API.
   When asked for `Cors__Origins`, enter your Pages address (you can edit it later). Wait for `/health` to say Healthy.
3. Cloudflare: Workers & Pages > Create > Pages > Connect to Git.
   Build command `npm install && npm run build:web`, output directory `apps/mobile/dist`,
   variables `EXPO_PUBLIC_API_URL=https://<your-api>.onrender.com` and `NODE_VERSION=20`.
4. Put the Pages address into `Cors__Origins` on Render and redeploy the API.
5. Open the Pages address, create the admin account, add a model (Admin > Models > Test), upload documents, share the link.
