const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');

// --- НАСТРОЙКИ ---
const TELEGRAM_BOT_TOKEN = '9147658037:AAEaYJ56epN4hTrJXEqWm6PTC7qwO3WI7SE';
const CHANNEL_USERNAME = '@Florezok_VPN';
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

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });
const DB_FILE = path.join(__dirname, 'users.json');
const PAYMENTS_FILE = path.join(__dirname, 'used_payments.json');

function loadDB() {
    try {
        if (fs.existsSync(DB_FILE)) return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } catch (e) { console.error("Ошибка базы:", e); }
    return {};
}

function saveDB(db) {
    try { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8'); }
    catch (e) { console.error("Ошибка сохранения базы:", e); }
}

function loadUsedPayments() {
    try {
        if (fs.existsSync(PAYMENTS_FILE)) return JSON.parse(fs.readFileSync(PAYMENTS_FILE, 'utf8'));
    } catch (e) { console.error("Ошибка чтения платежей:", e); }
    return [];
}

function saveUsedPayments(list) {
    try { fs.writeFileSync(PAYMENTS_FILE, JSON.stringify(list, null, 2), 'utf8'); }
    catch (e) { console.error("Ошибка сохранения платежей:", e); }
}

let usersDatabase = loadDB();
let usedPayments = loadUsedPayments();

let globalExpiredKey = "vless://00000000-0000-0000-0000-000000000000@expired.florezok.net:443?encryption=none&type=tcp#%E2%9D%8C%20%D0%A2%D0%90%D0%A0%D0%98%D0%A4%20%D0%97%D0%90%D0%9A%D0%9E%D0%9D%D0%A7%D0%98%D0%9B%D0%A1%D0%AF";

const defaultVlessKeys = [
    "vless://fb37d713-0ed3-4146-b085-a5c879a9aafa@81.163.22.194:443?flow=xtls-rprx-vision&encryption=none&security=reality&sni=apply.betust.net&fp=firefox&pbk=T98nmnCp0qrmkH1Oq92Tk94sCYa5RuuEjp8bDDbdVxk&sid=b20168a5&spx=%2F&type=tcp&headerType=none#%D0%9E%D0%B1%D1%85%D0%BE%D0%B4_1",
    "vless://fb37d713-0ed3-4146-b085-a5c879a9aafa@81.163.22.194:443?flow=xtls-rprx-vision&encryption=none&security=reality&sni=apply.betust.net&fp=firefox&pbk=T98nmnCp0qrmkH1Oq92Tk94sCYa5RuuEjp8bDDbdVxk&sid=b20168a5&spx=%2F&type=tcp&headerType=none#%D0%9E%D0%B1%D1%85%D0%BE%D0%B4_2"
];

async function checkChannelSubscription(userId) {
    try {
        const member = await bot.getChatMember(CHANNEL_USERNAME, userId);
        return ['creator', 'administrator', 'member'].includes(member.status);
    } catch (e) {
        console.error("Ошибка проверки подписки:", e.message);
        return false;
    }
}

function grantTrial(username, chatId, botInstance) {
    usersDatabase = loadDB();
    const userKey = username.toLowerCase();
    if (!usersDatabase[userKey]) {
        usersDatabase[userKey] = { password: 'auto_generated', expiresAt: 0, trialUsed: false };
    }
    const user = usersDatabase[userKey];

    if (user.trialUsed) {
        return botInstance.sendMessage(chatId, `❌ Вы уже использовали свой пробный период на 5 дней!`);
    }

    user.trialUsed = true;
    user.expiresAt = (user.expiresAt > Date.now() ? user.expiresAt : Date.now()) + 5 * 86400000;
    saveDB(usersDatabase);

    const subUrl = `${BACKEND_URL}/api/sub/${userKey}`;
    botInstance.sendMessage(chatId, 
        `🎉 **Вам успешно зачислен пробный период на 5 дней!**\n\n` +
        `🔗 **Ваша ссылка подписки:**\n\`${subUrl}\``, 
        { parse_mode: 'Markdown' }
    );
}

async function processPaymentCode(login, paymentId) {
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
        const currentExpire = user.expiresAt > Date.now() ? user.expiresAt : Date.now();
        user.expiresAt = currentExpire + days * 86400000;
        saveDB(usersDatabase);

        const subUrl = `${BACKEND_URL}/api/sub/${userKey}`;
        return { success: true, days, subUrl };
    } catch (e) {
        return { success: false, message: '❌ Ошибка проверки кода на сервере.' };
    }
}

