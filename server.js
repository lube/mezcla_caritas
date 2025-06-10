const express = require('express');
const fileUpload = require('express-fileupload');
const path = require('path');
const fs = require('fs');
const { Jimp } = require('jimp');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(fileUpload());
app.use(express.urlencoded({ extended: true }));

// In-memory game state
let game = {
  round: 1,
  difficulty: 2,
  participants: [], // {id, name, photoPath, points}
  combinations: [] // {imagePath, participantIds}
};

function resetGame() {
  game.round = 1;
  game.difficulty = 2;
  game.participants = [];
  game.combinations = [];
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
  res.redirect('/lobby');
});

// Lobby page
app.get('/lobby', (req, res) => {
  res.render('lobby', { game });
});

// Join page
app.get('/join', (req, res) => {
  res.render('join');
});

// Handle join
app.post('/join', async (req, res) => {
  const name = req.body.name;
  if (!req.files || !req.files.photo || !name) {
    return res.status(400).send('Name and photo required');
  }
  const id = game.participants.length + 1;
  const uploadPath = path.join(__dirname, 'uploads', `${id}_${req.files.photo.name}`);
  await req.files.photo.mv(uploadPath);
  game.participants.push({ id, name, photoPath: uploadPath, points: 0 });
  res.redirect('/lobby');
});

// Start round
app.post('/start', async (req, res) => {
  if (game.participants.length < game.difficulty) {
    return res.status(400).send('Not enough participants');
  }
  game.combinations = [];

  const ids = game.participants.map(p => p.id);
  // Generate combinations equal to number of participants
  for (let i = 0; i < game.participants.length; i++) {
    // pick random unique participants for this combination
    const chosen = [];
    while (chosen.length < game.difficulty) {
      const randomId = ids[Math.floor(Math.random() * ids.length)];
      if (!chosen.includes(randomId)) chosen.push(randomId);
    }
    const images = await Promise.all(chosen.map(id => Jimp.read(game.participants.find(p => p.id === id).photoPath)));
    let base = images[0];
    for (let j = 1; j < images.length; j++) {
      base = base.composite(images[j], 0, 0, {
        mode: Jimp.BLEND_SOURCE_OVER,
        opacitySource: 0.5
      });
    }
    const comboPath = path.join(__dirname, 'combinations', `combo_${i}.png`);
    await base.writeAsync(comboPath);
    game.combinations.push({ imagePath: comboPath, participantIds: chosen });
  }
  res.redirect('/play');
});

// Play page
app.get('/play', (req, res) => {
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
  res.redirect('/scoreboard');
});

// Scoreboard
app.get('/scoreboard', (req, res) => {
  res.render('scoreboard', { game });
});

// Next round
app.post('/next', (req, res) => {
  game.round += 1;
  game.difficulty += 1;
  game.combinations = [];
  res.redirect('/lobby');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
