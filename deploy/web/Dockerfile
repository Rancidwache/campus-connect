# Build the PWA, then serve it from nginx (also the public entrypoint that
# forwards API traffic into the WAF).
FROM node:20-bookworm-slim AS build
WORKDIR /web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /web/dist /usr/share/nginx/html
COPY deploy/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
