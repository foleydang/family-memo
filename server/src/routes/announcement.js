const express = require('express');
const { getDb } = require('../utils/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 获取公告列表
router.get('/list', authMiddleware, (req, res) => {
  const db = getDb();
  const { familyId } = req.query;
  
  if (!familyId) {
    return res.json({ success: true, data: [] });
  }
  
  try {
    const items = db.prepare(`
      SELECT a.*, u.nickname as author_name, u.avatar as author_avatar
      FROM announcements a
      LEFT JOIN users u ON a.created_by = u.id
      WHERE a.family_id = ?
      ORDER BY a.created_at DESC
    `).all(familyId);
    
    res.json({ success: true, data: items });
  } catch (error) {
    // 表可能不存在，返回空列表
    res.json({ success: true, data: [] });
  }
});

// 添加公告
router.post('/add', authMiddleware, (req, res) => {
  const db = getDb();
  const { familyId, content } = req.body;
  
  if (!familyId || !content) {
    return res.status(400).json({ success: false, message: '请填写完整信息' });
  }
  
  try {
    const result = db.prepare(`
      INSERT INTO announcements (family_id, content, created_by)
      VALUES (?, ?, ?)
    `).run(familyId, content.trim(), req.userId);
    
    const item = db.prepare(`
      SELECT a.*, u.nickname as author_name, u.avatar as author_avatar
      FROM announcements a
      LEFT JOIN users u ON a.created_by = u.id
      WHERE a.id = ?
    `).get(result.lastInsertRowid);
    
    res.json({ success: true, data: item, message: '发布成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '发布失败' });
  }
});

// 删除公告
router.delete('/:id', authMiddleware, (req, res) => {
  const db = getDb();
  const { id } = req.params;
  
  try {
    db.prepare('DELETE FROM announcements WHERE id = ?').run(id);
    res.json({ success: true, message: '已删除' });
  } catch (error) {
    res.json({ success: true, message: '已删除' });
  }
});

module.exports = router;
