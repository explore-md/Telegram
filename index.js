// ==================== RED DRAGON GWE BOT ====================
// Created by: @gwetha
// Bot: @Reddragongwebot
// Channel: @darknessfreenetsquad
// Main File: index.js
// ============================================================

const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const axios = require('axios');
const cron = require('node-cron');
const app = express();

// ===== CONFIGURATION =====
const BOT_TOKEN = process.env.BOT_TOKEN; // SET IN RENDER
const CHANNEL_USERNAME = '@darknessfreenetsquad';
const ADMIN_USERNAME = '@gwetha';
const WHATSAPP_LINK = 'https://whatsapp.com/channel/0029Vb6OUffBlHpYPcDA592D';

// Check token
if (!BOT_TOKEN) {
  console.error('❌ ERROR: BOT_TOKEN environment variable is missing!');
  console.error('Set it in Render dashboard → Environment');
  process.exit(1);
}

// Initialize bot
const bot = new TelegramBot(BOT_TOKEN, {
  polling: false,
  onlyFirstMatch: true
});

// ===== DATABASE =====
class UserDatabase {
  constructor() {
    this.users = new Map();
    this.stats = {
      totalStarts: 0,
      totalMessages: 0,
      verifiedUsers: 0,
      commandsUsed: {}
    };
  }

  addUser(chatId, userData) {
    this.users.set(chatId, {
      ...userData,
      joinDate: new Date(),
      messageCount: 0,
      lastActive: new Date(),
      verified: false,
      commands: []
    });
    this.stats.totalStarts++;
  }

  verifyUser(chatId) {
    const user = this.users.get(chatId);
    if (user) {
      user.verified = true;
      user.verifiedDate = new Date();
      this.stats.verifiedUsers++;
      return true;
    }
    return false;
  }

  getUser(chatId) {
    return this.users.get(chatId);
  }

  logCommand(chatId, command) {
    const user = this.users.get(chatId);
    if (user) {
      user.messageCount++;
      user.lastActive = new Date();
      user.commands.push({ command, time: new Date() });
      
      // Update global stats
      this.stats.totalMessages++;
      this.stats.commandsUsed[command] = (this.stats.commandsUsed[command] || 0) + 1;
    }
  }

  getAllUsers() {
    return Array.from(this.users.values());
  }

  getVerifiedUsers() {
    return this.getAllUsers().filter(u => u.verified);
  }

  getStats() {
    const verifiedUsers = this.getVerifiedUsers().length;
    const totalUsers = this.users.size;
    
    return {
      ...this.stats,
      totalUsers,
      verifiedUsers,
      onlineLast24h: this.getAllUsers().filter(u => 
        (new Date() - u.lastActive) < 24 * 60 * 60 * 1000
      ).length,
      verificationRate: totalUsers > 0 ? Math.round((verifiedUsers/totalUsers)*100) : 0
    };
  }
}

const db = new UserDatabase();

// ===== UTILITY FUNCTIONS =====
async function checkChannelMembership(userId) {
  try {
    const chatMember = await bot.getChatMember(CHANNEL_USERNAME, userId);
    return !['left', 'kicked'].includes(chatMember.status);
  } catch (error) {
    console.error('Channel check error:', error.message);
    return false;
  }
}

async function isAdmin(userId) {
  try {
    const chatMember = await bot.getChatMember(CHANNEL_USERNAME, userId);
    return ['creator', 'administrator'].includes(chatMember.status);
  } catch (error) {
    return false;
  }
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / (24 * 60 * 60));
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((seconds % (60 * 60)) / 60);
  return `${days}d ${hours}h ${minutes}m`;
}

// ===== COMMAND HANDLERS =====

