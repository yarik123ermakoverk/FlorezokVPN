const express = require('express');
const cors = require('cors');

const app = express();

app.use(express.json());
app.use(cors());

// --- НАСТРОЙКИ ЮKASSA ---
const YOOKASSA_SHOP_ID = '1519153'; 
const YOOKASSA_SECRET_KEY = 'Live_5uXug7x_gmbn-wWBRnzYhGviCtLZRs8mzOfHWOQL5f8'; 

// База данных пользователей (ключ — ник в Telegram)
const database = {};

let globalExpiredKey = "vless://00000000-0000-0000-0000-000000000000@expired.florezok.net:443?encryption=none&type=tcp#%E2%9D%8C%20%D0%A2%D0%90%D0%A0%D0%98%D0%A4%20%D0%97%D0%90%D0%9A%D0%9E%D0%9D%D0%A7%D0%98%D0%9B%D0%A1%D0%AF%20%E2%80%A2%20%D0%9F%D0%A0%D0%9E%D0%94%D0%9B%D0%98%D0%A2%D0%AC%20%D0%9D%D0%90%20%D0%A1%D0%90%D0%99%D0%A2%D0%95";

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

// Создание платежа
app.post('/api/create-payment', async (req, res) => {
    try {
        const { userId, durationMinutes, amount, description } = req.body;

        if (!userId || !durationMinutes || !amount) {
            return res.status(400).json({ success: false, message: 'Неверные данные' });
        }

        const cleanTg = userId.replace('@', '').trim();
        const idempotenceKey = 'idempotence_' + Math.random().toString(36).substring(2, 15);
        const authHeader = 'Basic ' + Buffer.from(`${YOOKASSA_SHOP_ID}:${YOOKASSA_SECRET_KEY}`).toString('base64');

        const response = await fetch('https://api.yookassa.ru/v3/payments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Idempotence-Key': idempotenceKey,
                'Authorization': authHeader
            },
            body: JSON.stringify({
                amount: {
                    value: Number(amount).toFixed(2),
                    currency: 'RUB'
                },
                confirmation: {
                    type: 'redirect',
                    return_url: 'https://florezokvpn.samp.date/' 
                },
                capture: true,
                description: description || `Подписка FlorezokVPN (@${cleanTg})`,
                metadata: {
                    userId: cleanTg,
                    durationMinutes: durationMinutes
                }
            })
        });

        const payment = await response.json();

        if (payment && payment.confirmation && payment.confirmation.confirmation_url) {
            res.json({ success: true, confirmationUrl: payment.confirmation.confirmation_url });
        } else {
            console.error("Ошибка ЮKassa:", payment);
            res.status(400).json({ success: false, message: 'Ошибка ответа ЮKassa', error: payment });
        }
    } catch (e) {
        console.error("Ошибка платежного шлюза:", e);
        res.status(500).json({ success: false, message: 'Ошибка платежного шлюза' });
    }
});

// Вебхук оплаты
app.post('/api/yookassa-webhook', async (req, res) => {
    try {
        const event = req.body;

        if (event.event === 'payment.succeeded') {
            const paymentObject = event.object;
            const metadata = paymentObject.metadata;

            if (metadata && metadata.userId && metadata.durationMinutes) {
                const tgUser = metadata.userId.replace('@', '').trim();
                const durationMinutes = parseInt(metadata.durationMinutes);
                
                if (!database[tgUser]) {
                    database[tgUser] = {
                        expiresAt: Date.now(),
                        hiddenServers: [],
                        personalExpiredKey: null
                    };
                }
                const baseTime = database[tgUser].expiresAt > Date.now() ? database[tgUser].expiresAt : Date.now();
                database[tgUser].expiresAt = baseTime + durationMinutes * 60 * 1000;

                console.log(`[ОПЛАТА УСПЕШНА] @${tgUser} выдано ${durationMinutes} минут.`);
            }
        }

        res.status(200).send('OK');
    } catch (e) {
        console.error("Ошибка вебхука:", e);
        res.status(500).send('Error');
    }
});

// Проверка статуса
app.get('/api/status/:userId', (req, res) => {
    const tgUser = req.params.userId.replace('@', '').trim();
    const user = database[tgUser];

    if (!user || Date.now() > user.expiresAt) {
        return res.json({ active: false, timeLeftMs: 0 });
    }

    res.json({
        active: true,
        timeLeftMs: user.expiresAt - Date.now()
    });
});

// Генерация VLESS подписки
app.get('/api/sub/:userId', (req, res) => {
    const tgUser = req.params.userId.replace('@', '').trim();
    const user = database[tgUser];

    res.set('Content-Type', 'text/plain; charset=utf-8');

    if (user && Date.now() <= user.expiresAt) {
        const expireSeconds = Math.floor(user.expiresAt / 1000);
        const headers = [
            `#profile-update-interval: 1`,
            `#profile-title: 🏳️ Florezok (@${tgUser})`,
            `#profile-web-page-url: https://t.me/pwrvod`,
            `#support-url: https://t.me/pwrvod`,
            `#announce: 🌟 Florezok VPN 🚀 Спонсор @pwrvod • 👥 tg @Florezok🏳️`,
            `#subscription-userinfo: upload=0; download=0; total=0; expire=${expireSeconds}`
        ];

        const activeKeys = defaultVlessKeys.filter((_, index) => !user.hiddenServers.includes(index));
        return res.send(headers.join('\n') + '\n\n' + activeKeys.join('\n\n'));
    }

    const expiredHeaders = [
        `#profile-update-interval: 1`,
        `#profile-title: ❌ Florezok (Подписка истекла)`,
        `#subscription-userinfo: upload=0; download=0; total=0; expire=0`
    ];
    
    const keyToUse = (user && user.personalExpiredKey) ? user.personalExpiredKey : globalExpiredKey;
    return res.send(expiredHeaders.join('\n') + '\n\n' + keyToUse);
});

// Админка
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === '123456') {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false });
    }
});

app.get('/api/admin/users', (req, res) => {
    const now = Date.now();
    const activeUsersList = [];

    for (const [id, data] of Object.entries(database)) {
        if (now > data.expiresAt) {
            delete database[id];
            continue;
        }

        activeUsersList.push({
            userId: id,
            timeLeftMinutes: Math.ceil((data.expiresAt - now) / (60 * 1000)),
            hiddenServers: data.hiddenServers
        });
    }

    res.json({ users: activeUsersList, defaultServersCount: defaultVlessKeys.length });
});

// Создание / продление подписки из админки
app.post('/api/admin/update-user', (req, res) => {
    const { userId, addMinutes, expireNow } = req.body;
    const tgUser = userId ? userId.replace('@', '').trim() : null;
    
    if (!tgUser) return res.status(400).json({ success: false, message: 'Не указан юзер' });

    if (!database[tgUser]) {
        database[tgUser] = {
            expiresAt: Date.now(),
            hiddenServers: [],
            personalExpiredKey: null
        };
    }

    const user = database[tgUser];

    if (expireNow) {
        user.expiresAt = 0;
    } else if (addMinutes) {
        const baseTime = user.expiresAt > Date.now() ? user.expiresAt : Date.now();
        user.expiresAt = baseTime + parseInt(addMinutes) * 60 * 1000;
    }

    res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});
