// Dependencies
require('dotenv').config();
const { generateDependencyReport, AudioPlayerStatus, joinVoiceChannel, createAudioPlayer, createAudioResource, getVoiceConnection  } = require('@discordjs/voice');
const ytdl = require('ytdl-core');
const ytSearch = require('yt-search');
const { Client, Message, ReactionUserManager }  = require('discord.js');
const client = new Client({ intents: ['Guilds', 'GuildMessages', 'MessageContent', 'GuildVoiceStates']})

// Ready
client.on('ready', () => {
  client.user.setStatus('idle')
  client.user.setActivity('Music');
  console.log("rsn music bot ready to play music!");
})

const queue = new Map();

queue.server_queue = null;
queue.player = null;

client.on("messageCreate", (message) => {
    let args = message.content.split(" ");

    switch(args[0]){
      case '*ping':
        pong(message);
        break;
      case '*tick':
        tock(message);
        break;
      case '*play':
        play(message, args);
        break;
      case '*skip':
        skip(message);
        break;
      case '*stop':
        stop(message);
        break;
      case '*pause':
        pause(message);
        break;
      case '*resume':
        resume(message);
        break;
      case '*help':
        help(message);
    }
})

const pong = (message) => {
  message.reply('pong!');
  message.reply(`Latency is ${Date.now() - message.createdTimestamp}ms. API Latency is ${Math.round(client.ws.ping)}ms`);
}

const tock = (message) => {
  message.reply('tock!');
}

async function play(message, args) {
  if (!message.member.voice.channel) return message.reply('You need to be in a voice channel to use this command!');

  if(!args[1]){
    message.reply('Please put a song name or a link!');
    return;
  }

  const server_queue = queue.get(message.guild.id);
  
  queue.server_queue = server_queue;

  if (!args.length) return message.reply('Missing argument!');
    let song = {};

    // Checks if it's a link
    if (ytdl.validateURL(args[1])) {
      const song_info = await ytdl.getInfo(args[1]);
      song = { title: song_info.videoDetails.title, url: song_info.videoDetails.video_url }
    } else {
      const video_finder = async (query) =>{
      const video_result = await ytSearch(query);
      return (video_result.videos.length > 1) ? video_result.videos[0] : null;
    }
      const video = await video_finder(args.join(' '));
      if (video){
        song = { title: video.title, url: video.url }
      } else {
        message.channel.send(`Sorry, I can't find the video.`);
      }
    }

    if (!queue.server_queue){

      const queue_constructor = {
        voice_channel: message.member.voice.channel,
        text_channel: message.channel,
        connection: null,
        songs: []
      }
      
      queue.queue_constructor = queue_constructor;

      queue.set(message.guild.id, queue_constructor);
      queue_constructor.songs.push(song);

      try {
        // Connect to a voice channel
        const connection = joinVoiceChannel({
          channelId: message.member.voice.channel.id,
          guildId: message.guild.id,
          adapterCreator: message.guild.voiceAdapterCreator,
        })

        queue_constructor.connection = connection;
        
        play_audio(message.guild, queue_constructor.songs[0]);
      } catch (err) {
          queue.delete(message.guild.id);
          message.channel.send('Connection error!');
          throw err;
      }
  } else{
      server_queue.songs.push(song);
      return message.channel.send(`**${song.title}** is now added to queue!`);
  }
}

const play_audio = async (guild, song) => {
  const song_queue = queue.get(guild.id);

  // End of music list has been reached
  if (!song) {
    queue.queue_constructor.connection.destroy();
    queue.server_queue = null;
    queue.player = null;
    queue.delete(guild.id);
    return;
  }

  const player = createAudioPlayer();

  queue.player = player;

  player.on(AudioPlayerStatus.Playing, () => {
    // Everything is working!
  });

  player.on('error', error => {
    console.error(`Error: ${error.message} with resource.`);
  });

  const stream = ytdl(song.url, { filter: 'audioonly' });

  let resource = createAudioResource(stream);
  player.play(resource);

  const connection = queue.queue_constructor.connection;
  connection.subscribe(player);

  player.on(AudioPlayerStatus.Idle, () => {
    song_queue.songs.shift();
    play_audio(guild, song_queue.songs[0]);
  });

  await song_queue.text_channel.send(`Now playing **${queue.queue_constructor.songs[0].title}**.`)
}

const skip = (message) => {
  if (!message.member.voice.channel) return message.reply('You need to be in a voice channel to use this command!');

  if (queue.server_queue === null) {
    return message.reply('No songs to skip!');
  }

  const song_queue = queue.get(message.guild.id);

  song_queue.songs.shift();

  play_audio(message.guild, song_queue.songs[0], queue.queue_constructor);
}

const stop = (message) => {
  if (!message.member.voice.channel) return message.reply('You need to be in a voice channel to use this command!');

  if (queue.server_queue === null) {
    return message.reply('No songs to stop!');
  }

  queue.queue_constructor.connection.destroy();
  queue.server_queue = null;
  queue.player = null;
  queue.delete(message.guild.id);
}

const pause = (message) => {
  if (!message.member.voice.channel) return message.reply('You need to be in a voice channel to use this command!');

  if (queue.player === null) {
    return message.reply('No audio playing!');
  }

  queue.player.pause();
}

const resume = (message) => {
  if (!message.member.voice.channel) return message.reply('You need to be in a voice channel to use this command!');

  if (queue.player === null) {
    return message.reply('No audio playing!');
  }

  queue.player.unpause();
}

const help = (message) => {
  const exampleEmbed = {
    color: 0x0099ff,
    title: 'Help Panel',
    description: 'Welcome to the help panel!',
    fields: [
      {
        name: '*play',
        value: 'Seach and play songs!',
      },
      {
        name: '*pause',
        value: 'Pauses the currently played music!',
        inline: true,
      },
      {
        name: '*resume',
        value: 'Resumes the currently paused music!',
        inline: true,
      },
      {
        name: '*stop',
        value: 'Ends the currently played music!',
        inline: true,
      },
      {
        name: '*ping',
        value: 'Gives you the ping of the bot and responds with `pong`.',
        inline: true,
      },
      {
        name: '*tick',
        value: 'Bot responds with `tock`.',
        inline: true,
      },
    ],
    timestamp: new Date().toISOString(),
    footer: {
      text: 'Raveesh Nilaweera',
    },
  };
  
  message.channel.send({ embeds: [exampleEmbed] });
}

// Login
client.login(process.env.TOKEN);
