const express = require('express');
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cors());

// База данных пользователей: { userId: { expiresAt, customServers: [...], customExpiredKey: "..." } }
const database = {};

// Глобальная заглушка по умолчанию (если админ не установил другую)
let globalExpiredKey = "vless://00000000-0000-0000-0000-000000000000@expired.florezok.net:443?encryption=none&type=tcp#%E2%9D%8C%20%D0%A2%D0%90%D0%A0%D0%98%D0%A4%20%D0%97%D0%90%D0%9A%D0%9E%D0%9D%D0%A7%D0%98%D0%9B%D0%A1%D0%AF%20%E2%80%A2%20%D0%9F%D0%A0%D0%9E%D0%94%D0%9B%D0%98%D0%A2%D0%AC%20%D0%9D%D0%90%20%D0%A1%D0%90%D0%99%D0%A2%D0%95";

// Все твои 20 базовых VLESS-ключей
const defaultVlessKeys = [
    "vless://fb37d713-0ed3-4146-b085-a5c879a9aafa@81.163.22.194:443?flow=xtls-rprx-vision&encryption=none&security=reality&sni=apply.betust.net&fp=firefox&pbk=T98nmnCp0qrmkH1Oq92Tk94sCYa5RuuEjp8bDDbdVxk&sid=b20168a5&spx=%2F&type=tcp&headerType=none#%F0%9F%87%B7%F0%9F%87%BA%D0%9E%D0%B1%D1%85%D0%BE%D0%B4%20%D0%B1%D0%B5%D0%BB%D1%8B%D1%85%20%D1%81%D0%BF%D0%B8%D1%81%D0%BA%D0%BE%D0%B2%201",
    "vless://fb37d713-0ed3-4146-b085-a5c879a9aafa@81.163.22.194:443?flow=xtls-rprx-vision&encryption=none&security=reality&sni=apply.betust.net&fp=firefox&pbk=T98nmnCp0qrmkH1Oq92Tk94sCYa5RuuEjp8bDDbdVxk&sid=b20168a5&spx=%2F&type=tcp&headerType=none#%F0%9F%87%B7%F0%9F%87%BA%D0%9E%D0%B1%D1%85%D0%BE%D0%B4%20%D0%B1%D0%B5%D0%BB%D1%8B%D1%85%20%D1%81%D0%BF%D0%B8%D1%81%D0%BA%D0%BE%D0%B2%202",
    "vless://d16f7276-b967-440d-88b7-76945654ed55@188.225.79.22:443?encryption=none&security=reality&sni=quartzops.blog&fp=firefox&pbk=LqyEitRDFcMxFuH45Vx1551cOqrI6UHYvkKgs7gNaho&sid=e347493990237143&type=grpc&mode=gun&authority=&serviceName=grpc-baf3bc8498#%F0%9F%87%B7%F0%9F%87%BA%D0%9E%D0%B1%D1%85%D0%BE%D0%B4%20%D0%B1%D0%B5%D0%BB%D1%8B%D1%85%20%D1%81%D0%BF%D0%B8%D1%81%D0%BA%D0%BE%D0%B2%203",
    "vless://d16f7276-b967-440d-88b7-76945654ed55@188.225.79.22:443?encryption=none&security=reality&sni=quartzops.blog&fp=firefox&pbk=LqyEitRDFcMxFuH45Vx1551cOqrI6UHYvkKgs7gNaho&sid=e347493990237143&type=grpc&mode=gun&authority=&serviceName=grpc-baf3bc8498#%F0%9F%87%B7%F0%9F%87%BA%D0%9E%D0%B1%D1%85%D0%BE%D0%B4%20%D0%B1%D0%B5%D0%BB%D1%8B%D1%85%20%D1%81%D0%BF%D0%B8%D1%81%D0%BA%D0%BE%D0%B2%204",
    "vless://00d09ead-4080-4c39-a75d-be7dcabe77f4@217.19.122.170:8443?flow=xtls-rprx-vision&encryption=none&security=reality&sni=bm9.hat.onl&fp=qq&pbk=Dx5aV0n9e1j_YDhVk8Z4O9HPrg1HLAuGKlmQpgERgDo&sid=8eeca41a32d1523d&type=tcp&headerType=none#%F0%9F%87%B7%F0%9F%87%BA%D0%9E%D0%B1%D1%85%D0%BE%D0%B4%20%D0%B1%D0%B5%D0%BB%D1%8B%D1%85%20%D1%81%D0%BF%D0%B8%D1%81%D0%BA%D0%BE%D0%B2%205",
    "vless://00d09ead-4080-4c39-a75d-be7dcabe77f4@217.19.122.170:8443?flow=xtls-rprx-vision&encryption=none&security=reality&sni=bm9.hat.onl&fp=qq&pbk=Dx5aV0n9e1j_YDhVk8Z4O9HPrg1HLAuGKlmQpgERgDo&sid=8eeca41a32d1523d&type=tcp&headerType=none#%F0%9F%87%B7%F0%9F%87%BA%D0%9E%D0%B1%D1%85%D0%BE%D0%B4%20%D0%B1%D0%B5%D0%BB%D1%8B%D1%85%20%D1%81%D0%BF%D0%B8%D1%81%D0%BA%D0%BE%D0%B2%206",
    "vless://c720cb74-4c84-4fce-b8ae-637dbaa16199@91.185.83.44:443?encryption=none&security=tls&sni=nguyxejonb.rucdncomp.pro&alpn=http%2F1.1&fp=firefox&type=ws&host=nguyxejonb.rucdncomp.pro&path=%2Fservice%2Ftelemetry%2F0294da469190%2F&headers=%7B%0A%20%20%22Host%22%3A%20%22nguyxejonb.rucdncomp.pro%22%0A%7D#%F0%9F%87%B7%F0%9F%87%BA%D0%9E%D0%B1%D1%85%D0%BE%D0%B4%20%D0%B1%D0%B5%D0%BB%D1%8B%D1%85%20%D1%81%D0%BF%D0%B8%D1%81%D0%BA%D0%BE%D0%B2%207",
    "vless://c720cb74-4c84-4fce-b8ae-637dbaa16199@91.185.83.44:443?encryption=none&security=tls&sni=nguyxejonb.rucdncomp.pro&alpn=http%2F1.1&fp=firefox&type=ws&host=nguyxejonb.rucdncomp.pro&path=%2Fservice%2Ftelemetry%2F0294da469190%2F&headers=%7B%0A%20%20%22Host%22%3A%20%22nguyxejonb.rucdncomp.pro%22%0A%7D#%F0%9F%87%B7%F0%9F%87%BA%D0%9E%D0%B1%D1%85%D0%BE%D0%B4%20%D0%B1%D0%B5%D0%BB%D1%8B%D1%85%20%D1%81%D0%BF%D0%B8%D1%81%D0%BA%D0%BE%D0%B2%208",
    "vless://c720cb74-4c84-4fce-b8ae-637dbaa16199@91.185.83.44:443?encryption=none&security=tls&sni=nguyxejonb.rucdncomp.pro&alpn=http%2F1.1&fp=firefox&type=ws&host=nguyxejonb.rucdncomp.pro&path=%2Fservice%2Ftelemetry%2F0294da469190%2F&headers=%7B%0A%20%20%22Host%22%3A%20%22nguyxejonb.rucdncomp.pro%22%0A%7D#%F0%9F%87%B7%F0%9F%87%BA%D0%9E%D0%B1%D1%85%D0%BE%D0%B4%20%D0%B1%D0%B5%D0%BB%D1%8B%D1%85%20%D1%81%D0%BF%D0%B8%D1%81%D0%BA%D0%BE%D0%B2%209",
    "vless://fb37d713-0ed3-4146-b085-a5c879a9aafa@81.163.22.194:443?flow=xtls-rprx-vision&encryption=none&security=reality&sni=apply.betust.net&fp=firefox&pbk=T98nmnCp0qrmkH1Oq92Tk94sCYa5RuuEjp8bDDbdVxk&sid=b20168a5&spx=%2F&type=tcp&headerType=none#%E2%96%B6%EF%B8%8F%20%D0%94%D0%BB%D1%8F%20YouTube%20%E2%84%962%20%F0%9F%87%B8%F0%9F%87%B4",
    "vless://00d09ead-4080-4c39-a75d-be7dcabe77f4@217.19.122.170:8443?flow=xtls-rprx-vision&encryption=none&security=reality&sni=bm9.hat.onl&fp=qq&pbk=Dx5aV0n9e1j_YDhVk8Z4O9HPrg1HLAuGKlmQpgERgDo&sid=8eeca41a32d1523d&type=tcp&headerType=none#%E2%96%B6%EF%B8%8F%20%D0%94%D0%BB%D1%8F%20YouTube%20%E2%84%961%20%F0%9F%87%B8%F0%9F%87%B4",
    "vless://00d09ead-4080-4c39-a75d-be7dcabe77f4@217.19.122.170:8443?flow=xtls-rprx-vision&encryption=none&security=reality&sni=bm9.hat.onl&fp=qq&pbk=Dx5aV0n9e1j_YDhVk8Z4O9HPrg1HLAuGKlmQpgERgDo&sid=8eeca41a32d1523d&type=tcp&headerType=none#%F0%9F%A4%96%20%D0%9E%D0%B1%D1%85%D0%BE%D0%B4%20%D0%B4%D0%BB%D1%8F%20%D0%BD%D0%B5%D0%B9%D1%80%D0%BE%D1%81%D0%B5%D1%82%D0%B5%D0%B9%20%E2%84%962%20%F0%9F%87%B7%F0%9F%87%BA",
    "vless://fb37d713-0ed3-4146-b085-a5c879a9aafa@81.163.22.194:443?flow=xtls-rprx-vision&encryption=none&security=reality&sni=apply.betust.net&fp=firefox&pbk=T98nmnCp0qrmkH1Oq92Tk94sCYa5RuuEjp8bDDbdVxk&sid=b20168a5&spx=%2F&type=tcp&headerType=none#%F0%9F%A4%96%20%D0%9E%D0%B1%D1%85%D0%BE%D0%B4%20%D0%B4%D0%BB%D1%8F%20%D0%BD%D0%B5%D0%B9%D1%80%D0%BE%D1%81%D0%B5%D1%82%D0%B5%D0%B9%20%E2%84%961%20%F0%9F%87%B7%F0%9F%87%BA",
    "vless://00d09ead-4080-4c39-a75d-be7dcabe77f4@217.19.122.170:8443?flow=xtls-rprx-vision&encryption=none&security=reality&sni=bm9.hat.onl&fp=qq&pbk=Dx5aV0n9e1j_YDhVk8Z4O9HPrg1HLAuGKlmQpgERgDo&sid=8eeca41a32d1523d&type=tcp&headerType=none#%F0%9F%87%B5%F0%9F%87%B1%D0%9F%D0%BE%D0%BB%D1%8C%D1%88%D0%B0",
    "vless://d16f7276-b967-440d-88b7-76945654ed55@188.225.79.22:443?encryption=none&security=reality&sni=quartzops.blog&fp=firefox&pbk=LqyEitRDFcMxFuH45Vx1551cOqrI6UHYvkKgs7gNaho&sid=e347493990237143&type=grpc&mode=gun&authority=&serviceName=grpc-baf3bc8498#%F0%9F%87%A8%F0%9F%87%AD%D0%90%D0%B2%D1%82%D0%BE%D0%BF%D0%BE%D0%B4%D0%BA%D0%BB%D1%8E%D1%87%D0%B5%D0%BD%D0%B8%D0%B5",
    "vless://255a8044-3337-473e-af26-46a37208adcc@194.55.239.86:443?flow=xtls-rprx-vision&encryption=none&security=reality&sni=piston.kachow.ink&fp=firefox&pbk=wl48cP9KpZxoAqUAePYqVmjNHO2gOzW_QCm3okkiLks&sid=87ac946b53bb52f5&type=tcp&headerType=none#%F0%9F%87%B3%F0%9F%87%B1%D0%9D%D0%B8%D0%B4%D0%B5%D1%80%D0%BB%D0%B0%D0%BD%D0%B4%D1%8B",
    "vless://73a0f995-f2f1-4d47-a99d-a6dcc1952bf9@api.weologic.pro:443?encryption=none&security=tls&sni=api.weologic.pro&alpn=http%2F1.1&fp=firefox&type=ws&path=%2Fapi%2Fv2%2Fquery%2Fzpxgr1pf%2F&headers=%7B%0A%20%20%22Host%22%3A%20%22%22%0A%7D#%F0%9F%87%A9%F0%9F%87%AA%20%D0%93%D0%B5%D1%80%D0%BC%D0%B0%D0%BD%D0%B8%D1%8F%201",
    "vless://73a0f995-f2f1-4d47-a99d-a6dcc1952bf9@telemetry.gitpacket.pro:443?encryption=none&security=tls&sni=telemetry.gitpacket.pro&alpn=http%2F1.1&fp=firefox&type=ws&path=%2Fapi%2Fv2%2Fquery%2Fzpxgr1pf%2F&headers=%7B%0A%20%20%22Host%22%3A%20%22%22%0A%7D#%F0%9F%87%A9%F0%9F%87%AA%20%D0%93%D0%B5%D1%80%D0%BC%D0%B0%D0%BD%D0%B8%D1%8F%202",
    "vless://4054fdc2-ee80-4419-8a8e-d937df4719e2@qq.utiltools.site:443?flow=xtls-rprx-vision&encryption=none&security=reality&sni=qq.utiltools.site&fp=chrome&pbk=drY21DHNOr6ezJLA2B10mzTExeJ9-gVBfTBNLwVBtWI&type=tcp&headerType=none#%F0%9F%87%B7%F0%9F%87%BA%D0%A0%D0%BE%D1%81%D1%81%D0%B8%D1%8F",
    "vless://255a8044-3337-473e-af26-46a37208adcc@194.55.239.86:443?flow=xtls-rprx-vision&encryption=none&security=reality&sni=piston.kachow.ink&fp=firefox&pbk=wl48cP9KpZxoAqUAePYqVmjNHO2gOzW_QCm3okkiLks&sid=87ac946b53bb52f5&type=tcp&headerType=none#%F0%9F%87%AA%F0%9F%87%AA%D0%AD%D1%81%D1%82%D0%BE%D0%BD%D0%B8%D1%8F"
];