// 🎯 /start
bot.onText(/\/start(?: (.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const startParam = match ? match[1] : null;
  
  db.addUser(chatId, {
    userId,
    username: msg.from.username,
    firstName: msg.from.first_name,
    lastName: msg.from.last_name
  });
  
  db.logCommand(chatId, '/start');
  
  const isMember = startParam === 'verify' ? await checkChannelMembership(userId) : false;
  
  if (startParam === 'verify' && isMember) {
    db.verifyUser(chatId);
    await bot.sendMessage(chatId,
      `✅ *VERIFICATION SUCCESSFUL!*\n\n` +
      `Welcome to Red Dragon GWE Bot 🐉\n\n` +
      `*Now you can use:*\n` +
      `/menu - Main menu\n` +
      `/profile - Your profile\n` +
      `/crypto - Crypto prices\n` +
      `/ping - Check bot status\n\n` +
      `👑 Owner: ${ADMIN_USERNAME}`,
      { parse_mode: 'Markdown' }
    );
    return;
  }
  
  // Welcome message
  await bot.sendMessage(chatId,
    `🐉 *RED DRAGON GWE BOT*\n\n` +
    `*Owner:* ${ADMIN_USERNAME}\n` +
    `*Channel:* ${CHANNEL_USERNAME}\n\n` +
    `🔐 *REQUIREMENT:* Join our channel to unlock all features\n\n` +
    `📝 *VERIFICATION:*\n` +
    `1. Join ${CHANNEL_USERNAME}\n` +
    `2. Click: https://t.me/Reddragongwebot?start=verify\n\n` +
    `📱 *WhatsApp:* ${WHATSAPP_LINK}\n\n` +
    `💡 *Tip:* Use /menu after verification`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✅ Join Channel', url: `https://t.me/${CHANNEL_USERNAME.replace('@', '')}` },
            { text: '🔗 Verify Now', url: 'https://t.me/Reddragongwebot?start=verify' }
          ],
          [
            { text: '📱 WhatsApp', url: WHATSAPP_LINK },
            { text: '👑 Contact', url: 'https://t.me/gwetha' }
          ]
        ]
      }
    }
  );
});

// 📱 /menu - WhatsApp-style menu
bot.onText(/\/menu/, async (msg) => {
  const chatId = msg.chat.id;
  const user = db.getUser(chatId);
  
  if (!user || !user.verified) {
    await bot.sendMessage(chatId,
      `🔒 *ACCESS RESTRICTED*\n\n` +
      `Verify to unlock /menu:\n` +
      `1. Join ${CHANNEL_USERNAME}\n` +
      `2. Click: https://t.me/Reddragongwebot?start=verify`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '🔓 Verify Now', url: 'https://t.me/Reddragongwebot?start=verify' }
          ]]
        }
      }
    );
    return;
  }
  
  db.logCommand(chatId, '/menu');
  
  await bot.sendMessage(chatId,
    `📱 *RED DRAGON MAIN MENU* 🐉\n\n` +
    `*🤖 BOT COMMANDS*\n` +
    `────────────────\n` +
    `🔄 /ping - Check bot status\n` +
    `👤 /profile - Your profile\n` +
    `📊 /stats - Bot statistics\n` +
    `🔗 /links - Important links\n` +
    `💰 /crypto - Crypto prices\n` +
    `📈 /price [coin] - Coin price\n` +
    `🎯 /tools - Useful tools\n` +
    `🆘 /help - All commands\n\n` +
    `*📢 CHANNELS*\n` +
    `────────────────\n` +
    `• Telegram: ${CHANNEL_USERNAME}\n` +
    `• WhatsApp: ${WHATSAPP_LINK}\n\n` +
    `👑 *Admin:* ${ADMIN_USERNAME}`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        keyboard: [
          ['🔄 Ping', '👤 Profile'],
          ['💰 Crypto', '📈 Price'],
          ['📊 Stats', '🔗 Links'],
          ['🎯 Tools', '🆘 Help']
        ],
        resize_keyboard: true,
        one_time_keyboard: false
      }
    }
  );
});

// 🔄 /ping - WhatsApp-style ping
bot.onText(/\/ping/, async (msg) => {
  const chatId = msg.chat.id;
  db.logCommand(chatId, '/ping');
  
  const start = Date.now();
  const pingMsg = await bot.sendMessage(chatId, '🏓 *Pinging...*', { parse_mode: 'Markdown' });
  const end = Date.now();
  
  const stats = db.getStats();
  const uptime = formatUptime(process.uptime());
  
  await bot.editMessageText(
    `🏓 *PONG!*\n\n` +
    `• Response: *${end - start}ms*\n` +
    `• Uptime: *${uptime}*\n` +
    `• Users: *${stats.totalUsers}*\n` +
    `• Verified: *${stats.verifiedUsers}*\n` +
    `• Memory: *${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB*\n\n` +
    `✅ Bot is online!`,
    {
      chat_id: chatId,
      message_id: pingMsg.message_id,
      parse_mode: 'Markdown'
    }
  );
});

