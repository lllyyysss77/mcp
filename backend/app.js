const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const db = require('./db');
const app = express();

// 解析请求数据
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 允许跨域（前端页面调用API需要）
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// 配置
const config = {
  jwtSecret: 'mcp_js_secret_2024', // 可修改为自己的密钥
  jutuike: {
    activityMapping: {
      meituan_waimai: '1',
      meituan_air_train: '48',
      lingyuan_shichi: '39'
    }
  }
};

// 1. 登录接口
app.post('/api/mcp/auth/login', (req, res) => {
  const { clientId, clientSecret } = req.body;
  const client = db.get('clients')
    .find({ clientId, clientSecret, isActive: true })
    .value();

  if (!client) {
    return res.json({ code: 401, msg: '用户名或密码错误' });
  }

  const token = jwt.sign({ clientId }, config.jwtSecret, { expiresIn: '24h' });
  res.json({
    code: 200,
    data: { token, tokenType: 'bearer', expiresIn: 86400 }
  });
});

// 认证中间件
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.json({ code: 401, msg: 'Token缺失' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwtSecret);
    req.clientId = decoded.clientId;
    next();
  } catch (err) {
    return res.json({ code: 401, msg: 'Token无效' });
  }
};

// 2. 获取推广链接接口（需登录）
app.post('/api/mcp/jutuike/get_promo', authMiddleware, (req, res) => {
  const { activityType, trackId = 'default' } = req.body;
  const actId = config.jutuike.activityMapping[activityType];

  if (!actId) {
    return res.json({ code: 400, msg: `不支持的活动类型：${activityType}` });
  }

  // 模拟聚推客接口返回（实际使用时替换为真实请求）
  const mockData = {
    activityName: activityType === 'meituan_waimai' ? '美团外卖优惠' :
                 activityType === 'meituan_air_train' ? '美团机票优惠' : '零元试吃',
    promoH5: `https://s.jutuike.com/${activityType}_${trackId}`,
    miniApp: { appId: 'wx123456', pagePath: `/pages/promo?track=${trackId}` }
  };

  // 记录日志
  db.get('callLogs').push({
    clientId: req.clientId,
    activityType,
    trackId,
    time: new Date().toISOString(),
    status: 'success'
  }).write();

  res.json({ code: 200, data: mockData });
});

// 3. 公开优惠列表接口（无需登录）
app.get('/api/mcp/jutuike/public_promo_list', (req, res) => {
  const publicList = [
    {
      activityName: '美团外卖满减活动',
      imageUrl: 'https://picsum.photos/id/292/300/200',
      promoH5: 'https://s.jutuike.com/meituan_waimai',
      deeplink: 'meituan://waimai/promo',
      miniApp: { pagePath: '/pages/waimai' }
    },
    {
      activityName: '美团机票立减50',
      imageUrl: 'https://picsum.photos/id/42/300/200',
      promoH5: 'https://s.jutuike.com/meituan_air',
      deeplink: 'meituan://air/promo',
      miniApp: { pagePath: '/pages/air' }
    }
  ];
  res.json({ code: 200, data: publicList });
});

// 启动服务（支持Render等平台的动态端口）
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`服务启动成功：http://localhost:${PORT}`);
});