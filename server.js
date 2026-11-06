const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');

// --- НАСТРОЙКИ ---
const TELEGRAM_BOT_TOKEN = '9147658037:AAEaYJ56epN4hTrJXEqWm6PTC7qwO3WI7SE';
const YOOKASSA_SECRET_KEY = 'live_zdfOFIU0YPqEEk_Nk_3V3hw-Pi2sGcXOQ-yB_57TJyc';

const PORT = process.env.PORT || 3000;
const BACKEND_URL = 'https://florezokvpn.samp.date'; // Твой основной домен

const app = express();
app.use(express.json());
app.use(cors());

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });
const DB_FILE = path.join(__dirname, 'users.json');

function loadDB() {
    try {
        if (fs.existsSync(DB_FILE)) {
            const data = fs.readFileSync(DB_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (e) {
        console.error("Ошибка чтения базы:", e);
    }
    return {};
}

function saveDB(db) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
    } catch (e) {
        console.error("Ошибка сохранения базы:", e);
    }
}

let usersDatabase = loadDB();

let globalExpiredKey = "vless://00000000-0000-0000-0000-000000000000@expired.florezok.net:443?encryption=none&type=tcp#%E2%9D%8C%20%D0%A2%D0%90%D0%A0%D0%98%D0%A4%20%D0%97%D0%90%D0%9A%D0%9E%D0%9D%D0%A7%D0%98%D0%9B%D0%A1%D0%AF%20%E2%80%A2%20%D0%9F%D0%A0%D0%9E%D0%94%D0%9B%D0%98%D0%AC%20%D0%9D%D0%90%20%D0%A1%D0%90%D0%99%D0%A2%D0%95";

const defaultVlessKeys = [
    "vless://fb37d713-0ed3-4146-b085-a5c879a9aafa@81.163.22.194:443?flow=xtls-rprx-vision&encryption=none&security=reality&sni=apply.betust.net&fp=firefox&pbk=T98nmnCp0qrmkH1Oq92Tk94sCYa5RuuEjp8bDDbdVxk&sid=b20168a5&spx=%2F&type=tcp&headerType=none#%F0%9F%87%B7%F0%9F%87%BA%D0%9E%D0%B1%D1%85%D0%BE%D0%B4%20%D0%B1%D0%B5%D0%BB%D1%8B%D1%85%20%D1%81%D0%BF%D0%B8%D1%81%D0%BA%D0%BE%D0%B2%201",
    "vless://fb37d713-0ed3-4146-b085-a5c879a9aafa@81.163.22.194:443?flow=xtls-rprx-vision&encryption=none&security=reality&sni=apply.betust.net&fp=firefox&pbk=T98nmnCp0qrmkH1Oq92Tk94sCYa5RuuEjp8bDDbdVxk&sid=b20168a5&spx=%2F&type=tcp&headerType=none#%F0%9F%87%B7%F0%9F%87%BA%D0%9E%D0%B1%D1%85%D0%BE%D0%B4%20%D0%B1%D0%B5%D0%BB%D1%8B%D1%85%20%D1%81%D0%BF%D0%B8%D1%81%D0%BA%D0%BE%D0%B2%202",
    "vless://d16f7276-b967-440d-88b7-76945654ed55@188.225.79.22:443?encryption=none&security=reality&sni=quartzops.blog&fp=firefox&pbk=LqyEitRDFcMxFuH45Vx1551cOqrI6UHYvkKgs7gNaho&sid=e347493990237143&type=grpc&mode=gun&authority=&serviceName=grpc-baf3bc8498#%F0%9F%87%B7%F0%9F%87%BA%D0%9E%D0%B1%D1%85%D0%BE%D0%B4%20%D0%B1%D0%B5%D0%BB%D1%8B%D1%85%20%D1%81%D0%BF%D0%B8%D1%81%D0%BA%D0%BE%D0%B2%203",
    "vless://d16f7276-b967-440d-88b7-76945654ed55@188.225.79.22:443?encryption=none&security=reality&sni=quartzops.blog&fp=firefox&pbk=LqyEitRDFcMxFuH45Vx1551cOqrI6UHYvkKgs7gNaho&sid=e347493990237143&type=grpc&mode=gun&authority=&serviceName=grpc-baf3bc8498#%F0%9F%87%B7%F0%9F%87%BA%D0%9E%D0%B1%D1%85%D0%BE%D0%B4%20%D0%B1%D0%B5%D0%BB%D1%8B%D1%85%20%D1%81%D0%BF%D0%B8%D1%81%D0%BA%D0%BE%D0%B2%204"
];

// --- API САЙТА И ВЕБХУК ЮКАССЫ ---

app.post('/api/auth/register', (req, res) => {
    usersDatabase = loadDB();
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ success: false, message: 'Заполните все поля' });
    const login = username.trim();
    if (usersDatabase[login]) return res.status(400).json({ success: false, message: 'Логин уже занят' });
    usersDatabase[login] = { password, expiresAt: 0 };
    saveDB(usersDatabase);
    res.json({ success: true, message: 'Регистрация успешна' });
});

