const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');

const router = express.Router();

const { requireAuth } = require('../middleware/auth');

// --- Magic bytes validation (HIGH-9: don't trust client MIME) ---
function validateMagicBytes(filePath, ext) {
  const buf = Buffer.alloc(8);
  const fd = fs.openSync(filePath, 'r');
  const bytesRead = fs.readSync(fd, buf, 0, 8, 0);
  fs.closeSync(fd);

  if (bytesRead < 2) return false;

  if (ext === '.zip') {
    return buf[0] === 0x50 && buf[1] === 0x4B; // PK
  }
  if (ext === '.png') {
    return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47;
  }
  if (ext === '.jpg' || ext === '.jpeg') {
    return buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF;
  }
  if (ext === '.html') {
    const content = fs.readFileSync(filePath, 'utf-8').trimStart().toLowerCase();
    return content.startsWith('<!doctype') || content.startsWith('<html') || content.startsWith('<');
  }
  return false;
}

// --- File lock for index.json (HIGH-8: race condition) ---
let indexLock = Promise.resolve();

function withIndexLock(fn) {
  let release;
  const prev = indexLock;
  indexLock = new Promise((r) => { release = r; });
  return prev.then(fn).finally(release);
}

// Multer storage: store uploads in a temp directory
const upload = multer({
  dest: path.join(__dirname, '..', 'uploads_tmp'),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'gameFile') {
      const allowedExt = ['.zip', '.html'];
      const ext = path.extname(file.originalname).toLowerCase();
      if (allowedExt.includes(ext)) {
        return cb(null, true);
      }
      return cb(new Error('Game file must be .zip or .html'));
    }

    if (file.fieldname === 'thumbnail') {
      // HIGH-7: SVG removed — XSS risk
      const allowedExt = ['.png', '.jpg', '.jpeg'];
      const ext = path.extname(file.originalname).toLowerCase();
      if (allowedExt.includes(ext)) {
        return cb(null, true);
      }
      return cb(new Error('Thumbnail must be .png or .jpg'));
    }

    cb(new Error('Unexpected field'));
  },
});

const uploadFields = upload.fields([
  { name: 'gameFile', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 },
]);

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// CRIT-2: Zip Slip defense — validate all entry paths before extraction
function safeExtractZip(zipPath, targetDir) {
  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries();
  const resolvedTarget = path.resolve(targetDir) + path.sep;

  // Check total decompressed size (zip bomb defense)
  let totalSize = 0;
  const MAX_DECOMPRESSED = 200 * 1024 * 1024; // 200MB

  for (const entry of entries) {
    // Path traversal check
    const resolvedPath = path.resolve(targetDir, entry.entryName);
    if (!resolvedPath.startsWith(resolvedTarget)) {
      throw new Error('Invalid ZIP: path traversal detected.');
    }

    // Zip bomb check
    totalSize += entry.header.size;
    if (totalSize > MAX_DECOMPRESSED) {
      throw new Error('ZIP contents too large (max 200MB decompressed).');
    }
  }

  // Verify index.html exists in the archive
  const hasIndex = entries.some((e) => {
    const name = e.entryName.replace(/^[^/]+\//, ''); // handle root folder
    return name === 'index.html' || e.entryName === 'index.html';
  });
  if (!hasIndex) {
    throw new Error('ZIP must contain an index.html file.');
  }

  zip.extractAllTo(targetDir, true);
}

// POST /api/games - Upload a new game (authenticated)
router.post('/games', requireAuth, (req, res) => {
  uploadFields(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File too large. Maximum size is 50MB.' });
      }
      return res.status(400).json({ error: 'Upload error.' });
    }
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    try {
      const { title, description, author, tags } = req.body;

      // Validate required fields
      if (!title || !title.trim()) {
        cleanupFiles(req.files);
        return res.status(400).json({ error: 'Title is required.' });
      }
      if (!req.files || !req.files.gameFile || !req.files.gameFile[0]) {
        cleanupFiles(req.files);
        return res.status(400).json({ error: 'Game file is required.' });
      }
      if (!req.files.thumbnail || !req.files.thumbnail[0]) {
        cleanupFiles(req.files);
        return res.status(400).json({ error: 'Thumbnail is required.' });
      }

      const gameFile = req.files.gameFile[0];
      const thumbnailFile = req.files.thumbnail[0];

      // HIGH-9: Server-side magic bytes validation
      const gameExt = path.extname(gameFile.originalname).toLowerCase();
      if (!validateMagicBytes(gameFile.path, gameExt)) {
        cleanupFiles(req.files);
        return res.status(400).json({ error: 'Game file content does not match its extension.' });
      }

      const thumbExt = path.extname(thumbnailFile.originalname).toLowerCase();
      if (!validateMagicBytes(thumbnailFile.path, thumbExt)) {
        cleanupFiles(req.files);
        return res.status(400).json({ error: 'Thumbnail content does not match its extension.' });
      }

      // Generate game ID from title
      const id = slugify(title);
      if (!id) {
        cleanupFiles(req.files);
        return res.status(400).json({ error: 'Title must contain at least one alphanumeric character.' });
      }

      // HIGH-8: Use file lock for index.json read/write
      const result = await withIndexLock(() => {
        const gamesDir = path.join(__dirname, '..', 'games');
        const indexPath = path.join(gamesDir, 'index.json');
        const gamesIndex = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));

        // Check for duplicate ID
        if (gamesIndex.some((g) => g.id === id)) {
          return { error: true, status: 409, message: `A game with ID "${id}" already exists.` };
        }

        // Create game directory
        const gameDir = path.join(gamesDir, id);
        fs.mkdirSync(gameDir, { recursive: true });

        // Process game file
        if (gameExt === '.zip') {
          safeExtractZip(gameFile.path, gameDir);
        } else {
          fs.copyFileSync(gameFile.path, path.join(gameDir, 'index.html'));
        }

        // Verify index.html exists after extraction
        if (!fs.existsSync(path.join(gameDir, 'index.html'))) {
          fs.rmSync(gameDir, { recursive: true, force: true });
          return { error: true, status: 400, message: 'Game must contain an index.html file.' };
        }

        // Process thumbnail
        const thumbnailName = `thumbnail${thumbExt}`;
        fs.copyFileSync(thumbnailFile.path, path.join(gameDir, thumbnailName));

        // Parse tags
        const parsedTags = tags
          ? tags.split(',').map((t) => t.trim()).filter(Boolean)
          : [];

        // Build new game entry
        const newGame = {
          id,
          title: title.trim(),
          folder: id,
          thumbnail: `games/${id}/${thumbnailName}`,
          description: description ? description.trim() : '',
          author: author ? author.trim() : 'Anonymous',
          tags: parsedTags,
          date: new Date().toISOString(),
          plays: 0,
          featured: false,
        };

        // Append to index.json (inside lock)
        gamesIndex.push(newGame);
        fs.writeFileSync(indexPath, JSON.stringify(gamesIndex, null, 2));

        return { error: false, game: newGame };
      });

      cleanupFiles(req.files);

      if (result.error) {
        return res.status(result.status).json({ error: result.message });
      }

      res.status(201).json({ message: 'Game uploaded successfully.', game: result.game });
    } catch (error) {
      cleanupFiles(req.files);
      console.error('Upload error:', error.message);
      res.status(500).json({ error: 'Failed to process upload.' });
    }
  });
});

function cleanupFiles(files) {
  if (!files) return;
  const allFiles = [
    ...(files.gameFile || []),
    ...(files.thumbnail || []),
  ];
  for (const file of allFiles) {
    try {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    } catch {
      // Ignore cleanup errors
    }
  }
}

module.exports = router;
