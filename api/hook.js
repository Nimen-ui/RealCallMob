const https = require('https');

module.exports = async (req, res) => {
    const { phone } = req.query;
    if (!phone) return res.status(200).send("No phone data");

    const token = process.env.METRIKA_TOKEN ? process.env.METRIKA_TOKEN.trim() : '';
    const counter_id = process.env.COUNTER_ID ? process.env.COUNTER_ID.trim() : '';
    const target_name = process.env.TARGET_NAME ? process.env.TARGET_NAME.trim() : '';

    if (!token || !counter_id || !target_name) {
        return res.status(200).send("Error: Missing env variables in Vercel settings");
    }

    // Очистка номера телефона
    let cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length === 11 && cleanPhone.startsWith('8')) {
        cleanPhone = '7' + cleanPhone.slice(1);
    }

    const timestamp = Math.floor(Date.now() / 1000);
    // Важно: Яндекс требует точные имена колонок: UserId, Target, DateTime
    const csvData = `UserId,Target,DateTime\n${cleanPhone},${target_name},${timestamp}`;

    const boundary = "----VercelBoundary" + Math.random().toString(36).substring(2);
    const postData = `--${boundary}\r\n` +
                     `Content-Disposition: form-data; name="file"; filename="calls.csv"\r\n` +
                     `Content-Type: text/csv\r\n\r\n` +
                     `${csvData}\r\n` +
                     `--${boundary}--\r\n`;

    const options = {
        hostname: 'api-metrika.yandex.net',
        path: `/management/v1/counter/${counter_id}/offline_conversions/upload`,
        method: 'POST',
        headers: {
            'Authorization': `OAuth ${token}`,
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    return new Promise((resolve) => {
        const yandexReq = https.request(options, (yandexRes) => {
            let body = '';
            yandexRes.on('data', (chunk) => { body += chunk; });
            yandexRes.on('end', () => {
                if (yandexRes.statusCode === 200) {
                    res.status(200).send("OK");
                } else {
                    // Если Яндекс вернул ошибку, выводим её статус
                    res.status(200).send(`Error: Yandex returned status ${yandexRes.statusCode}. Response: ${body}`);
                }
                resolve();
            });
        });

        yandexReq.on('error', (e) => {
            res.status(200).send("Error: Request failed. " + e.message);
            resolve();
        });

        yandexReq.write(postData);
        yandexReq.end();
    });
};
