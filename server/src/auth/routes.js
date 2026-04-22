const express = require('express')
const { requireAuth } = require('./middleware')
const { getUserProfile, loginUser, registerUser, setRecentConnectionFavorite } = require('./service')

const router = express.Router()

router.post('/register', async (req, res) => {
  try {
    const result = await registerUser(req.body || {})
    res.status(201).json({ success: true, ...result })
  } catch (error) {
    res.status(error.status || (error.code === 'USER_EXISTS' ? 409 : 500)).json({
      success: false,
      message: error.message || '注册失败',
    })
  }
})

router.post('/login', async (req, res) => {
  try {
    const result = await loginUser(req.body || {})
    res.json({ success: true, ...result })
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message || '登录失败',
    })
  }
})

router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await getUserProfile(req.user.id)
    res.json({ success: true, user })
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message || '获取用户信息失败',
    })
  }
})

router.patch('/recent-connections/:targetUserId/favorite', requireAuth, async (req, res) => {
  try {
    const user = await setRecentConnectionFavorite(
      req.user.id,
      req.params.targetUserId,
      req.body?.favorite,
    )
    res.json({ success: true, user })
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message || '更新收藏状态失败',
    })
  }
})

module.exports = router
