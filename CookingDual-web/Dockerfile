FROM node:24-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server.mjs index.html publish.html favicon.svg manifest.webmanifest ./
COPY src ./src
COPY vendor ./vendor
COPY assets ./assets
ENV NODE_ENV=production
ENV PORT=5173
EXPOSE 5173
USER node
CMD ["node", "server.mjs"]