// 1. Активация подписки (выдает новый ID)
app.post('/api/admin/grant', (req, res) => {
    const { userId, durationMinutes = 1 } = req.body;
    
    if (!userId) {
        return res.status(400).json({ success: false, message: 'Не указан ID пользователя' });
    }

    const expiresAt = Date.now() + durationMinutes * 60 * 1000;

    // Сохраняем или обновляем пользователя
    if (!database[userId]) {
        database[userId] = {
            expiresAt: expiresAt,
            hiddenServers: [], // индексы скрытых серверов
            personalExpiredKey: null
        };
    } else {
        database[userId].expiresAt = expiresAt;
    }

    console.log(`[ПОКУПКА] Пользователю ${userId} выдана подписка на ${durationMinutes} мин.`);
    res.json({ success: true, message: `Подписка успешно активирована!` });
});

// 2. Проверка статуса подписки
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

// 3. Выдача подписки для happ / Hiddify
app.get('/api/sub/:userId', (req, res) => {
    const { userId } = req.params;
    const user = database[userId];

    res.set('Content-Type', 'text/plain; charset=utf-8');

    // Если активна — отдаем ключи (исключая те, что админ удалил для этого юзера)
    if (user && Date.now() <= user.expiresAt) {
        const expireSeconds = Math.floor(user.expiresAt / 1000);
        const headers = [
            `#profile-update-interval: 1`,
            `#profile-title: 🏳️ Florezok Белые списки`,
            `#profile-web-page-url: https://t.me/pwrvod`,
            `#support-url: https://t.me/pwrvod`,
            `#announce: 🌟 Florezok VPN 🚀 Спонсор @pwrvod • 👥 tg @Florezok🏳️ За свободный интернет!`,
            `#subscription-userinfo: upload=0; download=0; total=0; expire=${expireSeconds}`
        ];

        // Фильтруем серверы (удаляем те индексы, которые админ отключил для этого пользователя)
        const activeKeys = defaultVlessKeys.filter((_, index) => !user.hiddenServers.includes(index));

        const fullSubscription = headers.join('\n') + '\n\n' + activeKeys.join('\n\n');
        return res.send(fullSubscription);
    }

    // Если истекла — отдаем заглушку (персональную или глобальную)
    const expiredHeaders = [
        `#profile-update-interval: 1`,
        `#profile-title: ❌ Florezok (Подписка истекла)`,
        `#subscription-userinfo: upload=0; download=0; total=0; expire=0`
    ];
    
    const keyToUse = (user && user.personalExpiredKey) ? user.personalExpiredKey : globalExpiredKey;
    return res.send(expiredHeaders.join('\n') + '\n\n' + keyToUse);
});

