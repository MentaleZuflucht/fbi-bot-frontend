# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

ARG FRONTEND_PASSWORD
ARG BACKEND_API_URL
ARG BACKEND_API_KEY

ENV FRONTEND_PASSWORD=${FRONTEND_PASSWORD} \
    BACKEND_API_URL=${BACKEND_API_URL} \
    BACKEND_API_KEY=${BACKEND_API_KEY}

RUN npm run build

# Production stage
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
