const express = require('express');
const fileUpload = require('express-fileupload');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
require('dotenv').config();
const { OpenAI } = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
// Serve uploaded images and generated combinations
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/combinations', express.static(path.join(__dirname, 'combinations')));
app.use(fileUpload());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: 'mezcla-secret',
    resave: false,
    saveUninitialized: true
  })
);

// In-memory game state
let game = {
  round: 1,
  difficulty: 2,
  prompt: 'Analyze these participant photos and create one new face that blends all of them together.',
  participants: [], // {id, name, photoPath, points, sessionId}
  combinations: [], // {imagePath, participantIds}
  state: 'lobby' // lobby | generating | playing | scoreboard
};

function resetGame() {
  game.round = 1;
  game.difficulty = 2;
  game.prompt = 'Analyze these participant photos and create one new face that blends all of them together.';
  game.participants = [];
  game.combinations = [];
  game.state = 'lobby';
  // Clean uploads and combinations directories
  fs.rmSync(path.join(__dirname, 'uploads'), { recursive: true, force: true });
  fs.rmSync(path.join(__dirname, 'combinations'), { recursive: true, force: true });
  fs.mkdirSync(path.join(__dirname, 'uploads'), { recursive: true });
  fs.mkdirSync(path.join(__dirname, 'combinations'), { recursive: true });
}

resetGame();

// Render landing page
app.get('/', (req, res) => {
  res.render('index', { game });
});

// Create new game (organizer)
app.post('/create', (req, res) => {
  resetGame();
  game.state = 'lobby';
  res.redirect('/lobby');
});

// Lobby page
app.get('/lobby', (req, res) => {
  if (game.state === 'generating') return res.redirect('/wait');
  if (game.state === 'playing') return res.redirect('/play');
  res.render('lobby', { game });
});

// Join page
app.get('/join', (req, res) => {
  res.render('join');
});

// Wait page for image generation
app.get('/wait', (req, res) => {
  if (game.state === 'playing') return res.redirect('/play');
  res.render('wait');
});

// Endpoint to query current state
app.get('/status', (req, res) => {
  res.json({ state: game.state });
});

// Handle join
app.post('/join', async (req, res) => {
  const name = req.body.name;
  if (!req.files || !req.files.photo || !name) {
    return res.status(400).send('Name and photo required');
  }
  const id = game.participants.length + 1;
  const sessionId = req.sessionID;
  const sessionDir = path.join(__dirname, 'uploads', sessionId);
  fs.mkdirSync(sessionDir, { recursive: true });
  const uploadPath = path.join(sessionDir, `${id}_${req.files.photo.name}`);
  await req.files.photo.mv(uploadPath);
  game.participants.push({ id, name, photoPath: uploadPath, points: 0, sessionId });
  req.session.playerIds = req.session.playerIds || [];
  req.session.playerIds.push(id);
  res.redirect('/lobby');
});

// Start round
app.post('/start', async (req, res) => {
  if (game.participants.length < game.difficulty) {
    return res.status(400).send('Not enough participants');
  }
  game.prompt = req.body.prompt && req.body.prompt.trim() !== ''
    ? req.body.prompt.trim()
    : game.prompt;
  game.combinations = [];
  fs.rmSync(path.join(__dirname, 'combinations'), { recursive: true, force: true });
  fs.mkdirSync(path.join(__dirname, 'combinations'), { recursive: true });
  game.state = 'generating';
  res.redirect('/wait');

  // async generation after redirect
  (async () => {
    try {
      const ids = game.participants.map(p => p.id);
      // shuffle participants for fair combinations
      const shuffled = [...ids];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      // generate one combination per participant
      for (let i = 0; i < game.participants.length; i++) {
        const chosen = [];
        for (let j = 0; j < game.difficulty; j++) {
          chosen.push(shuffled[(i + j) % shuffled.length]);
        }

        const base64Images = await Promise.all(
          chosen.map(id => fs.promises.readFile(game.participants.find(p => p.id === id).photoPath, { encoding: 'base64' }))
        );

        const userContent = base64Images.map(img => ({
          type: 'image_url',
          image_url: { url: `data:image/png;base64,${img}` }
        }));
        userContent.push({
          type: 'text',
          text: game.prompt
        });

        const chat = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: [
                { type: 'text', text: 'You use your computer vision on user images to make new AI images.' }
              ]
            },
            { role: 'user', content: userContent }
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'dalle_output',
              strict: true,
              schema: {
                type: 'object',
                properties: {
                  prompt: { type: 'string' },
                  size: { type: 'string', enum: ['1024x1024', '1024x1536', '1536x1024'] }
                },
                required: ['prompt', 'size'],
                additionalProperties: false
              }
            }
          },
          temperature: 0.5,
          max_tokens: 1500,
          top_p: 0.9
        });

        const dalleParams = JSON.parse(chat.choices[0].message.content);

        const image = await openai.images.generate({
          model: 'gpt-image-1',
          prompt: dalleParams.prompt,
          size: dalleParams.size,
          moderation: 'low'
        });

        const buffer = Buffer.from(image.data[0].b64_json, 'base64');

        const comboPath = path.join(__dirname, 'combinations', `combo_${i}.png`);
        await fs.promises.writeFile(comboPath, buffer);
        game.combinations.push({ imagePath: comboPath, participantIds: chosen });
      }

      game.state = 'playing';
    } catch (err) {
      console.error('Error generating images', err);
      game.state = 'lobby';
    }
  })();
});

// Play page
app.get('/play', (req, res) => {
  if (game.state === 'generating') return res.redirect('/wait');
  if (game.state !== 'playing') return res.redirect('/lobby');
  res.render('play', { game });
});

// Handle guesses
app.post('/guess', (req, res) => {
  const guesses = req.body; // {combo_0: [id,id], combo_1: [...]}
  for (const [key, value] of Object.entries(guesses)) {
    const index = parseInt(key.split('_')[1]);
    const guessedIds = Array.isArray(value) ? value.map(v => parseInt(v)) : [parseInt(value)];
    const combo = game.combinations[index];
    const correct = combo.participantIds.every(id => guessedIds.includes(id)) && guessedIds.length === combo.participantIds.length;
    if (correct) {
      guessedIds.forEach(id => {
        const player = game.participants.find(p => p.id === id);
        if (player) player.points += 1;
      });
    }
  }
  game.state = 'scoreboard';
  res.redirect('/scoreboard');
});

// Scoreboard
app.get('/scoreboard', (req, res) => {
  game.state = 'scoreboard';
  const sessionScores = {};
  game.participants.forEach(p => {
    if (!sessionScores[p.sessionId]) {
      sessionScores[p.sessionId] = { sessionId: p.sessionId, players: [], points: 0 };
    }
    sessionScores[p.sessionId].players.push({ name: p.name, points: p.points });
    sessionScores[p.sessionId].points += p.points;
  });
  const sessions = Object.values(sessionScores);
  res.render('scoreboard', { game, sessions });
});

// Next round
app.post('/next', (req, res) => {
  game.round += 1;
  game.difficulty += 1;
  game.combinations = [];
  game.state = 'lobby';
  res.redirect('/lobby');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
