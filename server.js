const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const TELEGRAM_BOT_TOKEN = '9147658037:AAEaYJ56epN4hTrJXEqWm6PTC7qwO3WI7SE';
const CHANNEL_URL = 'https://t.me/Florezok_VPN';
const PORT = process.env.PORT || 3000;
const BACKEND_URL = 'https://florezokvpn.onrender.com';

const YOOKASSA_SHOP_ID = '1519153';
const YOOKASSA_SECRET_KEY = 'live_zdfOFIU0YPqEEk_Nk_3V3hw-Pi2sGcXOQ-yB_57TJyc';

const app = express();
app.use(express.json());
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.options('*', cors());

const DB_FILE = path.join(__dirname, 'users.json');
const PAYMENTS_FILE = path.join(__dirname, 'used_payments.json');
const SETTINGS_FILE = path.join(__dirname, 'settings.json');

function loadDB() {
    try {
        if (fs.existsSync(DB_FILE)) return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } catch (e) {}
    return {};
}

function saveDB(db) {
    try { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8'); } catch (e) {}
}

function loadUsedPayments() {
    try {
        if (fs.existsSync(PAYMENTS_FILE)) return JSON.parse(fs.readFileSync(PAYMENTS_FILE, 'utf8'));
    } catch (e) {}
    return [];
}

function saveUsedPayments(list) {
    try { fs.writeFileSync(PAYMENTS_FILE, JSON.stringify(list, null, 2), 'utf8'); } catch (e) {}
}

function loadSettings() {
    try {
        if (fs.existsSync(SETTINGS_FILE)) return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
    } catch (e) {}
    return { stubKey: "" };
}

function saveSettings(settings) {
    try { fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8'); } catch (e) {}
}

let usersDatabase = loadDB();
let usedPayments = loadUsedPayments();
let appSettings = loadSettings();

let globalExpiredKey = "vless://00000000-0000-0000-0000-000000000000@expired.florezok.net:443?encryption=none&type=tcp#%E2%9D%8C%20%D0%A2%D0%90%D0%A0%D0%98%D0%A4%20%D0%97%D0%90%D0%9A%D0%9E%D0%9D%D0%A7%D0%98%D0%9B%D0%A1%D0%AF";

const defaultVlessKeys = [
    "vless://fb37d713-0ed3-4146-b085-a5c879a9aafa@81.163.22.194:443?flow=xtls-rprx-vision&encryption=none&security=reality&sni=apply.betust.net&fp=firefox&pbk=T98nmnCp0qrmkH1Oq92Tk94sCYa5RuuEjp8bDDbdVxk&sid=b20168a5&spx=%2F&type=tcp&headerType=none#%D0%9E%D0%B1%D1%85%D0%BE%D0%B4_1",
    "vless://fb37d713-0ed3-4146-b085-a5c879a9aafa@81.163.22.194:443?flow=xtls-rprx-vision&encryption=none&security=reality&sni=apply.betust.net&fp=firefox&pbk=T98nmnCp0qrmkH1Oq92Tk94sCYa5RuuEjp8bDDbdVxk&sid=b20168a5&spx=%2F&type=tcp&headerType=none#%D0%9E%D0%B1%D1%85%D0%BE%D0%B4_2"
];

async function sendTelegram(chatId, text, replyMarkup = null) {
    try {
        const body = { chat_id: chatId, text: text, parse_mode: 'Markdown' };
        if (replyMarkup) body.reply_markup = replyMarkup;

        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
    } catch (e) {}
}

function grantTrial(username, chatId) {
    usersDatabase = loadDB();
    const userKey = username.toLowerCase();
    if (!usersDatabase[userKey]) {
        usersDatabase[userKey] = { password: 'auto_generated', expiresAt: 0, trialUsed: false };
    }
    const user = usersDatabase[userKey];

    if (user.trialUsed) {
        return sendTelegram(chatId, `❌ Вы уже использовали свою пробную подписку!`);
    }

    user.trialUsed = true;
    user.expiresAt = (user.expiresAt > Date.now() ? user.expiresAt : Date.now()) + 5 * 86400000;
    saveDB(usersDatabase);

    const subUrl = `${BACKEND_URL}/api/sub/${userKey}`;
    sendTelegram(chatId, 
        `🎉 **Пробная подписка на 5 дней успешно активирована!**\n\n` +
        `🔗 **Ваша ссылка подписки:**\n\`${subUrl}\``
    );
}

// --- API САЙТА И АДМИНКИ ---
app.get('/', (req, res) => res.send('OK'));

app.post('/api/auth/register', (req, res) => {
    usersDatabase = loadDB();
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ success: false, message: 'Заполните поля' });
    const login = username.trim().toLowerCase();
    if (usersDatabase[login]) return res.status(400).json({ success: false, message: 'Логин занят' });
    usersDatabase[login] = { password, expiresAt: 0, trialUsed: false };
    saveDB(usersDatabase);
    res.json({ success: true, username: login });
});

