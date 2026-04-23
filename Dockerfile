FROM node:22.12.0-alpine

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

# Instalar dependencias (ignorar engine check ya que usamos Node exacto)
RUN npm ci --engine-strict=false

# Generar Prisma client
RUN npx prisma generate

# Copiar el resto del código
COPY . .

EXPOSE 3001

CMD ["node", "src/index.js"]
