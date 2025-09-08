FROM node:20-alpine
WORKDIR /usr/src/app

# (Native modül ihtimaline karşı) derleme araçları
RUN apk add --no-cache python3 make g++ libc6-compat

# Lock dosyan yoksa npm ci kullanma → npm install
COPY package*.json ./
RUN npm install --no-audit --no-fund --legacy-peer-deps

# Uygulama kodu
COPY . .

EXPOSE 3000
CMD ["npm","run","dev"]
