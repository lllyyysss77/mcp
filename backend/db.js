const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

// 用JSON文件存储数据（自动创建）
const adapter = new FileSync('mcp-db.json');
const db = low(adapter);

// 初始化数据库结构
db.defaults({
  clients: [
    { clientId: 'test_client', clientSecret: 'test_secret123', isActive: true }
  ],
  callLogs: []
}).write();

module.exports = db;