app.post('/api/auth/login', (req, res) => {
    usersDatabase = loadDB();
    const { username, password } = req.body;
    const login = username ? username.trim().toLowerCase() : '';
    const user = usersDatabase[login];
    if (!user || user.password !== password) return res.status(401).json({ success: false, message: 'Неверные данные' });
    res.json({ success: true, username: login, expiresAt: user.expiresAt });
});

// Проверка статуса профиля на сайте
app.get('/api/user/status/:username', (req, res) => {
    usersDatabase = loadDB();
    const login = req.params.username.toLowerCase();
    const user = usersDatabase[login];
    if (!user) return res.status(404).json({ success: false, message: 'Пользователь не найден' });
    res.json({
        success: true,
        expiresAt: user.expiresAt,
        subUrl: `${BACKEND_URL}/api/sub/${login}`
    });
});

// АДМИН ЭНДПОИНТЫ
app.get('/api/admin/data', (req, res) => {
    const adminKey = req.headers['x-admin-auth'];
    if (adminKey !== 'yarik123') return res.status(403).json({ success: false });
    usersDatabase = loadDB();
    appSettings = loadSettings();
    res.json({ success: true, users: usersDatabase, settings: appSettings });
});

app.post('/api/admin/create-sub', (req, res) => {
    const adminKey = req.headers['x-admin-auth'];
    if (adminKey !== 'yarik123') return res.status(403).json({ success: false });
    const { username, days } = req.body;
    if (!username || !days) return res.status(400).json({ success: false, message: 'Заполните все поля' });

    usersDatabase = loadDB();
    const login = username.trim().toLowerCase();
    if (!usersDatabase[login]) {
        usersDatabase[login] = { password: 'auto_generated', expiresAt: 0, trialUsed: true };
    }
    const user = usersDatabase[login];
    const currentExpire = user.expiresAt > Date.now() ? user.expiresAt : Date.now();
    user.expiresAt = currentExpire + parseInt(days) * 86400000;
    saveDB(usersDatabase);
    res.json({ success: true });
});

app.post('/api/admin/update-user', (req, res) => {
    const adminKey = req.headers['x-admin-auth'];
    if (adminKey !== 'yarik123') return res.status(403).json({ success: false });
    const { username, days } = req.body;
    usersDatabase = loadDB();
    const login = username.trim().toLowerCase();
    if (!usersDatabase[login]) return res.status(404).json({ success: false });

    const user = usersDatabase[login];
    const currentExpire = user.expiresAt > Date.now() ? user.expiresAt : Date.now();
    user.expiresAt = currentExpire + parseInt(days) * 86400000;
    saveDB(usersDatabase);
    res.json({ success: true });
});

app.post('/api/admin/delete-user', (req, res) => {
    const adminKey = req.headers['x-admin-auth'];
    if (adminKey !== 'yarik123') return res.status(403).json({ success: false });
    const { username } = req.body;
    usersDatabase = loadDB();
    const login = username.trim().toLowerCase();
    delete usersDatabase[login];
    saveDB(usersDatabase);
    res.json({ success: true });
});

app.post('/api/admin/save-settings', (req, res) => {
    const adminKey = req.headers['x-admin-auth'];
    if (adminKey !== 'yarik123') return res.status(403).json({ success: false });
    const { stubKey } = req.body;
    appSettings = { stubKey: stubKey || "" };
    saveSettings(appSettings);
    res.json({ success: true });
});

