FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY packages/shared/package*.json packages/shared/
COPY apps/api/package*.json apps/api/
RUN npm install
COPY . .
RUN npm run build
FROM node:20-alpine
WORKDIR /app
COPY --from=build /app ./
CMD ["npm", "run", "start", "-w", "apps/api"]