// --- API САЙТА ---
app.get('/', (req, res) => {
    res.send('FlorezokVPN Backend is running!');
});

app.post('/api/auth/register', (req, res) => {
    usersDatabase = loadDB();
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ success: false, message: 'Заполните поля' });
    const login = username.trim().toLowerCase();
    if (usersDatabase[login]) return res.status(400).json({ success: false, message: 'Логин занят' });
    usersDatabase[login] = { password, expiresAt: 0 };
    saveDB(usersDatabase);
    res.json({ success: true });
});

app.post('/api/auth/login', (req, res) => {
    usersDatabase = loadDB();
    const { username, password } = req.body;
    const login = username ? username.trim().toLowerCase() : '';
    const user = usersDatabase[login];
    if (!user || user.password !== password) return res.status(401).json({ success: false, message: 'Неверные данные' });
    res.json({ success: true, username: login });
});

app.post('/api/activate-code', async (req, res) => {
    const { username, paymentId } = req.body;
    if (!username || !paymentId) return res.status(400).json({ success: false, message: 'Заполните логин и код' });
    const result = await processPaymentCode(username, paymentId.trim());
    res.json(result);
});

app.get('/api/sub/:username', (req, res) => {
    usersDatabase = loadDB();
    const login = req.params.username.trim().toLowerCase();
    const user = usersDatabase[login];
    res.set('Content-Type', 'text/plain; charset=utf-8');

    if (user && Date.now() <= user.expiresAt) {
        const expireSeconds = Math.floor(user.expiresAt / 1000);
        const headers = [
            `#profile-update-interval: 1`,
            `#profile-title: 🏳️ Florezok (${login})`,
            `#subscription-userinfo: upload=0; download=0; total=0; expire=${expireSeconds}`
        ];
        return res.send(headers.join('\n') + '\n\n' + defaultVlessKeys.join('\n\n'));
    }
    return res.send([`#profile-update-interval: 1`, `#profile-title: ❌ Подписка истекла`].join('\n') + '\n\n' + globalExpiredKey);
});

// --- TELEGRAM БОТ ---
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const keyboard = {
        reply_markup: {
            keyboard: [
                [{ text: '💳 Купить' }, { text: '👤 Мой профиль' }],
                [{ text: '🎁 Пробный период (5 дней)' }, { text: '📖 Инструкция' }]
            ],
            resize_keyboard: true
        }
    };
    bot.sendMessage(chatId, `👋 Добро пожаловать в **FlorezokVPN**!\n\nВыберите тариф или активируйте бесплатный пробный период на 5 дней!`, { parse_mode: 'Markdown', ...keyboard });
});

