# Tennisace Telegram Bot

AI-powered Telegram assistant for tennis coaches. Built with Express, Telegram Bot API, and Claude (Anthropic).

## Setup

### 1. Create the bot
- Open Telegram and message [@BotFather](https://t.me/BotFather)
- Send `/newbot`
- Pick a name (e.g. "Tennisace")
- Pick a username (e.g. `tennisace_bot`)
- Copy the token BotFather gives you

### 2. Deploy to Railway
Push to GitHub, then deploy on Railway with these env vars:

| Variable | Value |
|----------|-------|
| `TELEGRAM_BOT_TOKEN` | Token from BotFather |
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `PORT` | `3000` |

### 3. Register the webhook
Once deployed, visit this URL in your browser:

```
https://your-app.up.railway.app/setup-webhook
```

You should see a success response. That's it — the bot is live.

### 4. Test it
Open `t.me/your_bot_username` and tap Start!

## Demo scenarios to try
- "I have a lesson with a 10-year-old beginner in 30 minutes, help me prep"
- "Just finished a lesson with Sarah, she struggled with her backhand but her serve improved a lot"
- "Write a progress update for Jake's parents"
- "Suggest some drills for an intermediate player working on net play"
