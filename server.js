const express = require('express');
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cors());

// Простая база данных в памяти сервера (для теста)
const database = {};

// 1. Активация/покупка подписки (выдает доступ на 1 минуту)
app.post('/api/admin/grant', (req, res) => {
    const { userId, durationMinutes = 1 } = req.body;
    
    if (!userId) {
        return res.status(400).json({ success: false, message: 'Не указан ID пользователя' });
    }

    // Время истечения: текущий момент + количество минут (по умолчанию 1 минута)
    const expiresAt = Date.now() + durationMinutes * 60 * 1000;

    database[userId] = {
        active: true,
        expiresAt: expiresAt
    };

    console.log(`[ПОКУПКА/АКТИВАЦИЯ] Пользователю ${userId} выдана подписка на ${durationMinutes} мин.`);
    res.json({ success: true, message: `Подписка успешно активирована на ${durationMinutes} мин!` });
});

// 2. Проверка статуса подписки пользователя
app.get('/api/status/:userId', (req, res) => {
    const { userId } = req.params;
    const user = database[userId];

    if (!user) {
        return.json({ active: false, reason: 'not_found' });
    }

    // Проверяем, не вышло ли время подписки
    if (Date.now() > user.expiresAt) {
        user.active = false;
    }

    res.json({
        active: user.active,
        timeLeftMs: Math.max(0, user.expiresAt - Date.now())
    });
});

// Порт для запуска (HostGta автоматически передает порт через process.env.PORT, либо используем 3000)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Сервер FlorezokVPN успешно запущен на порту ${PORT}`);
});