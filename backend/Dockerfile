FROM node:20.19-alpine3.22

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

RUN addgroup -S app && adduser -S app -G app
COPY --chown=app:app . .
RUN mkdir -p /app/uploads && chown -R app:app /app
USER app

EXPOSE 5000
CMD ["node", "server.js"]
