import https from 'https';
import fs from 'fs';
import path from 'path';

function download(url, dest) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                console.log('Redirecting to', res.headers.location);
                // Handle relative redirects just in case
                let redirectUrl = res.headers.location;
                if (!redirectUrl.startsWith('http')) {
                    const urlObj = new URL(url);
                    redirectUrl = urlObj.origin + redirectUrl;
                }
                return download(redirectUrl, dest).then(resolve).catch(reject);
            }
            if (res.statusCode !== 200) {
                return reject(new Error('Status: ' + res.statusCode));
            }
            const file = fs.createWriteStream(dest);
            res.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', err => {
            fs.unlink(dest, () => {});
            reject(err);
        });
    });
}

const dir = './public';
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
}

download("https://drive.google.com/uc?export=download&id=1BREUPr1dxzV1FTU4CI2gyNVSKcbO29am", './public/bgm.mp3')
    .then(() => console.log('Download complete'))
    .catch(console.error);
