const express = require('express');
const cors = require('cors');

const app = express();

app.use(express.json());
app.use(cors());

// База данных в памяти сервера (надежно работает на Render)
const usersDatabase = {}; // логин -> { password, expiresAt }

let globalExpiredKey = "vless://00000000-0000-0000-0000-000000000000@expired.florezok.net:443?encryption=none&type=tcp#%E2%9D%8C%20%D0%A2%D0%90%D0%A0%D0%98%D0%A4%20%D0%97%D0%90%D0%9A%D0%9E%D0%9D%D0%A7%D0%98%D0%9B%D0%A1%D0%AF";

const defaultVlessKeys = [
    "vless://fb37d713-0ed3-4146-b085-a5c879a9aafa@81.163.22.194:443?flow=xtls-rprx-vision&encryption=none&security=reality&sni=apply.betust.net&fp=firefox&pbk=T98nmnCp0qrmkH1Oq92Tk94sCYa5RuuEjp8bDDbdVxk&type=tcp#%F0%9F%87%B7%F0%9F%87%BA%D0%9E%D0%B1%D1%85%D0%BE%D0%B4%201",
    "vless://d16f7276-b967-440d-88b7-76945654ed55@188.225.79.22:443?encryption=none&security=reality&sni=quartzops.blog&fp=firefox&pbk=LqyEitRDFcMxFuH45Vx1551cOqrI6UHYvkKgs7gNaho&type=grpc#%F0%9F%87%B7%F0%9F%87%BA%D0%9E%D0%B1%D1%85%D0%BE%D0%B4%202"
];

// Регистрация
app.post('/api/auth/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ success: false, message: 'Заполните все поля' });
    
    const login = username.trim();
    if (usersDatabase[login]) {
        return res.status(400).json({ success: false, message: 'Логин уже занят' });
    }

    usersDatabase[login] = {
        password: password,
        expiresAt: 0 // Изначально подписка неактивна
    };

    res.json({ success: true, message: 'Регистрация успешна' });
});

// Авторизация
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    const login = username ? username.trim() : '';
    
    const user = usersDatabase[login];
    if (!user || user.password !== password) {
        return res.status(401).json({ success: false, message: 'Неверный логин или пароль' });
    }

    res.json({ success: true, username: login });
});

// Статус подписки
app.get('/api/status/:username', (req, res) => {
    const login = req.params.username.trim();
    const user = usersDatabase[login];

    if (!user || Date.now() > user.expiresAt) {
        return res.json({ active: false, timeLeftMs: 0 });
    }
    res.json({ active: true, timeLeftMs: user.expiresAt - Date.now() });
});

// Получение ссылки подписки (VLESS)
app.get('/api/sub/:username', (req, res) => {
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

// --- 3X-UI АДМИН-ПАНЕЛЬ ---
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === 'admin') {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false });
    }
});

app.get('/api/admin/clients', (req, res) => {
    const now = Date.now();
    const list = [];

    for (const [login, user] of Object.entries(usersDatabase)) {
        const active = now <= user.expiresAt;
        list.push({
            username: login,
            active: active,
            timeLeftMin: active ? Math.ceil((user.expiresAt - now) / 60000) : 0
        });
    }

    res.json({ clients: list });
});

// Выдача / продление подписки админом
app.post('/api/admin/save-client', (req, res) => {
    const { username, days } = req.body;
    const login = username ? username.trim() : '';
    const addDays = parseInt(days) || 0;

    if (!login) return res.status(400).json({ success: false, message: 'Укажите логин' });

    if (!usersDatabase[login]) {
        // Если юзера нет в памяти, создаем автоматически
        usersDatabase[login] = { password: '123', expiresAt: 0 };
    }

    const user = usersDatabase[login];
    const currentExpire = user.expiresAt > Date.now() ? user.expiresAt : Date.now();
    user.expiresAt = currentExpire + addDays * 24 * 60 * 60 * 1000;

    res.json({ success: true });
});

app.post('/api/admin/delete-client', (req, res) => {
    const { username } = req.body;
    delete usersDatabase[username];
    res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));