app.post('/api/auth/login', (req, res) => {
    usersDatabase = loadDB();
    const { username, password } = req.body;
    const login = username ? username.trim() : '';
    const user = usersDatabase[login];
    if (!user || user.password !== password) {
        return res.status(401).json({ success: false, message: 'Неверный логин или пароль' });
    }
    res.json({ success: true, username: login });
});

app.get('/api/status/:username', (req, res) => {
    usersDatabase = loadDB();
    const login = req.params.username.trim();
    const user = usersDatabase[login];
    if (!user || Date.now() > user.expiresAt) {
        return res.json({ active: false, timeLeftMs: 0 });
    }
    res.json({ active: true, timeLeftMs: user.expiresAt - Date.now() });
});

app.get('/api/sub/:username', (req, res) => {
    usersDatabase = loadDB();
    const login = req.params.username.trim();
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

// Вебхук от ЮKassa (теперь отправляет уведомления на твой домен)
app.post('/api/webhook/yookassa', (req, res) => {
    const event = req.body;
    
    if (event && event.event === 'payment.succeeded') {
        const payment = event.object;
        const username = payment.metadata ? payment.metadata.username : null;
        const days = parseInt(payment.metadata ? payment.metadata.days : 30) || 30;

        if (username) {
            usersDatabase = loadDB();
            if (!usersDatabase[username]) {
                usersDatabase[username] = { password: '123', expiresAt: 0 };
            }
            const user = usersDatabase[username];
            const currentExpire = user.expiresAt > Date.now() ? user.expiresAt : Date.now();
            user.expiresAt = currentExpire + days * 24 * 60 * 60 * 1000;
            saveDB(usersDatabase);
            console.log(`✅ Автоматически зачислено дней (${days}) для юзера: ${username}`);
        }
    }
    res.status(200).json({ status: 'ok' });
});

// Админка
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && (password === 'admin' || password === 'chiha')) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false });
    }
});

app.get('/api/admin/clients', (req, res) => {
    usersDatabase = loadDB();
    const now = Date.now();
    const list = [];
    for (const [login, user] of Object.entries(usersDatabase)) {
        const active = now <= user.expiresAt;
        list.push({ username: login, active: active, expiresAt: user.expiresAt });
    }
    res.json({ clients: list });
});

app.post('/api/admin/save-client', (req, res) => {
    usersDatabase = loadDB();
    const { username, days } = req.body;
    const login = username ? username.trim() : '';
    const addDays = parseInt(days) || 0;
    if (!login) return res.status(400).json({ success: false, message: 'Укажите логин' });
    if (!usersDatabase[login]) {
        usersDatabase[login] = { password: '123', expiresAt: 0 };
    }
    const user = usersDatabase[login];
    const currentExpire = user.expiresAt > Date.now() ? user.expiresAt : Date.now();
    user.expiresAt = currentExpire + addDays * 24 * 60 * 60 * 1000;
    saveDB(usersDatabase);
    res.json({ success: true });
});

app.post('/api/admin/delete-client', (req, res) => {
    usersDatabase = loadDB();
    const { username } = req.body;
    delete usersDatabase[username];
    saveDB(usersDatabase);
    res.json({ success: true });
});