bot.on('message', async (msg) => {
    if (!msg.text) return;

    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;
    const username = msg.from.username ? msg.from.username.toLowerCase() : `tg_${userId}`;

    if (text === '💳 Купить') {
        const tariffsText = 
            `💎 **Выберите тариф:**\n` +
            `Ваш логин для подписки: \`${username}\`\n\n` +
            `⚠️ **Обязательно пришлите код платежа из чека прямо в этот чат после оплаты!**`;
        
        const inlineKeyboard = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '1 Месяц (150 ₽)', url: 'https://yookassa.ru/my/i/au4a647hWPzD/l' }],
                    [{ text: '3 Месяца (375 ₽)', url: 'https://yookassa.ru/my/i/au4bJLCp8dGe/l' }],
                    [{ text: '6 Месяцев (660 ₽)', url: 'https://yookassa.ru/my/i/au4bSkpIvx0J/l' }],
                    [{ text: '1 Год (1140 ₽)', url: 'https://yookassa.ru/my/i/au4bZXML-7FH/l' }]
                ]
            }
        };
        return bot.sendMessage(chatId, tariffsText, { parse_mode: 'Markdown', ...inlineKeyboard });
    }

    if (text === '🎁 Пробный период (5 дней)') {
        const isSubscribed = await checkChannelSubscription(userId);

        if (!isSubscribed) {
            const channelKb = {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '📢 Подписаться на канал', url: 'https://t.me/Florezok_VPN' }],
                        [{ text: '✅ Я подписался', callback_data: 'check_sub_trial' }]
                    ]
                }
            };
            return bot.sendMessage(chatId, `🔔 **Для получения пробного периода нужно подписаться на канал!**\n\n1. Нажмите кнопку ниже и подпишитесь на @Florezok_VPN\n2. Вернитесь сюда и нажмите **«✅ Я подписался»**.`, { parse_mode: 'Markdown', ...channelKb });
        }

        grantTrial(username, chatId, bot);
        return;
    }

    if (text === '👤 Мой профиль') {
        usersDatabase = loadDB();
        const user = usersDatabase[username];
        const now = Date.now();

        if (user && now <= user.expiresAt) {
            const daysLeft = Math.ceil((user.expiresAt - now) / 86400000);
            const subUrl = `${BACKEND_URL}/api/sub/${username}`;
            return bot.sendMessage(chatId, 
                `👤 **Ваш аккаунт:** \`${username}\`\n` +
                `Статус: 🟢 **Активна** (Осталось дней: **${daysLeft}**)\n\n` +
                `🔗 **Ссылка подписки:**\n\`${subUrl}\``, 
                { parse_mode: 'Markdown' }
            );
        } else {
            return bot.sendMessage(chatId, `👤 **Ваш аккаунт:** \`${username}\`\nСтатус: 🔴 **Неактивна**`, { parse_mode: 'Markdown' });
        }
    }

    if (text === '📖 Инструкция') {
        return bot.sendMessage(chatId, `📖 **Настройка:**\n1. Скачайте **happ** или **Hiddify**.\n2. Скопируйте ссылку из раздела «Мой профиль».\n3. Вставьте ссылку в приложение и подсоединяйтесь!`);
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(text.trim())) {
        const paymentId = text.trim();
        bot.sendMessage(chatId, `⏳ Проверяем код платежа \`${paymentId}\`...`, { parse_mode: 'Markdown' });

        const result = await processPaymentCode(username, paymentId);
        if (result.success) {
            return bot.sendMessage(chatId, 
                `🎉 **ПОДПИСКА УСПЕШНО АКТИВИРОВАНА!**\n\n` +
                `✅ Логин: \`${username}\`\n` +
                `⏳ Добавлено дней: **${result.days}**\n\n` +
                `🔗 **Ваша ссылка подписки:**\n\`${result.subUrl}\``, 
                { parse_mode: 'Markdown' }
            );
        } else {
            return bot.sendMessage(chatId, result.message);
        }
    }
});

bot.on('callback_query', async (query) => {
    if (query.data === 'check_sub_trial') {
        const userId = query.from.id;
        const chatId = query.message.chat.id;
        const username = query.from.username ? query.from.username.toLowerCase() : `tg_${userId}`;
        
        const isSubscribed = await checkChannelSubscription(userId);

        if (isSubscribed) {
            bot.answerCallbackQuery(query.id, { text: '✅ Подписка подтверждена!' });
            try { bot.deleteMessage(chatId, query.message.message_id); } catch(e){}
            grantTrial(username, chatId, bot);
        } else {
            bot.answerCallbackQuery(query.id, { text: '❌ Вы еще не подписались на канал или бот не администратор в канале!', show_alert: true });
        }
    }
});

bot.on('polling_error', (error) => {
    if (!error.message.includes('409 Conflict')) {
        console.error("Polling error:", error);
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Сервер и бот успешно запущены на порту ${PORT}`);
});
