# ---- Build stage ----
FROM node:20-alpine AS build
WORKDIR /app

# Dependencies as their own cached layer. npm install rather than npm ci -- the lockfile
# has platform-conditional optional deps (native binaries for esbuild/rollup) that don't
# always match exactly between the host OS that generated it and this Linux build image.
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# ---- Runtime stage ----
FROM nginx:alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