app.get('/api/sub/:username', (req, res) => {
    usersDatabase = loadDB();
    appSettings = loadSettings();
    const login = req.params.username.trim().toLowerCase();
    const user = usersDatabase[login];
    res.set('Content-Type', 'text/plain; charset=utf-8');

    let keysToSend = [...defaultVlessKeys];
    if (appSettings.stubKey && appSettings.stubKey.trim() !== '') {
        keysToSend.push(appSettings.stubKey.trim());
    }

    if (user && Date.now() <= user.expiresAt) {
        const expireSeconds = Math.floor(user.expiresAt / 1000);
        const headers = [
            `#profile-update-interval: 1`,
            `#profile-title: 🏳️ Florezok (${login})`,
            `#subscription-userinfo: upload=0; download=0; total=0; expire=${expireSeconds}`
        ];
        return res.send(headers.join('\n') + '\n\n' + keysToSend.join('\n\n'));
    }
    return res.send([`#profile-update-interval: 1`, `#profile-title: ❌ Подписка истекла`].join('\n') + '\n\n' + globalExpiredKey);
});

// --- ВЕБХУК БОТА ---
app.post(`/bot${TELEGRAM_BOT_TOKEN}`, async (req, res) => {
    res.sendStatus(200);
    const update = req.body;
    if (!update) return;

    if (update.message) {
        const msg = update.message;
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const text = msg.text ? msg.text.trim() : '';
        const username = msg.from.username ? msg.from.username.toLowerCase() : `tg_${userId}`;

        if (!text) return;

        if (text.startsWith('/start')) {
            const keyboard = {
                keyboard: [
                    [{ text: '💳 Купить' }, { text: '👤 Мой профиль' }],
                    [{ text: '🎁 Пробная подписка' }, { text: '📖 Инструкция' }]
                ],
                resize_keyboard: true
            };
            await sendTelegram(chatId, `👋 Добро пожаловать в **FlorezokVPN**!\n\nВыберите тариф или активируйте пробную подписку!`, keyboard);
        } else if (text === '🎁 Пробная подписка') {
            const channelKb = {
                inline_keyboard: [
                    [{ text: '📢 Подписаться на канал', url: CHANNEL_URL }],
                    [{ text: '✅ Я подписался', callback_data: 'claim_trial' }]
                ]
            };
            await sendTelegram(chatId, 
                `🔔 **Получение пробной подписки на 5 дней:**\n\n` +
                `1. Подпишитесь на наш официальный канал\n` +
                `2. Нажмите кнопку **«✅ Я подписался»** ниже.`, 
                channelKb
            );
        } else if (text === '👤 Мой профиль') {
            usersDatabase = loadDB();
            const user = usersDatabase[username];
            const now = Date.now();

            if (user && now <= user.expiresAt) {
                const daysLeft = Math.ceil((user.expiresAt - now) / 86400000);
                const subUrl = `${BACKEND_URL}/api/sub/${username}`;
                await sendTelegram(chatId, 
                    `👤 **Ваш аккаунт:** \`${username}\`\n` +
                    `Статус: 🟢 **Активна** (Осталось дней: **${daysLeft}**)\n\n` +
                    `🔗 **Ссылка подписки:**\n\`${subUrl}\``
                );
            } else {
                await sendTelegram(chatId, `👤 **Ваш аккаунт:** \`${username}\`\nСтатус: 🔴 **Неактивна**`);
            }
        }
    } else if (update.callback_query) {
        const query = update.callback_query;
        const userId = query.from.id;
        const chatId = query.message.chat.id;
        const username = query.from.username ? query.from.username.toLowerCase() : `tg_${userId}`;

        if (query.data === 'claim_trial') {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ callback_query_id: query.id, text: '✅ Подписка активирована!' })
            });
            try {
                await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chat_id: chatId, message_id: query.message.message_id })
                });
            } catch(e){}
            grantTrial(username, chatId);
        }
    }
});

app.listen(PORT, '0.0.0.0', async () => {
    console.log(`🚀 Server started on port ${PORT}`);
    try {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook?url=${BACKEND_URL}/bot${TELEGRAM_BOT_TOKEN}`);
    } catch(e) {}
});
