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
app.use(express.urlencoded({ extended: true }));
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-auth']
}));
app.options('*', cors());

const DB_FILE = path.join(__dirname, 'users.json');
const PAYMENTS_FILE = path.join(__dirname, 'used_payments.json');
const SETTINGS_FILE = path.join(__dirname, 'settings.json');

const waitingPasswordUsers = {};

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

        const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        return await res.json();
    } catch (e) {
        return null;
    }
}

function grantTrial(username, chatId) {
    usersDatabase = loadDB();
    const userKey = username.toLowerCase();
    if (!usersDatabase[userKey]) {
        usersDatabase[userKey] = { password: 'auto_generated', expiresAt: 0, trialUsed: false, chatId: chatId };
    }
    const user = usersDatabase[userKey];
    user.chatId = chatId;

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

async function processPaymentCode(login, paymentId, chatId) {
    if (usedPayments.includes(paymentId)) {
        return { success: false, message: '❌ Этот код платежа уже был активирован!' };
    }

    try {
        const auth = Buffer.from(`${YOOKASSA_SHOP_ID}:${YOOKASSA_SECRET_KEY}`).toString('base64');
        const response = await fetch(`https://api.yookassa.ru/v3/payments/${paymentId}`, {
            method: 'GET',
            headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' }
        });

        if (!response.ok) return { success: false, message: '❌ Код платежа не найден в ЮKassa.' };

        const data = await response.json();
        if (data.status !== 'succeeded') {
            return { success: false, message: `⚠️ Платеж найден, но его статус: ${data.status}` };
        }

        const amount = parseFloat(data.amount.value);
        let days = 30;
        if (amount === 150) days = 30;
        else if (amount === 375) days = 90;
        else if (amount === 660) days = 180;
        else if (amount === 1140) days = 365;

        usedPayments.push(paymentId);
        saveUsedPayments(usedPayments);

        usersDatabase = loadDB();
        const userKey = login.toLowerCase();
        if (!usersDatabase[userKey]) {
            usersDatabase[userKey] = { password: 'auto_generated', expiresAt: 0 };
        }

        const user = usersDatabase[userKey];
        if (chatId) user.chatId = chatId;
        const currentExpire = user.expiresAt > Date.now() ? user.expiresAt : Date.now();
        user.expiresAt = currentExpire + days * 86400000;
        user.notified = {};
        saveDB(usersDatabase);

        const subUrl = `${BACKEND_URL}/api/sub/${userKey}`;
        return { success: true, days, subUrl };
    } catch (e) {
        return { success: false, message: '❌ Ошибка проверки кода на сервере.' };
    }
}

function startSubscriptionNotifier() {
    setInterval(async () => {
        usersDatabase = loadDB();
        const now = Date.now();
        let updated = false;

        for (const [login, user] of Object.entries(usersDatabase)) {
            if (!user.chatId || !user.expiresAt) continue;

            const timeLeft = user.expiresAt - now;
            if (timeLeft <= 0) continue;

            const hoursLeft = timeLeft / (1000 * 60 * 60);
            if (!user.notified) user.notified = {};

            const thresholds = [
                { hours: 24, key: 'h24', text: '⚠️ **Внимание!** До окончания вашей подписки осталось **24 часа** (1 сутки).' },
                { hours: 12, key: 'h12', text: '⚠️ **Внимание!** До окончания вашей подписки осталось **12 часов**.' },
                { hours: 6, key: 'h6', text: '⚠️ **Внимание!** До окончания вашей подписки осталось **6 часов**.' },
                { hours: 3, key: 'h3', text: '🚨 **Срочно!** До окончания вашей подписки осталось **3 часа**.' },
                { hours: 1, key: 'h1', text: '🚨 **Внимание!** До окончания вашей подписки остался **1 час**! Продлите тариф, чтобы не потерять доступ.' }
            ];

            for (const t of thresholds) {
                if (hoursLeft <= t.hours && hoursLeft > (t.hours - 0.1) && !user.notified[t.key]) {
                    user.notified[t.key] = true;
                    updated = true;
                    await sendTelegram(user.chatId, t.text);
                }
            }
        }

        if (updated) saveDB(usersDatabase);
    }, 60 * 1000);
}

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

app.get('/api/user/status/:username', (req, res) => {
    usersDatabase = loadDB();
    const login = req.params.username.toLowerCase();
    const user = usersDatabase[login];
    if (!user) return res.status(404).json({ success: false, message: 'Пользователь не найден' });
    res.json({ success: true, expiresAt: user.expiresAt, subUrl: `${BACKEND_URL}/api/sub/${login}` });
});

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
    usersDatabase = loadDB();
    const login = username.trim().toLowerCase();
    if (!usersDatabase[login]) {
        usersDatabase[login] = { password: 'auto_generated', expiresAt: 0, trialUsed: true };
    }
    const user = usersDatabase[login];
    const currentExpire = user.expiresAt > Date.now() ? user.expiresAt : Date.now();
    user.expiresAt = currentExpire + parseInt(days) * 86400000;
    user.notified = {};
    saveDB(usersDatabase);
    res.json({ success: true });
});

