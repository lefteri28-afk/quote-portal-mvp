const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(process.cwd(), 'storage', 'db.json');

function readDB(){
  if(!fs.existsSync(DB_PATH)) return { quotes: [] };
  return JSON.parse(fs.readFileSync(DB_PATH,'utf8'));
}

function writeDB(data){
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

module.exports = { readDB, writeDB };
