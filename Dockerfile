FROM node:22-alpine

WORKDIR /app

COPY backend/package*.json ./
RUN npm install

COPY backend ./

EXPOSE 8000
CMD ["npm", "start"]
