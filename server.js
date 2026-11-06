const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');

// --- НАСТРОЙКИ ---
const TELEGRAM_BOT_TOKEN = '9147658037:AAEaYJ56epN4hTrJXEqWm6PTC7qwO3WI7SE';
const PORT = process.env.PORT || 3000;
const BACKEND_URL = 'https://florezokvpn.onrender.com';

// Данные API ЮKassa
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

// --- РАБОТА С БАЗОЙ ---
function loadDB() {
    try {
        if (fs.existsSync(DB_FILE)) {
            return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        }
    } catch (e) { console.error("Ошибка чтения базы:", e); }
    return {};
}

function saveDB(db) {
    try { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8'); }
    catch (e) { console.error("Ошибка сохранения базы:", e); }
}

function loadUsedPayments() {
    try {
        if (fs.existsSync(PAYMENTS_FILE)) {
            return JSON.parse(fs.readFileSync(PAYMENTS_FILE, 'utf8'));
        }
    } catch (e) { console.error("Ошибка чтения платежей:", e); }
    return [];
}

function saveUsedPayments(list) {
    try { fs.writeFileSync(PAYMENTS_FILE, JSON.stringify(list, null, 2), 'utf8'); }
    catch (e) { console.error("Ошибка сохранения платежей:", e); }
}

let usersDatabase = loadDB();
let usedPayments = loadUsedPayments();

let globalExpiredKey = "vless://00000000-0000-0000-0000-000000000000@expired.florezok.net:443?encryption=none&type=tcp#%E2%9D%8C%20%D0%A2%D0%90%D0%A0%D0%98%D0%A4%20%D0%97%D0%90%D0%9A%D0%9E%D0%9D%D0%A7%D0%98%D0%9B%D0%A1%D0%AF%20%E2%80%A2%20%D0%9F%D0%A0%D0%9E%D0%94%D0%9B%D0%98%D0%AC%20%D0%9D%D0%90%20%D0%A1%D0%90%D0%99%D0%A2%D0%95";

const defaultVlessKeys = [
    "vless://fb37d713-0ed3-4146-b085-a5c879a9aafa@81.163.22.194:443?flow=xtls-rprx-vision&encryption=none&security=reality&sni=apply.betust.net&fp=firefox&pbk=T98nmnCp0qrmkH1Oq92Tk94sCYa5RuuEjp8bDDbdVxk&sid=b20168a5&spx=%2F&type=tcp&headerType=none#%F0%9F%87%B7%F0%9F%87%BA%D0%9E%D0%B1%D1%85%D0%BE%D0%B4%20%D0%B1%D0%B5%D0%BB%D1%8B%D1%85%20%D1%81%D0%بي%D1%81%D0%BA%D0%BE%D0%B2%201",
    "vless://fb37d713-0ed3-4146-b085-a5c879a9aafa@81.163.22.194:443?flow=xtls-rprx-vision&encryption=none&security=reality&sni=apply.betust.net&fp=firefox&pbk=T98nmnCp0qrmkH1Oq92Tk94sCYa5RuuEjp8bDDbdVxk&sid=b20168a5&spx=%2F&type=tcp&headerType=none#%F0%9F%87%B7%F0%9F%87%BA%D0%9E%D0%B1%D1%85%D0%BE%D0%B4%20%D0%B1%D0%B5%D0%BB%D1%8B%D1%85%20%D1%81%D0%би%D1%81%D0%BA%D0%BE%D0%B2%202"
];

// --- ПРОВЕРКА КОДА ПЛАТЕЖА ЧЕРЕЗ ЮКАССУ ---
async function verifyYookassaPayment(paymentId) {
    if (usedPayments.includes(paymentId)) {
        return { valid: false, message: '❌ Этот код платежа уже был использован!' };
    }

    try {
        const auth = Buffer.from(`${YOOKASSA_SHOP_ID}:${YOOKASSA_SECRET_KEY}`).toString('base64');
        const response = await fetch(`https://api.yookassa.ru/v3/payments/${paymentId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            return { valid: false, message: '❌ Платеж с таким кодом не найден в ЮKassa.' };
        }

        const data = await response.json();

        if (data.status !== 'succeeded') {
            return { valid: false, message: `⚠️ Платеж найден, но его статус: ${data.status}. Оплата еще не завершена.` };
        }

        const amount = parseFloat(data.amount.value);
        let days = 30;
        if (amount === 1) days = 1;
        else if (amount === 150) days = 30;
        else if (amount === 375) days = 90;
        else if (amount === 660) days = 180;
        else if (amount === 1140) days = 365;

        // Фиксируем платеж как использованный
        usedPayments.push(paymentId);
        saveUsedPayments(usedPayments);

        return { valid: true, days: days, amount: amount };

    } catch (e) {
        console.error("Ошибка при обращении к ЮKassa API:", e);
        return { valid: false, message: '❌ Ошибка проверки кода на сервере ЮKassa.' };
    }
}

// --- API САЙТА ---
app.post('/api/auth/register', (req, res) => {
    usersDatabase = loadDB();
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ success: false, message: 'Заполните все поля' });
    const login = username.trim().toLowerCase();
    if (usersDatabase[login]) return res.status(400).json({ success: false, message: 'Логин уже занят' });
    usersDatabase[login] = { password, expiresAt: 0 };
    saveDB(usersDatabase);
    res.json({ success: true, message: 'Регистрация успешна' });
});

app.post('/api/auth/login', (req, res) => {
    usersDatabase = loadDB();
    const { username, password } = req.body;
    const login = username ? username.trim().toLowerCase() : '';
    const user = usersDatabase[login];
    if (!user || user.password !== password) {
        return res.status(401).json({ success: false, message: 'Неверный логин или пароль' });
    }
    res.json({ success: true, username: login });
});

app.get('/api/status/:username', (req, res) => {
    usersDatabase = loadDB();
    const login = req.params.username.trim().toLowerCase();
    const user = usersDatabase[login];
    if (!user || Date.now() > user.expiresAt) {
        return res.json({ active: false, timeLeftMs: 0 });
    }
    res.json({ active: true, timeLeftMs: user.expiresAt - Date.now() });
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

    const expiredHeaders = [`#profile-update-interval: 1`, `#profile-title: ❌ Подписка истекла`];
    return res.send(expiredHeaders.join('\n') + '\n\n' + globalExpiredKey);
});

// Админка
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && (password === 'admin' || password === 'chiha')) {
        res.json({ success: true });
    } else { res.status(401).json({ success: false }); }
});