// 👤 /profile
bot.onText(/\/profile/, async (msg) => {
  const chatId = msg.chat.id;
  const user = db.getUser(chatId);
  
  if (!user) {
    await bot.sendMessage(chatId, '❌ Use /start first');
    return;
  }
  
  db.logCommand(chatId, '/profile');
  
  const userIsAdmin = await isAdmin(msg.from.id);
  const recentCommands = user.commands.slice(-5).map(c => c.command).join(', ');
  
  await bot.sendMessage(chatId,
    `👤 *YOUR PROFILE*\n\n` +
    `• Name: ${user.firstName} ${user.lastName || ''}\n` +
    `• Username: @${user.username || 'Not set'}\n` +
    `• User ID: \`${user.userId}\`\n` +
    `• Status: ${user.verified ? '✅ Verified' : '❌ Not verified'}\n` +
    `• Role: ${userIsAdmin ? '👑 Admin' : '👤 Member'}\n` +
    `• Joined: ${user.joinDate.toLocaleDateString()}\n` +
    `• Messages: ${user.messageCount}\n` +
    `• Last Active: ${user.lastActive.toLocaleTimeString()}\n` +
    `• Recent Commands: ${recentCommands || 'None'}\n\n` +
    `${!user.verified ? `🔓 *To verify:*\nJoin ${CHANNEL_USERNAME} & click verification link` : ''}`,
    { parse_mode: 'Markdown' }
  );
});

// 📊 /stats
bot.onText(/\/stats/, async (msg) => {
  const chatId = msg.chat.id;
  const user = db.getUser(chatId);
  
  if (!user || !user.verified) {
    await bot.sendMessage(chatId, '❌ Verified users only. Verify first with /start verify');
    return;
  }
  
  db.logCommand(chatId, '/stats');
  const stats = db.getStats();
  const topCommands = Object.entries(stats.commandsUsed)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cmd, count]) => `${cmd}: ${count}`)
    .join('\n');
  
  await bot.sendMessage(chatId,
    `📊 *BOT STATISTICS*\n\n` +
    `*👥 USERS:*\n` +
    `• Total: ${stats.totalUsers}\n` +
    `• Verified: ${stats.verifiedUsers}\n` +
    `• Online (24h): ${stats.onlineLast24h}\n` +
    `• Verification: ${stats.verificationRate}%\n\n` +
    `*📈 ACTIVITY:*\n` +
    `• Total Starts: ${stats.totalStarts}\n` +
    `• Total Messages: ${stats.totalMessages}\n` +
    `• Avg/User: ${Math.round(stats.totalMessages/stats.totalUsers) || 0}\n\n` +
    `*🔥 TOP COMMANDS:*\n${topCommands || 'No data'}\n\n` +
    `*🖥 SYSTEM:*\n` +
    `• Uptime: ${formatUptime(process.uptime())}\n` +
    `• Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB\n\n` +
    `👑 ${ADMIN_USERNAME}`,
    { parse_mode: 'Markdown' }
  );
});

// 💰 /crypto
bot.onText(/\/crypto/, async (msg) => {
  const chatId = msg.chat.id;
  const user = db.getUser(chatId);
  
  if (!user || !user.verified) {
    await bot.sendMessage(chatId, '❌ Verified users only. Verify first with /start verify');
    return;
  }
  
  db.logCommand(chatId, '/crypto');
  
  try {
    const loadingMsg = await bot.sendMessage(chatId, '📈 Fetching crypto prices...');
    
    const response = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
      params: {
        vs_currency: 'usd',
        order: 'market_cap_desc',
        per_page: 5,
        page: 1,
        sparkline: false
      },
      timeout: 10000
    });
    
    let cryptoText = `💰 *TOP 5 CRYPTOS*\n\n`;
    
    response.data.forEach((coin, index) => {
      const change = coin.price_change_percentage_24h;
      const changeIcon = change >= 0 ? '📈' : '📉';
      cryptoText += `${index + 1}. *${coin.name} (${coin.symbol.toUpperCase()})*\n`;
      cryptoText += `   Price: $${coin.current_price.toLocaleString()}\n`;
      cryptoText += `   24h: ${changeIcon} ${change ? change.toFixed(2) : '0.00'}%\n`;
      cryptoText += `   MCap: $${(coin.market_cap / 1000000000).toFixed(2)}B\n\n`;
    });
    
    cryptoText += `_Data from CoinGecko • Use /price [coin] for specific prices_`;
    
    await bot.editMessageText(cryptoText, {
      chat_id: chatId,
      message_id: loadingMsg.message_id,
      parse_mode: 'Markdown'
    });
    
  } catch (error) {
    await bot.sendMessage(chatId,
      `❌ Failed to fetch prices\n\n` +
      `Try:\n` +
      `/price btc - Bitcoin\n` +
      `/price eth - Ethereum\n` +
      `/price sol - Solana\n\n` +
      `Or try again in 60 seconds.`,
      { parse_mode: 'Markdown' }
    );
  }
});

