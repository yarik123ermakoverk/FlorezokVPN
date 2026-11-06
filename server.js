const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();

app.use(express.json());
app.use(cors());

// Подключение к MySQL с твоими данными
const pool = mysql.createPool({
    host: 'localhost',
    user: 'whg127619_',
    password: 'qwerty123',
    database: 'whg127619_',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Автоматическая проверка/создание таблицы при старте
async function initDB() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                username VARCHAR(255) PRIMARY KEY,
                password VARCHAR(255) NOT NULL,
                expires_at BIGINT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("Таблица users успешно проверена/создана в MySQL.");
    } catch (e) {
        console.error("Ошибка подключения к MySQL:", e);
    }
}
initDB();

let globalExpiredKey = "vless://00000000-0000-0000-0000-000000000000@expired.florezok.net:443?encryption=none&type=tcp#%E2%9D%8C%20%D0%A2%D0%90%D0%A0%D0%98%D0%A4%20%D0%97%D0%90%D0%9A%D0%9E%D0%9D%D0%A7%D0%98%D0%9B%D0%A1%D0%AF";

const defaultVlessKeys = [
    "vless://fb37d713-0ed3-4146-b085-a5c879a9aafa@81.163.22.194:443?flow=xtls-rprx-vision&encryption=none&security=reality&sni=apply.betust.net&fp=firefox&pbk=T98nmnCp0qrmkH1Oq92Tk94sCYa5RuuEjp8bDDbdVxk&type=tcp#%F0%9F%87%B7%F0%9F%87%BA%D0%9E%D0%B1%D1%85%D0%BE%D0%B4%201",
    "vless://d16f7276-b967-440d-88b7-76945654ed55@188.225.79.22:443?encryption=none&security=reality&sni=quartzops.blog&fp=firefox&pbk=LqyEitRDFcMxFuH45Vx1551cOqrI6UHYvkKgs7gNaho&type=grpc#%F0%9F%87%B7%F0%9F%87%BA%D0%9E%D0%B1%D1%85%D0%BE%D0%B4%202"
];

// Регистрация
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ success: false, message: 'Заполните все поля' });
        
        const login = username.trim();
        const [existing] = await pool.query('SELECT * FROM users WHERE username = ?', [login]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'Логин уже занят' });
        }

        await pool.query('INSERT INTO users (username, password, expires_at) VALUES (?, ?, 0)', [login, password]);
        res.json({ success: true, message: 'Регистрация успешна' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Ошибка базы данных' });
    }
});

// Авторизация
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const login = username ? username.trim() : '';
        
        const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [login]);
        if (rows.length === 0 || rows[0].password !== password) {
            return res.status(401).json({ success: false, message: 'Неверный логин или пароль' });
        }

        res.json({ success: true, username: login });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Ошибка базы данных' });
    }
});

// Проверка статуса подписки
app.get('/api/status/:username', async (req, res) => {
    try {
        const login = req.params.username.trim();
        const [rows] = await pool.query('SELECT expires_at FROM users WHERE username = ?', [login]);
        
        if (rows.length === 0 || Date.now() > rows[0].expires_at) {
            return res.json({ active: false, timeLeftMs: 0 });
        }
        res.json({ active: true, timeLeftMs: rows[0].expires_at - Date.now() });
    } catch (e) {
        res.status(500).json({ active: false });
    }
});

// Получение ссылки подписки (VLESS)
app.get('/api/sub/:username', async (req, res) => {
    try {
        const login = req.params.username.trim();
        const [rows] = await pool.query('SELECT expires_at FROM users WHERE username = ?', [login]);
        
        res.set('Content-Type', 'text/plain; charset=utf-8');

        if (rows.length > 0 && Date.now() <= rows[0].expires_at) {
            const expireSeconds = Math.floor(rows[0].expires_at / 1000);
            const headers = [
                `#profile-update-interval: 1`,
                `#profile-title: 🏳️ Florezok (${login})`,
                `#subscription-userinfo: upload=0; download=0; total=0; expire=${expireSeconds}`
            ];
            return res.send(headers.join('\n') + '\n\n' + defaultVlessKeys.join('\n\n'));
        }

        const expiredHeaders = [`#profile-update-interval: 1`, `#profile-title: ❌ Подписка истекла`];
        return res.send(expiredHeaders.join('\n') + '\n\n' + globalExpiredKey);
    } catch (e) {
        res.status(500).send('Error loading subscription');
    }
});

// --- 3X-UI АДМИН-ПАНЕЛЬ ---
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === 'admin') {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false });
    }
});

app.get('/api/admin/clients', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT username, expires_at FROM users');
        const now = Date.now();
        const list = rows.map(r => ({
            username: r.username,
            active: now <= r.expires_at,
            timeLeftMin: now <= r.expires_at ? Math.ceil((r.expires_at - now) / 60000) : 0
        }));
        res.json({ clients: list });
    } catch (e) {
        res.status(500).json({ clients: [] });
    }
});

// Выдача/продление подписки админом (без пароля юзера)
app.post('/api/admin/save-client', async (req, res) => {
    try {
        const { username, days } = req.body;
        const login = username ? username.trim() : '';
        const addDays = parseInt(days) || 0;

        if (!login) return res.status(400).json({ success: false, message: 'Укажите логин' });

        const [rows] = await pool.query('SELECT expires_at FROM users WHERE username = ?', [login]);
        
        if (rows.length === 0) {
            const expireTime = Date.now() + addDays * 24 * 60 * 60 * 1000;
            await pool.query('INSERT INTO users (username, password, expires_at) VALUES (?, "123", ?)', [login, expireTime]);
        } else {
            const currentExpire = rows[0].expires_at > Date.now() ? rows[0].expires_at : Date.now();
            const newExpire = currentExpire + addDays * 24 * 60 * 60 * 1000;
            await pool.query('UPDATE users SET expires_at = ? WHERE username = ?', [newExpire, login]);
        }

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Ошибка базы данных' });
    }
});

app.post('/api/admin/delete-client', async (req, res) => {
    try {
        const { username } = req.body;
        await pool.query('DELETE FROM users WHERE username = ?', [username]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));