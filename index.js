const express = require('express');
const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');

// Bot Configuration
const ip = "novasprak.aternos.me"; // Server IP
const port = 32289; // Server Port
const botName = "RIDER420"; // Bot Username
const version = "1.12.1"; // Minecraft version, ensure compatibility with the server

let activeBot = null; // Track the active bot instance

// Create Express app
const app = express();
app.use(express.json());

const serverPort = 3000; // Local server port

// Function to create and connect the bot
const createBotInstance = () => {
  if (activeBot) {
    console.log('[Bot] A bot is already running.');
    return;
  }

  console.log('[Bot] Attempting to connect...');

  const bot = mineflayer.createBot({
    username: botName,
    host: ip,
    port,
    version,
  });

  activeBot = bot;

  bot.once('spawn', () => {
    console.log(`[Bot] ${botName} connected to ${ip}:${port}`);
    bot.chat('Hello! I am back and ready to assist!');
    startRandomMovement(bot);
  });

  // Handle bot disconnection and automatically reconnect
  bot.on('end', () => {
    console.log('[Bot] Disconnected. Reconnecting...');
    activeBot = null;
    reconnectBot();
  });

  bot.on('kicked', (reason) => {
    console.warn(`[Bot] Kicked from the server: ${reason}`);
    activeBot = null;
    reconnectBot();
  });

  bot.on('error', (err) => {
    console.error(`[Bot] Error encountered: ${err.message}`);
    activeBot = null;
    reconnectBot();
  });
};

// Function to generate random coordinates within a range
const getRandomCoordinates = () => {
  const x = Math.floor(Math.random() * 1000) - 500; // Random X between -500 and 500
  const z = Math.floor(Math.random() * 1000) - 500; // Random Z between -500 and 500
  const y = 64; // Default Y-coordinate, adjust if needed (e.g., based on the terrain)
  return { x, y, z };
};

// Function to make the bot move to a random location
const moveToRandomLocation = (bot) => {
  const { x, y, z } = getRandomCoordinates();
  console.log(`[Bot] Moving to random location (${x}, ${y}, ${z})...`);
  runToLocation(bot, x, y, z);
};

// Action: Run to a specific location
const runToLocation = (bot, x, y, z) => {
  const mcData = require('minecraft-data')(bot.version);
  const movements = new Movements(bot, mcData);

  bot.loadPlugin(pathfinder);
  bot.pathfinder.setMovements(movements);

  const goal = new goals.GoalBlock(x, y, z);
  bot.pathfinder.setGoal(goal);
  bot.chat(`Running to location (${x}, ${y}, ${z})...`);
};

// Function to start random movement at regular intervals
const startRandomMovement = (bot) => {
  setInterval(() => {
    if (bot && bot.entity) {
      moveToRandomLocation(bot);
    }
  }, 5 * 60 * 1000); // Every 5 minutes (5 * 60 * 1000 ms)
};

// Function to handle automatic reconnection with delay
const reconnectBot = () => {
  const reconnectDelay = 5000; // Delay in milliseconds (5 seconds)
  console.log(`[Bot] Reconnecting in ${reconnectDelay / 1000} seconds...`);

  // Reconnect logic with retry limit
  const reconnectAttempts = 5;
  let attempts = 0;

  const reconnectInterval = setInterval(() => {
    if (attempts < reconnectAttempts) {
      console.log(`[Bot] Attempt ${attempts + 1} to reconnect...`);
      createBotInstance();
      attempts += 1;
    } else {
      console.log('[Bot] Maximum reconnection attempts reached.');
      clearInterval(reconnectInterval);
    }
  }, reconnectDelay);
};

// API Route: Start the bot
app.post('/start-bot', (req, res) => {
  if (activeBot) {
    return res.status(400).json({ error: 'A bot is already running.' });
  }

  createBotInstance();
  res.status(201).json({ message: 'Bot started successfully.' });
});

// API Route: Stop the bot
app.post('/stop-bot', (req, res) => {
  if (!activeBot) {
    return res.status(400).json({ error: 'No bot is currently running.' });
  }

  activeBot.quit();
  activeBot = null;
  console.log('[Bot] Bot stopped successfully');
  res.status(200).json({ message: 'Bot stopped successfully' });
});

// API Route: Get bot status
app.get('/bot-status', (req, res) => {
  if (!activeBot) {
    return res.status(200).json({ status: 'No bot running' });
  }

  res.status(200).json({
    status: 'Running',
    botName: activeBot.username,
    host: activeBot.host,
    port: activeBot.port,
  });
});

// Start the Express server
app.listen(serverPort, () => {
  console.log(`Server running on http://localhost:${serverPort}`);
});

// Automatically start the bot if it's not running
createBotInstance();
