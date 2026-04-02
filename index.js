import express from 'express';
import Anthropic from '@anthropic-ai/sdk';

const app = express();
app.use(express.json());

const {
  TELEGRAM_BOT_TOKEN,
  ANTHROPIC_API_KEY,
  PORT = 3000
} = process.env;

// Initialize Anthropic client
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// Store conversation history per user (in-memory for demo)
const conversations = new Map();

// System prompt for Ace - the tennis coach AI assistant
const SYSTEM_PROMPT = `You are Ace, an AI assistant built for tennis coaches. You help coaches manage their teaching business by providing:

1. **Pre-lesson briefs**: When a coach tells you about an upcoming lesson, you provide a quick summary of what to focus on, suggested drills, and a game plan based on the player's level and goals.

2. **Post-lesson notes**: After a lesson, the coach can tell you what happened and you'll generate a clean summary they can send to the player or their parents.

3. **Player communication**: You help draft messages to players and parents about scheduling, progress updates, cancellations, and encouragement.

4. **Scheduling & reminders**: You help coaches keep track of their schedule and remind them about upcoming lessons.

5. **Drill suggestions**: Based on a player's skill level and areas for improvement, you suggest specific drills and exercises.

Your tone is professional but friendly — like a knowledgeable assistant who understands tennis deeply. Keep messages concise since they're being read on a phone. Use emojis sparingly but naturally (🎾 is your favorite).

When a new user messages you for the first time, introduce yourself briefly as Ace, the AI assistant for tennis coaches. Ask what they need help with today — prepping for a lesson, writing a post-lesson summary, drafting a message to a player/parent, or something else.

Important guidelines:
- Keep responses SHORT and mobile-friendly
- Use line breaks for readability
- If a coach mentions a player name, remember it for the conversation
- Be proactive in offering help based on context
- If asked about something outside tennis coaching, gently redirect
- When generating parent updates or player messages, format them as ready-to-copy text
- For drill suggestions, include brief descriptions of how to run each drill`;

// ============================================
// TELEGRAM WEBHOOK (POST)
// Receives incoming messages from Telegram
// ============================================
app.post('/webhook/telegram', async (req, res) => {
  // Always respond 200 quickly
  res.sendStatus(200);

  try {
    const message = req.body?.message;
    if (!message?.text) return;

    const chatId = message.chat.id;
    const userText = message.text;
    const firstName = message.from?.first_name || 'Coach';

    // Handle /start command
    if (userText === '/start') {
      await sendTelegramMessage(chatId,
        `Hey ${firstName}! 🎾\n\nI'm Ace, your AI tennis coaching assistant. I help coaches like you with:\n\n` +
        `• Pre-lesson briefs & game plans\n` +
        `• Post-lesson summaries for players & parents\n` +
        `• Drafting messages to players/parents\n` +
        `• Drill suggestions by skill level\n\n` +
        `What can I help you with today?`
      );
      return;
    }

    console.log(`📩 Message from ${firstName} (${chatId}): ${userText}`);

    // Send typing indicator
    await sendTelegramAction(chatId, 'typing');

    // Get or create conversation history
    if (!conversations.has(chatId)) {
      conversations.set(chatId, []);
    }
    const history = conversations.get(chatId);

    // Add user message to history
    history.push({ role: 'user', content: userText });

    // Keep conversation history manageable (last 20 messages)
    if (history.length > 20) {
      history.splice(0, history.length - 20);
    }

    // Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      system: SYSTEM_PROMPT,
      messages: history
    });

    const assistantMessage = response.content[0].text;

    // Add assistant response to history
    history.push({ role: 'assistant', content: assistantMessage });

    console.log(`🤖 Reply to ${firstName}: ${assistantMessage.substring(0, 100)}...`);

    // Send reply via Telegram
    await sendTelegramMessage(chatId, assistantMessage);

  } catch (error) {
    console.error('Error processing message:', error);

    // Try to notify user of error
    const chatId = req.body?.message?.chat?.id;
    if (chatId) {
      await sendTelegramMessage(chatId, 'Sorry, I hit a snag. Try sending that again! 🎾');
    }
  }
});

// ============================================
// SEND MESSAGE VIA TELEGRAM API
// ============================================
async function sendTelegramMessage(chatId, text) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown'
    })
  });

  const data = await response.json();

  if (!data.ok) {
    // Retry without Markdown if parsing fails
    const retry = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text
      })
    });
    const retryData = await retry.json();
    if (!retryData.ok) {
      console.error('Telegram API error:', JSON.stringify(retryData, null, 2));
    }
    return retryData;
  }

  return data;
}

// ============================================
// SEND TYPING INDICATOR
// ============================================
async function sendTelegramAction(chatId, action) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendChatAction`;

  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      action: action
    })
  });
}

// ============================================
// HEALTH CHECK
// ============================================
app.get('/', (req, res) => {
  res.json({
    status: 'running',
    app: 'Tennisace Telegram Bot',
    version: '1.0.0',
    bot: 'Active'
  });
});

// ============================================
// SETUP WEBHOOK HELPER
// Hit this endpoint once to register webhook with Telegram
// ============================================
app.get('/setup-webhook', async (req, res) => {
  const webhookUrl = `${req.protocol}://${req.get('host')}/webhook/telegram`;
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook?url=${encodeURIComponent(webhookUrl)}`;

  const response = await fetch(url);
  const data = await response.json();

  res.json({
    webhook_url: webhookUrl,
    telegram_response: data
  });
});

// ============================================
// START SERVER
// ============================================
app.listen(PORT, () => {
  console.log(`🎾 Tennisace Telegram bot running on port ${PORT}`);
});
