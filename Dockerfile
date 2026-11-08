# مرحلة البناء
FROM node:20-alpine AS build
WORKDIR /app
# NOTE: no package-lock.json in repo — generate one (`npm i --package-lock-only`)
# then switch both stages to `npm ci` for reproducible builds.
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

# مرحلة التشغيل (تطبيق + API على نفس المنفذ)
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
RUN npm install --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY server ./server
VOLUME ["/app/server/data"]
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/api/health || exit 1
CMD ["node", "server/index.js"]