app.get('/api/admin/clients', (req, res) => {
    usersDatabase = loadDB();
    const now = Date.now();
    const list = [];
    for (const [login, user] of Object.entries(usersDatabase)) {
        list.push({ username: login, active: now <= user.expiresAt, expiresAt: user.expiresAt });
    }
    res.json({ clients: list });
});

app.post('/api/admin/save-client', (req, res) => {
    usersDatabase = loadDB();
    const { username, days } = req.body;
    const login = username ? username.trim().toLowerCase() : '';
    const addDays = parseInt(days) || 0;
    if (!login) return res.status(400).json({ success: false, message: 'Укажите логин' });
    if (!usersDatabase[login]) usersDatabase[login] = { password: '123', expiresAt: 0 };
    const user = usersDatabase[login];
    user.expiresAt = (user.expiresAt > Date.now() ? user.expiresAt : Date.now()) + addDays * 86400000;
    saveDB(usersDatabase);
    res.json({ success: true });
});

app.post('/api/admin/delete-client', (req, res) => {
    usersDatabase = loadDB();
    delete usersDatabase[req.body.username];
    saveDB(usersDatabase);
    res.json({ success: true });
});


// --- TELEGRAM БОТ ---
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const keyboard = {
        reply_markup: {
            keyboard: [
                [{ text: '💳 Купить' }, { text: '👤 Мой профиль' }],
                [{ text: '🔑 Активировать по коду' }, { text: '📖 Инструкция' }]
            ],
            resize_keyboard: true
        }
    };
    bot.sendMessage(chatId, `👋 Добро пожаловать в **FlorezokVPN**!\n\nКупите подписку или нажмите «Активировать по коду» и отправьте номер платежа.`, { parse_mode: 'Markdown', ...keyboard });
});

