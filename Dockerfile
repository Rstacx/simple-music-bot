FROM node:16
WORKDIR /opt/music

# Copy dependencies first to improve layer caching

COPY package*.json ./
RUN apt-get update && apt-get install -y ffmpeg
RUN npm install
RUN npm install ytdl-core@latest

EXPOSE 8080

COPY . .

CMD [ "npm", "start" ]