// --- TELEGRAM БОТ ---

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const keyboard = {
        reply_markup: {
            keyboard: [
                [{ text: 'Купить' }, { text: 'Мой профиль' }],
                [{ text: 'Инструкция' }]
            ],
            resize_keyboard: true
        }
    };
    bot.sendMessage(chatId, `👋 Добро пожаловать в **FlorezokVPN**!\n\nВыберите нужное действие в меню ниже:`, { parse_mode: 'Markdown', ...keyboard });
});

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    const username = msg.from.username ? msg.from.username.toLowerCase() : `tg_${msg.from.id}`;

    if (text === 'Купить') {
        const tariffsText = 
            `💎 **Выберите тариф для покупки:**\n\n` +
            `Ваш аккаунт для привязки: \`${username}\``;
        
        const inlineKeyboard = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'Тест (1 рубль)', url: `https://yookassa.ru/my/i/au40gd6mmFd5/l?label=${username}` }],
                    [{ text: '1 Месяц (150 ₽)', url: `https://yookassa.ru/my/i/au4a647hWPzD/l?label=${username}` }],
                    [{ text: '3 Месяца (375 ₽)', url: `https://yookassa.ru/my/i/au4bJLCp8dGe/l?label=${username}` }],
                    [{ text: '6 Месяцев (660 ₽)', url: `https://yookassa.ru/my/i/au4bSkpIvx0J/l?label=${username}` }],
                    [{ text: '1 Год (1140 ₽)', url: `https://yookassa.ru/my/i/au4bZXML-7FH/l?label=${username}` }],
                    [{ text: '🔄 Проверить оплату', callback_data: 'check_sub' }]
                ]
            }
        };

        bot.sendMessage(chatId, tariffsText, { parse_mode: 'Markdown', ...inlineKeyboard });
    }

    if (text === 'Мой профиль') {
        const db = loadDB();
        const user = db[username];
        const now = Date.now();

        if (user && now <= user.expiresAt) {
            const daysLeft = Math.ceil((user.expiresAt - now) / (1000 * 60 * 60 * 24));
            const subUrl = `${BACKEND_URL}/api/sub/${username}`;
            bot.sendMessage(chatId, 
                `👤 **Ваш профиль:** \`${username}\`\n` +
                `status: 🟢 **Активна**\n` +
                `⏳ Осталось дней: **${daysLeft}**\n\n` +
                `🔗 **Ссылка подписки для happ / Hiddify:**\n` +
                `\`${subUrl}\``, 
                { parse_mode: 'Markdown' }
            );
        } else {
            bot.sendMessage(chatId, `👤 **Ваш профиль:** \`${username}\`\nstatus: 🔴 **Неактивна**`, { parse_mode: 'Markdown' });
        }
    }

    if (text === 'Инструкция') {
        bot.sendMessage(chatId, `📖 **Как настроить VPN:**\n1. Скачайте приложение **happ** или Hiddify.\n2. Скопируйте ссылку из раздела «Мой профиль».\n3. Добавьте её в приложение и включите VPN! 🚀`, { parse_mode: 'Markdown' });
    }
});

bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    const username = query.from.username ? query.from.username.toLowerCase() : `tg_${query.from.id}`;

    if (query.data === 'check_sub') {
        const db = loadDB();
        const user = db[username];
        const now = Date.now();

        if (user && now <= user.expiresAt) {
            const subUrl = `${BACKEND_URL}/api/sub/${username}`;
            bot.answerCallbackQuery(query.id, { text: '✅ Подписка активна!' });
            bot.sendMessage(chatId, `🎉 Подписка активна!\n\n🔗 Ваша ссылка подписки:\n\`${subUrl}\``, { parse_mode: 'Markdown' });
        } else {
            bot.answerCallbackQuery(query.id, { text: '❌ Оплата еще не поступила.' });
            bot.sendMessage(chatId, `⏳ Оплата пока не поступила в систему. Если вы уже оплатили, подождите 10-30 секунд и нажмите кнопку проверки снова.`);
        }
    }
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`🚀 Сервер и бот успешно запущены на порту ${PORT}`);
});
