FROM node:24-bookworm-slim
WORKDIR /app
COPY bot.mjs usage.mjs package.json ./
CMD ["node", "bot.mjs"]