// 📈 /price [coin]
bot.onText(/\/price (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const user = db.getUser(chatId);
  const coin = match[1].toLowerCase().trim();
  
  if (!user || !user.verified) {
    await bot.sendMessage(chatId, '❌ Verified users only. Verify first with /start verify');
    return;
  }
  
  db.logCommand(chatId, `/price ${coin}`);
  
  try {
    const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price`, {
      params: {
        ids: coin,
        vs_currencies: 'usd',
        include_24hr_change: true,
        include_last_updated_at: true
      },
      timeout: 8000
    });
    
    if (!response.data[coin]) {
      await bot.sendMessage(chatId,
        `❌ "${coin}" not found\n\n` +
        `Try: btc, eth, sol, ada, doge, xrp, bnb, matic`,
        { parse_mode: 'Markdown' }
      );
      return;
    }
    
    const data = response.data[coin];
    const change = data.usd_24h_change;
    const changeIcon = change >= 0 ? '📈' : '📉';
    const updated = data.last_updated_at ? 
      new Date(data.last_updated_at * 1000).toLocaleTimeString() : 'Just now';
    
    await bot.sendMessage(chatId,
      `📈 *${coin.toUpperCase()} PRICE*\n\n` +
      `• Price: *$${data.usd.toLocaleString()}*\n` +
      `• 24h Change: ${changeIcon} *${change ? change.toFixed(2) : 'N/A'}%*\n` +
      `• Updated: ${updated}\n\n` +
      `_Data from CoinGecko • Use /crypto for top 5_`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '📊 Top 5 Cryptos', callback_data: 'crypto_top' },
            { text: '🔄 Refresh', callback_data: `refresh_${coin}` }
          ]]
        }
      }
    );
    
  } catch (error) {
    await bot.sendMessage(chatId,
      `❌ Failed to fetch ${coin.toUpperCase()}\n\n` +
      `Common coins:\n` +
      `• /price btc - Bitcoin\n` +
      `• /price eth - Ethereum\n` +
      `• /price sol - Solana\n` +
      `• /price ada - Cardano\n` +
      `• /price doge - Dogecoin`,
      { parse_mode: 'Markdown' }
    );
  }
});

// 🔗 /links
bot.onText(/\/links/, async (msg) => {
  const chatId = msg.chat.id;
  db.logCommand(chatId, '/links');
  
  await bot.sendMessage(chatId,
    `🔗 *IMPORTANT LINKS*\n\n` +
    `📢 *Telegram Channel:*\n` +
    `${CHANNEL_USERNAME}\n\n` +
    `📱 *WhatsApp Channel:*\n` +
    ${WHATSAPP_LINK}\n\n` +
    `🤖 *This Bot:*\n` +
    `https://t.me/Reddragongwebot\n\n` +
    `👑 *Contact Admin:*\n` +
    `https://t.me/gwetha\n\n` +
    `💎 *Verify:* https://t.me/Reddragongwebot?start=verify`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '📢 Telegram', url: `https://t.me/${CHANNEL_USERNAME.replace('@', '')}` },
            { text: '📱 WhatsApp', url: WHATSAPP_LINK }
          ],
          [
            { text: '🤖 Bot Link', url: 'https://t.me/Reddragongwebot' },
            { text: '👑 Admin', url: 'https://t.me/gwetha' }
          ],
          [
            { text: '✅ Verify Now', url: 'https://t.me/Reddragongwebot?start=verify' }
          ]
        ]
      }
    }
  );
});

// 🎯 /tools
bot.onText(/\/tools/, async (msg) => {
  const chatId = msg.chat.id;
  db.logCommand(chatId, '/tools');
  
  await bot.sendMessage(chatId,
    `🎯 *BOT TOOLS*\n\n` +
    `*🔧 Basic Tools:*\n` +
    `/ping - Check bot status\n` +
    `/uptime - Bot uptime\n` +
    `/id - Your Telegram ID\n\n` +
    `*💰 Crypto Tools:*\n` +
    `/crypto - Top 5 cryptocurrencies\n` +
    `/price [coin] - Specific coin price\n\n` +
    `*👤 User Tools:*\n` +
    `/profile - Your profile\n` +
    `/stats - Bot statistics\n` +
    `/menu - Main menu\n\n` +
    `*📚 Information:*\n` +
    `/help - All commands\n` +
    `/links - Important links\n\n` +
    `👑 ${ADMIN_USERNAME}`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: '🔄 Ping', callback_data: 'ping' },
          { text: '💰 Crypto', callback_data: 'crypto' }
        ]]
      }
    }
  );
});

