FROM node:16
WORKDIR /opt/music
EXPOSE 8080
ENV NODE_ENV production

# Copy dependencies first to improve layer caching

COPY package*.json ./
RUN apt-get update && apt-get install -y ffmpeg
RUN npm install
RUN npm install ytdl-core@latest

COPY . .

CMD [ "npm", "start" ]
