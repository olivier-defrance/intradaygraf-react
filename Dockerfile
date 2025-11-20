# rebuild-3
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build


# STAGE FINAL — utiliser les artefacts
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf

# ATTENTION : on copie depuis le builder
COPY --from=builder /app/dist /usr/share/nginx/html