const userStates = {};

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    const username = msg.from.username ? msg.from.username.toLowerCase() : `tg_${msg.from.id}`;

    if (text === '💳 Купить') {
        const tariffsText = `💎 **Выберите тариф:**\nВаш логин для подписки: \`${username}\``;
        const inlineKeyboard = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'Тест (1 рубль)', url: 'https://yookassa.ru/my/i/au40gd6mmFd5/l' }],
                    [{ text: '1 Месяц (150 ₽)', url: 'https://yookassa.ru/my/i/au4a647hWPzD/l' }],
                    [{ text: '3 Месяца (375 ₽)', url: 'https://yookassa.ru/my/i/au4bJLCp8dGe/l' }],
                    [{ text: '6 Месяцев (660 ₽)', url: 'https://yookassa.ru/my/i/au4bSkpIvx0J/l' }],
                    [{ text: '1 Год (1140 ₽)', url: 'https://yookassa.ru/my/i/au4bZXML-7FH/l' }]
                ]
            }
        };
        return bot.sendMessage(chatId, tariffsText, { parse_mode: 'Markdown', ...inlineKeyboard });
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
                `🔗 **Ссылка для приложения:**\n\`${subUrl}\``, 
                { parse_mode: 'Markdown' }
            );
        } else {
            return bot.sendMessage(chatId, `👤 **Ваш аккаунт:** \`${username}\`\nСтатус: 🔴 **Неактивна**`, { parse_mode: 'Markdown' });
        }
    }

    if (text === '🔑 Активировать по коду') {
        userStates[chatId] = 'WAITING_PAYMENT_CODE';
        return bot.sendMessage(chatId, `🔍 **Отправьте код платежа из чека ЮKassa.**\nПример: \`328068cd-000f-5001-9000-1697ba54ef69\``, { parse_mode: 'Markdown' });
    }

    if (text === '📖 Инструкция') {
        return bot.sendMessage(chatId, `📖 **Настройка:**\n1. Скачайте **happ** или Hiddify.\n2. Скопируйте ссылку из «Мой профиль».\n3. Вставьте ссылку в приложение и подсоединяйтесь!`);
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (userStates[chatId] === 'WAITING_PAYMENT_CODE' || uuidRegex.test(text.trim())) {
        delete userStates[chatId];
        const paymentId = text.trim();

        bot.sendMessage(chatId, `⏳ Проверяем код платежа \`${paymentId}\`...`, { parse_mode: 'Markdown' });

        const result = await verifyYookassaPayment(paymentId);

        if (result.valid) {
            usersDatabase = loadDB();
            if (!usersDatabase[username]) {
                usersDatabase[username] = { password: 'auto_generated', expiresAt: 0 };
            }
            const user = usersDatabase[username];
            const currentExpire = user.expiresAt > Date.now() ? user.expiresAt : Date.now();
            user.expiresAt = currentExpire + result.days * 86400000;
            saveDB(usersDatabase);

            const subUrl = `${BACKEND_URL}/api/sub/${username}`;
            
            bot.sendMessage(chatId, 
                `🎉 **ПОДПИСКА УСПЕШНО АКТИВИРОВАНА!**\n\n` +
                `✅ Аккаунт на сайте создан/продлен: \`${username}\`\n` +
                `⏳ Добавлено дней: **${result.days}**\n\n` +
                `🔗 **Ваша подписка:**\n\`${subUrl}\``, 
                { parse_mode: 'Markdown' }
            );
        } else {
            bot.sendMessage(chatId, result.message);
        }
    }
});

bot.on('polling_error', (error) => {
    if (!error.message.includes('409 Conflict')) {
        console.error("Polling error:", error);
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Сервер и бот успешно запущены на порту ${PORT}`);
});
