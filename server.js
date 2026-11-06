const express = require('express');
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cors());

// База данных в памяти сервера
const database = {};

// Твои VLESS-ключи (добавь сюда свои реальные ключи, разделяя их строками)
const vlessKeys = [
    "vless://florezok-secure-node-connection-token-9982@server.florezok.net:443?encryption=none&type=tcp#Node-1"
];

// 1. Активация/покупка тестового периода (дает доступ на 1 минуту)
app.post('/api/admin/grant', (req, res) => {
    const { userId, durationMinutes = 1 } = req.body;
    
    if (!userId) {
        return res.status(400).json({ success: false, message: 'Не указан ID пользователя' });
    }

    const expiresAt = Date.now() + durationMinutes * 60 * 1000;

    database[userId] = {
        active: true,
        expiresAt: expiresAt
    };

    console.log(`[АКТИВАЦИЯ] Пользователю ${userId} выдана подписка на ${durationMinutes} мин.`);
    res.json({ success: true, message: `Подписка успешно активирована!` });
});

// 2. Проверка статуса (для таймера на сайте)
app.get('/api/status/:userId', (req, res) => {
    const { userId } = req.params;
    const user = database[userId];

    if (!user || Date.now() > user.expiresAt) {
        return res.json({ active: false, timeLeftMs: 0 });
    }

    res.json({
        active: true,
        timeLeftMs: user.expiresAt - Date.now()
    });
});

// 3. Персональный генератор подписки для happ / Hiddify
app.get('/api/sub/:userId', (req, res) => {
    const { userId } = req.params;
    const user = database[userId];

    // Если подписка неактивна или истекла — отдаем пустой ответ / заглушку, чтобы happ заблокировал интернет
    if (!user || Date.now() > user.expiresAt) {
        return res.status(403).set('Content-Type', 'text/plain; charset=utf-8').send("# Подписка истекла или не активна");
    }

    // Если активна — отдаем список ключей
    const subscriptionContent = vlessKeys.join('\n');
    res.set('Content-Type', 'text/plain; charset=utf-8').send(subscriptionContent);
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Сервер FlorezokVPN успешно запущен на порту ${PORT}`);
});