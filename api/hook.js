module.exports = async (req, res) => {
    const { phone } = req.query;
    if (!phone) return res.status(200).send("No phone data");

    const token = process.env.METRIKA_TOKEN;
    const counter_id = process.env.COUNTER_ID;
    const target_name = process.env.TARGET_NAME;

    let cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length === 11 && cleanPhone.startsWith('8')) {
        cleanPhone = '7' + cleanPhone.slice(1);
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const csvData = `Phone,Target,DateTime\n${cleanPhone},${target_name},${timestamp}`;

    const url = `https://yandex.net{counter_id}/offline_conversions/upload`;
    const boundary = "----VercelBoundary" + Math.random().toString(36).substring(2);

    const postData = `--${boundary}\r\n` +
                     `Content-Disposition: form-data; name="file"; filename="call.csv"\r\n` +
                     `Content-Type: text/csv\r\n\r\n` +
                     `${csvData}\r\n` +
                     `--${boundary}--\r\n`;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `OAuth ${token}`,
                "Content-Type": `multipart/form-data; boundary=${boundary}`
            },
            body: postData
        });
        await response.json();
        return res.status(200).send("OK");
    } catch (e) {
        return res.status(500).send("Error");
    }
};