app.post('/api/admin/set-expire', (req, res) => {
    const adminKey = req.headers['x-admin-auth'];
    if (adminKey !== 'yarik123') return res.status(403).json({ success: false });
    const { username, expiresAt } = req.body;
    usersDatabase = loadDB();
    const login = username.trim().toLowerCase();
    if (!usersDatabase[login]) return res.status(404).json({ success: false });

    usersDatabase[login].expiresAt = parseInt(expiresAt);
    usersDatabase[login].notified = {};
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

app.post('/api/activate-code', async (req, res) => {
    const { username, paymentId } = req.body;
    if (!username || !paymentId) return res.status(400).json({ success: false, message: 'Заполните логин и код' });
    const result = await processPaymentCode(username, paymentId.trim(), null);
    res.json(result);
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

        usersDatabase = loadDB();
        if (!usersDatabase[username]) {
            usersDatabase[username] = { password: 'auto_generated', expiresAt: 0, trialUsed: false, chatId: chatId };
        } else {
            usersDatabase[username].chatId = chatId;
        }
        saveDB(usersDatabase);

        if (waitingPasswordUsers[chatId]) {
            const newPassword = text;
            delete waitingPasswordUsers[chatId];
            usersDatabase[username].password = newPassword;
            saveDB(usersDatabase);
            return await sendTelegram(chatId, `✅ **Пароль успешно сохранен!**\n\nТеперь вы можете входить на сайт под логином: \`${username}\` и новым паролем.`);
        }

        if (text.startsWith('/start')) {
            const keyboard = {
                keyboard: [
                    [{ text: '💳 Купить' }, { text: '👤 Мой профиль' }],
                    [{ text: '🎁 Пробная подписка' }, { text: '📖 Инструкция' }]
                ],
                resize_keyboard: true
            };
            await sendTelegram(chatId, `👋 Добро пожаловать в **FlorezokVPN**!\n\nВыберите тариф или активируйте пробную подписку!`, keyboard);
        } else if (text === '💳 Купить') {
            const tariffsText = 
                `💎 **Выберите тариф:**\n` +
                `Ваш логин для подписки: \`${username}\`\n\n` +
                `⚠️ **Обязательно пришлите код платежа из чека прямо в этот чат после оплаты!**`;
            
            const inlineKeyboard = {
                inline_keyboard: [
                    [{ text: '1 Месяц (150 ₽)', url: 'https://yookassa.ru/my/i/au4a647hWPzD/l' }],
                    [{ text: '3 Месяца (375 ₽)', url: 'https://yookassa.ru/my/i/au4bJLCp8dGe/l' }],
                    [{ text: '6 Месяцев (660 ₽)', url: 'https://yookassa.ru/my/i/au4bSkpIvx0J/l' }],
                    [{ text: '1 Год (1140 ₽)', url: 'https://yookassa.ru/my/i/au4bZXML-7FH/l' }]
                ]
            };
            await sendTelegram(chatId, tariffsText, inlineKeyboard);
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
        } else if (text === '📖 Инструкция') {
            const instructionText = 
                `📖 **Инструкция по подключению FlorezokVPN (Happ):**\n\n` +
                `1. Зайдите в раздел **👤 Мой профиль** в боте и скопируйте вашу ссылку подписки.\n` +
                `2. Откройте приложение **Happ**.\n` +
                `3. В правом верхнем углу нажмите на **плюсик (+)**.\n` +
                `4. Выберите пункт **«Вставить из буфера обмена»** и нажмите **Подключиться**.`;
            
            await sendTelegram(chatId, instructionText);
        } else if (text === '👤 Мой профиль') {
            usersDatabase = loadDB();
            const user = usersDatabase[username];
            const now = Date.now();
            const profileKb = {
                inline_keyboard: [
                    [{ text: '🔑 Установить / Сменить пароль', callback_data: 'change_password' }]
                ]
            };

            if (user && now <= user.expiresAt) {
                const daysLeft = Math.ceil((user.expiresAt - now) / 86400000);
                const subUrl = `${BACKEND_URL}/api/sub/${username}`;
                await sendTelegram(chatId, 
                    `👤 **Ваш аккаунт:** \`${username}\`\n` +
                    `Статус: 🟢 **Активна** (Осталось дней: **${daysLeft}**)\n` +
                    `Пароль на сайте: \`${user.password || 'не задан'}\`\n\n` +
                    `🔗 **Ссылка подписки:**\n\`${subUrl}\``,
                    profileKb
                );
            } else {
                await sendTelegram(chatId, 
                    `👤 **Ваш аккаунт:** \`${username}\`\n` +
                    `Статус: 🔴 **Неактивна**\n` +
                    `Пароль на сайте: \`${user && user.password ? user.password : 'не задан'}\``,
                    profileKb
                );
            }
        } else {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (uuidRegex.test(text.trim())) {
                const paymentId = text.trim();
                await sendTelegram(chatId, `⏳ Проверяем код платежа \`${paymentId}\`...`);

                const result = await processPaymentCode(username, paymentId, chatId);
                if (result.success) {
                    usersDatabase[username].notified = {};
                    saveDB(usersDatabase);
                    await sendTelegram(chatId, 
                        `🎉 **ПОДПИСКА УСПЕШНО АКТИВИРОВАНА!**\n\n` +
                        `✅ Логин: \`${username}\`\n` +
                        `⏳ Добавлено дней: **${result.days}**\n\n` +
                        `🔗 **Ваша ссылка подписки:**\n\`${result.subUrl}\``
                    );
                } else {
                    await sendTelegram(chatId, result.message);
                }
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
        } else if (query.data === 'change_password') {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ callback_query_id: query.id, text: 'Введите новый пароль' })
            });
            waitingPasswordUsers[chatId] = username;
            await sendTelegram(chatId, `🔑 **Введите новый пароль для сайта** прямо в этот чат следующим сообщением:`);
        }
    }
});

app.listen(PORT, '0.0.0.0', async () => {
    console.log(`🚀 Server started on port ${PORT}`);
    startSubscriptionNotifier();
    try {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook?url=${BACKEND_URL}/bot${TELEGRAM_BOT_TOKEN}`);
    } catch(e) {}
});
