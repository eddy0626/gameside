const express = require('express');
const fs = require('fs');
const path = require('path');
const { requireAuth, requireCsrf } = require('../middleware/auth');

const router = express.Router();
const MEMBERS_PATH = path.join(__dirname, '..', 'public', 'data', 'members.json');

function readMembers() {
  const raw = fs.readFileSync(MEMBERS_PATH, 'utf-8');
  const data = JSON.parse(raw);
  return data.members || [];
}

function writeMembers(members) {
  fs.writeFileSync(MEMBERS_PATH, JSON.stringify({ members }, null, 2));
}

// GET /api/members — 전체 멤버 목록
router.get('/', (req, res) => {
  try {
    const members = readMembers();
    res.json(members);
  } catch (error) {
    console.error('Failed to load members:', error.message);
    res.status(500).json({ error: 'Failed to load members' });
  }
});

// GET /api/members/:id — 개인 프로필
router.get('/:id', (req, res) => {
  try {
    const members = readMembers();
    const member = members.find((m) => m.id === req.params.id);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }
    res.json(member);
  } catch (error) {
    console.error('Failed to load member:', error.message);
    res.status(500).json({ error: 'Failed to load member' });
  }
});

// PUT /api/members/:id — 본인만 수정 가능
router.put('/:id', requireAuth, requireCsrf, (req, res) => {
  try {
    const members = readMembers();
    const index = members.findIndex((m) => m.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const member = members[index];

    // 본인 확인: JWT email과 멤버 email 비교
    if (req.user.email !== member.email) {
      return res.status(403).json({ error: 'You can only edit your own profile' });
    }

    // 허용 필드만 업데이트
    const allowedFields = ['role', 'bio', 'skills', 'github', 'linkedin', 'avatar'];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        member[field] = req.body[field];
      }
    }

    members[index] = member;
    writeMembers(members);
    res.json(member);
  } catch (error) {
    console.error('Failed to update member:', error.message);
    res.status(500).json({ error: 'Failed to update member' });
  }
});

module.exports = router;