// 🆘 /help
bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;
  db.logCommand(chatId, '/help');
  
  await bot.sendMessage(chatId,
    `🆘 *HELP & COMMANDS*\n\n` +
    `*📱 MAIN MENU:*\n` +
    `/menu - Show main menu\n` +
    `/start - Start/verify bot\n` +
    `/help - This message\n\n` +
    `*👤 USER COMMANDS:*\n` +
    `/profile - Your profile\n` +
    `/stats - Bot statistics\n` +
    `/links - Important links\n` +
    `/id - Get your Telegram ID\n\n` +
    `*💰 CRYPTO COMMANDS:*\n` +
    `/crypto - Top 5 cryptocurrencies\n` +
    `/price [coin] - Specific coin price\n\n` +
    `*🔧 UTILITY COMMANDS:*\n` +
    `/ping - Check bot status\n` +
    `/tools - Useful tools\n` +
    `/uptime - Bot uptime\n\n` +
    `*👑 ADMIN:* ${ADMIN_USERNAME}\n` +
    `*📢 CHANNEL:* ${CHANNEL_USERNAME}\n` +
    `*📱 WHATSAPP:* ${WHATSAPP_LINK}\n\n` +
    `💡 *Tip:* Verify with /start verify to unlock all features`,
    { parse_mode: 'Markdown' }
  );
});

// 🆔 /id
bot.onText(/\/id/, async (msg) => {
  const chatId = msg.chat.id;
  db.logCommand(chatId, '/id');
  
  await bot.sendMessage(chatId,
    `🆔 *YOUR TELEGRAM ID*\n\n` +
    `• User ID: \`${msg.from.id}\`\n` +
    `• Chat ID: \`${chatId}\`\n` +
    `• Username: @${msg.from.username || 'Not set'}\n\n` +
    `_Use this ID for admin verification_`,
    { parse_mode: 'Markdown' }
  );
});

// 🔼 /uptime
bot.onText(/\/uptime/, async (msg) => {
  const chatId = msg.chat.id;
  db.logCommand(chatId, '/uptime');
  
  const stats = db.getStats();
  
  await bot.sendMessage(chatId,
    `🔼 *BOT UPTIME*\n\n` +
    `• Uptime: *${formatUptime(process.uptime())}*\n` +
    `• Started: ${new Date(Date.now() - process.uptime() * 1000).toLocaleString()}\n` +
    `• Users: ${stats.totalUsers}\n` +
    `• Messages: ${stats.totalMessages}\n` +
    `• Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB\n` +
    `• Node.js: ${process.version}\n\n` +
    `✅ Bot is running smoothly!`,
    { parse_mode: 'Markdown' }
  );
});

// ===== ADMIN COMMANDS =====
bot.onText(/\/admin (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const command = match[1];
  
  const userIsAdmin = await isAdmin(userId);
  if (!userIsAdmin) {
    await bot.sendMessage(chatId, '⛔ Admin access denied.');
    return;
  }
  
  db.logCommand(chatId, `/admin ${command}`);
  
  switch(command) {
    case 'stats':
      const stats = db.getStats();
      const topCommands = Object.entries(stats.commandsUsed)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([cmd, count], idx) => `${idx+1}. ${cmd}: ${count}`)
        .join('\n');
      
      await bot.sendMessage(chatId,
        `👑 *ADMIN STATISTICS*\n\n` +
        `*📊 USERS:*\n` +
        `• Total: ${stats.totalUsers}\n` +
        `• Verified: ${stats.verifiedUsers}\n` +
        `• Online (24h): ${stats.onlineLast24h}\n` +
        `• Verification: ${stats.verificationRate}%\n\n` +
        `*📈 ACTIVITY:*\n` +
        `• Total Starts: ${stats.totalStarts}\n` +
        `• Total Messages: ${stats.totalMessages}\n` +
        `• Avg/User: ${Math.round(stats.totalMessages/stats.totalUsers) || 0}\n\n` +
        `*🔥 TOP 10 COMMANDS:*\n${topCommands}\n\n` +
        `*🖥 SYSTEM:*\n` +
        `• Uptime: ${formatUptime(process.uptime())}\n` +
        `• Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB\n` +
        `• Node: ${process.version}\n\n` +
        `👑 ${ADMIN_USERNAME}`,
        { parse_mode: 'Markdown' }
      );
      break;
      
    case 'users':
      const users = db.getAllUsers();
      const recentUsers = users
        .sort((a, b) => b.joinDate - a.joinDate)
        .slice(0, 15)
        .map((user, idx) => 
          `${idx+1}. @${user.username || user.userId} - ${user.verified ? '✅' : '❌'} - ${user.messageCount} msgs`
        )
        .join('\n');
      
      await bot.sendMessage(chatId,
        `👥 *RECENT USERS (15)*\n\n${recentUsers}\n\n` +
        `Total: ${users.length} users`,
        { 
