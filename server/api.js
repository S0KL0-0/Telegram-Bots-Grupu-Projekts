const express = require('express');
const data = require('./data');

const port = parseInt(process.env.API_PORT, 10);
let app = null;

if (port && !isNaN(port)) {
    app = express();
    app.use(express.json());

    app.get('/api/groups', (req, res) => {
        res.json(data.getGroupsMeta());
    });

    app.get('/api/group/:name', (req, res) => {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const result = data.getGroupPage(req.params.name, page);
        if (!result) return res.status(404).json({ error: 'Group not found' });
        res.json(result);
    });

    app.get('/', (req, res) => {
        res.sendFile(__dirname + '/Test.html');
    });
} else {
    console.error('[API] API_PORT not set or invalid — API disabled');
}

module.exports = {
    start: () => {
        if (!app) return Promise.resolve();
        return new Promise(resolve => {
            app.listen(port, () => {
                console.log(`[API] Listening on :${port}`);
                resolve();
            });
        });
    },
    app,
};