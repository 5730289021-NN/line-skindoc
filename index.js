'use strict';

const line = require('@line/bot-sdk');
const express = require('express');
const path = require('path');
const fs = require('fs')

const config = {
    channelAccessToken: `8PE3JRk3IG2miQpsfeuorYAH7IGMC7W+N03J6/MiPUe+CtdoRcmGZEq0VJyztvHXtEER36zbFV8siIPfOrpL429qG1y0vBPmr8RYy4s6auwuw79/PRCqisR34ABI+CUxq9BSBTwSt9+8XmYGKEM8fAdB04t89/1O/w1cDnyilFU=`,
    channelSecret: `73fb1dd7087e0b9188d0bb737aa4df8d`,
};

const client = new line.Client(config);

const app = express();

app.use('/downloaded', express.static('downloaded'));

app.post('/callback', line.middleware(config), (req, res) => {

    // handle events separately
    Promise.all(req.body.events.map(handleEvent))
        .then(() => res.end())
        .catch((err) => {
            console.error(err);
            res.status(500).end();
        });
});

// callback function to handle a single event
function handleEvent(event) {
    switch (event.type) {
        case 'message':
            const message = event.message;
            switch (message.type) {
                case 'image':
                    return handleImage(message, event.replyToken);
                default:
                    throw new Error(`Unknown message: ${JSON.stringify(message)}`);
            }
        default:
            throw new Error(`Unknown event: ${JSON.stringify(event)}`);
    }
}

const replyText = (token, texts) => {
    texts = Array.isArray(texts) ? texts : [texts];
    return client.replyMessage(
        token,
        texts.map((text) => ({ type: 'text', text }))
    );
};

function handleImage(message, replyToken) {
    const downloadPath = path.join('./', 'downloaded', `${message.id}.jpg`);
    console.log(downloadPath, 'downPath')
    const previewPath = path.join('./', 'downloaded', `${message.id}-preview.jpg`);
    console.log(previewPath, 'prePath')

    return downloadContent(message.id, downloadPath)
        .then((downloadPath) => {
            let content;
            fs.readFile(downloadPath, function read(err, data) {
                if (err) {
                    throw err;
                }
                content = data;

                // Invoke the next step here however you like
                console.log(content);   // Put all of the code here (not the best solution)
                var request = require('request');
                request.post({
                    headers: {
                        'content-type': 'application/octet-stream',
                        'Prediction-Key': 'c04f847425b445f2bedc3b2a36dac65f'
                    },
                    url: 'https://southcentralus.api.cognitive.microsoft.com/customvision/v2.0/Prediction/1f32e321-220b-4dca-a709-5be05765d185/image?iterationId=f020026a-5afd-4cd1-a2e6-fe363063caad',
                    body: content
                }, function (error, response, body) {
                    body = JSON.parse(body)
                    let output = body.predictions[0]
                    console.log(output);
                    output = JSON.stringify(output)
                    output = `${body.predictions[0].tagName} ${body.predictions[0].probability*100}\n${body.predictions[1].tagName} ${body.predictions[1].probability*100} `
                    return replyText(replyToken, output);
                });          // Or put the next step in a function and invoke it
            });

        });
}

function downloadContent(messageId, downloadPath) {
    return client.getMessageContent(messageId)
        .then((stream) => new Promise((resolve, reject) => {
            const writable = fs.createWriteStream(downloadPath);
            stream.pipe(writable);
            stream.on('end', () => resolve(downloadPath));
            stream.on('error', reject);
        }));
}

// listen on port
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`listening on ${port}`);
});