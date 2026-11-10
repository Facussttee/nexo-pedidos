# Multi-stage production Dockerfile for Nexo Pedidos Demo/Static Server
FROM node:20-alpine AS runner

WORKDIR /app

# Production env
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Copy only runtime scripts and source necessary for build
COPY package.json* ./
COPY bot ./bot
COPY js ./js
COPY css ./css
COPY index.html ./
COPY scripts ./scripts

# Build isolated public artifacts into /app/dist/public
RUN node scripts/build-public.mjs

# Run as non-root user
USER node

EXPOSE 3000

# Healthcheck testing static root
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/ || exit 1

CMD ["node", "bot/serve-demo.js", "--host", "0.0.0.0", "--port", "3000", "--no-build"]
