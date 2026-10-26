FROM node:24-alpine
WORKDIR /app
COPY package.json server.mjs ./
COPY modules ./modules
COPY migrations ./migrations
COPY public ./public
RUN mkdir -p /var/lib/yilu && chown -R node:node /var/lib/yilu /app
USER node
ENV NODE_ENV=production
ENV YILU_DATA_DIR=/var/lib/yilu
ENV PORT=3000
EXPOSE 3000
CMD ["node","server.mjs"]