// --- АДМИН-ПАНЕЛЬ API ---

// Проверка пароля админа
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === '123456') {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: 'Неверный логин или пароль' });
    }
});

// Получение списка активных пользователей (автоматически чистит тех, у кого время вышло)
app.get('/api/admin/users', (req, res) => {
    const now = Date.now();
    const activeUsersList = [];

    for (const [id, data] of Object.entries(database)) {
        // Если время истекло, удаляем из базы (согласно твоему требованию: "пропадает в админ панели")
        if (now > data.expiresAt) {
            delete database[id];
            continue;
        }

        activeUsersList.push({
            userId: id,
            expiresAt: data.expiresAt,
            timeLeftMinutes: Math.ceil((data.expiresAt - now) / (60 * 1000)),
            hiddenServers: data.hiddenServers,
            hasPersonalExpiredKey: !!data.personalExpiredKey
        });
    }

    res.json({ users: activeUsersList, defaultServersCount: defaultVlessKeys.length });
});

// Админ: редактировать подписку / удалить серверы / дать персональную заглушку
app.post('/api/admin/update-user', (req, res) => {
    const { userId, addMinutes, hiddenServers, personalExpiredKey } = req.body;
    const user = database[userId];

    if (!user) {
        return res.status(404).json({ success: false, message: 'Пользователь не найден или его подписка уже истекла' });
    }

    if (addMinutes) {
        user.expiresAt += parseInt(addMinutes) * 60 * 1000;
    }
    if (hiddenServers !== undefined) {
        user.hiddenServers = hiddenServers; // массив индексов
    }
    if (personalExpiredKey !== undefined) {
        user.personalExpiredKey = personalExpiredKey;
    }

    res.json({ success: true, message: 'Данные пользователя обновлены' });
});

// Админ: установить глобальную заглушку для всех
app.post('/api/admin/set-global-expired', (req, res) => {
    const { expiredKey } = req.body;
    if (expiredKey) {
        globalExpiredKey = expiredKey;
        res.json({ success: true, message: 'Глобальная заглушка успешно изменена' });
    } else {
        res.status(400).json({ success: false, message: 'Пустой ключ' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});