FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ENV VITE_USE_MOCK_DATA=false
ENV VITE_MOCK_LOGGED_IN=false
# Never ship typed fixtures, whatever a .env says (S0, 15 Oct).
ENV VITE_V2_MOCKS=false
ENV VITE_V2_PUBLIC=true
ENV VITE_V2_FORMAT_REDIRECTS=true

RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
