const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');

const { requireAuth, requireCsrf } = require('../middleware/auth');
const { GAMES_DIR, readGamesIndex, writeGamesIndexAtomic } = require('../lib/games');

const router = express.Router();
const UPLOADS_TMP_DIR = path.join(__dirname, '..', 'uploads_tmp');

fs.mkdirSync(UPLOADS_TMP_DIR, { recursive: true });

class RequestError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Magic bytes validation helps reject obviously mislabeled uploads.
function validateMagicBytes(filePath, ext) {
  const buf = Buffer.alloc(8);
  const fd = fs.openSync(filePath, 'r');
  const bytesRead = fs.readSync(fd, buf, 0, 8, 0);
  fs.closeSync(fd);

  if (bytesRead < 2) return false;

  if (ext === '.zip') {
    return buf[0] === 0x50 && buf[1] === 0x4B;
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

let indexLock = Promise.resolve();

function withIndexLock(fn) {
  let release;
  const prev = indexLock;
  indexLock = new Promise((resolve) => {
    release = resolve;
  });
  return prev.then(fn).finally(release);
}

const upload = multer({
  dest: UPLOADS_TMP_DIR,
  limits: { fileSize: 50 * 1024 * 1024 },
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

function normalizeZipEntryName(name) {
  return String(name || '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/+/g, '/');
}

function getCommonRootPrefix(entries) {
  const names = entries
    .map((entry) => normalizeZipEntryName(entry.entryName))
    .filter(Boolean);

  if (names.length === 0) {
    return '';
  }

  const firstSegments = new Set(names.map((name) => name.split('/')[0]));
  const hasRootLevelFile = names.some((name) => !name.includes('/'));

  if (firstSegments.size === 1 && !hasRootLevelFile) {
    return names[0].split('/')[0];
  }

  return '';
}

function stripRootPrefix(entryName, rootPrefix) {
  const normalized = normalizeZipEntryName(entryName);
  if (!rootPrefix) {
    return normalized;
  }

  if (normalized === rootPrefix) {
    return '';
  }

  if (normalized.startsWith(`${rootPrefix}/`)) {
    return normalized.slice(rootPrefix.length + 1);
  }

  return normalized;
}

function safeExtractZip(zipPath, targetDir) {
  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries();
  const resolvedTarget = path.resolve(targetDir) + path.sep;
  const rootPrefix = getCommonRootPrefix(entries);
  const MAX_DECOMPRESSED = 200 * 1024 * 1024;

  let totalSize = 0;
  let hasIndex = false;

  for (const entry of entries) {
    const relativeName = stripRootPrefix(entry.entryName, rootPrefix);

    if (!relativeName) {
      continue;
    }

    const resolvedPath = path.resolve(targetDir, relativeName);
    if (!resolvedPath.startsWith(resolvedTarget)) {
      throw new RequestError(400, 'Invalid ZIP: path traversal detected.');
    }

    if (!entry.isDirectory) {
      totalSize += entry.header.size;
      if (totalSize > MAX_DECOMPRESSED) {
        throw new RequestError(400, 'ZIP contents too large (max 200MB decompressed).');
      }
    }

    if (relativeName === 'index.html') {
      hasIndex = true;
    }
  }

  if (!hasIndex) {
    throw new RequestError(400, 'ZIP must contain an index.html file at the root or inside a single top-level folder.');
  }

  for (const entry of entries) {
    const relativeName = stripRootPrefix(entry.entryName, rootPrefix);

    if (!relativeName) {
      continue;
    }

    const destinationPath = path.join(targetDir, relativeName);
    if (entry.isDirectory) {
      fs.mkdirSync(destinationPath, { recursive: true });
      continue;
    }

    fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
    fs.writeFileSync(destinationPath, entry.getData());
  }
}

function processUpload(gameFile, thumbnailFile, title, description, author, tags, devNote, coAuthors) {
  const gameExt = path.extname(gameFile.originalname).toLowerCase();
  const thumbExt = path.extname(thumbnailFile.originalname).toLowerCase();
  const id = slugify(title);

  if (!id) {
    throw new RequestError(400, 'Title must contain at least one alphanumeric character.');
  }

  return withIndexLock(() => {
    const gamesIndex = readGamesIndex();

    if (gamesIndex.some((game) => game.id === id)) {
      throw new RequestError(409, `A game with ID "${id}" already exists.`);
    }

    const gameDir = path.join(GAMES_DIR, id);
    fs.mkdirSync(gameDir, { recursive: true });

    try {
      if (gameExt === '.zip') {
        safeExtractZip(gameFile.path, gameDir);
      } else {
        fs.copyFileSync(gameFile.path, path.join(gameDir, 'index.html'));
      }

      if (!fs.existsSync(path.join(gameDir, 'index.html'))) {
        throw new RequestError(400, 'Game must contain an index.html file.');
      }

      const thumbnailName = `thumbnail${thumbExt}`;
      fs.copyFileSync(thumbnailFile.path, path.join(gameDir, thumbnailName));

      const parsedTags = tags
        ? tags.split(',').map((tag) => tag.trim()).filter(Boolean)
        : [];

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

      if (devNote) {
        newGame.devNote = devNote;
      }

      if (coAuthors && coAuthors.length > 0) {
        newGame.coAuthors = coAuthors;
      }

      gamesIndex.push(newGame);
      writeGamesIndexAtomic(gamesIndex);

      return newGame;
    } catch (error) {
      fs.rmSync(gameDir, { recursive: true, force: true });
      throw error;
    }
  });
}

router.post('/games', requireAuth, requireCsrf, (req, res) => {
  uploadFields(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      cleanupFiles(req.files);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File too large. Maximum size is 50MB.' });
      }
      return res.status(400).json({ error: 'Upload error.' });
    }

    if (err) {
      cleanupFiles(req.files);
      return res.status(400).json({ error: err.message });
    }

    try {
      const { title, description, author, tags } = req.body;
      var devNote = req.body.devNote;
      if (devNote) {
        devNote = String(devNote).trim().slice(0, 5000);
      }

      var coAuthors = [];
      if (req.body.coAuthors) {
        try {
          var parsed = typeof req.body.coAuthors === 'string'
            ? JSON.parse(req.body.coAuthors)
            : req.body.coAuthors;
          if (Array.isArray(parsed)) {
            coAuthors = parsed
              .map(function (s) { return String(s).trim(); })
              .filter(Boolean)
              .slice(0, 10);
          }
        } catch (_) {
          // ignore malformed coAuthors
        }
      }

      if (!title || !title.trim()) {
        throw new RequestError(400, 'Title is required.');
      }
      if (!req.files || !req.files.gameFile || !req.files.gameFile[0]) {
        throw new RequestError(400, 'Game file is required.');
      }
      if (!req.files.thumbnail || !req.files.thumbnail[0]) {
        throw new RequestError(400, 'Thumbnail is required.');
      }

      const gameFile = req.files.gameFile[0];
      const thumbnailFile = req.files.thumbnail[0];
      const gameExt = path.extname(gameFile.originalname).toLowerCase();
      const thumbExt = path.extname(thumbnailFile.originalname).toLowerCase();

      if (!validateMagicBytes(gameFile.path, gameExt)) {
        throw new RequestError(400, 'Game file content does not match its extension.');
      }

      if (!validateMagicBytes(thumbnailFile.path, thumbExt)) {
        throw new RequestError(400, 'Thumbnail content does not match its extension.');
      }

      const game = await processUpload(gameFile, thumbnailFile, title, description, author, tags, devNote, coAuthors);
      res.status(201).json({ message: 'Game uploaded successfully.', game });
    } catch (error) {
      if (error instanceof RequestError) {
        return res.status(error.status).json({ error: error.message });
      }

      console.error('Upload error:', error.message);
      res.status(500).json({ error: 'Failed to process upload.' });
    } finally {
      cleanupFiles(req.files);
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
      // Ignore cleanup errors.
    }
  }
}

module.exports = router;
