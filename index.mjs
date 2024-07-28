import express from 'express';
import fetch from 'node-fetch';
import xlsx from 'json-as-xlsx';
import fs from 'fs';
// import path from 'path';
// import { fileURLToPath } from 'url';

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);
const app = express();

const THINGSBOARD_URL = 'https://demo.thingsboard.io'; 
const DEVICE_ID = 'a5c60e50-4469-11ef-91aa-4b5b857befbc'; 
const ACCESS_TOKEN = 'eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJqYWtldGVzdDc3QGdtYWlsLmNvbSIsInVzZXJJZCI6Ijk4ZmUyMmYwLTM1NWMtMTFlZi05MWFhLTRiNWI4NTdiZWZiYyIsInNjb3BlcyI6WyJURU5BTlRfQURNSU4iXSwic2Vzc2lvbklkIjoiNmVmZGIwMWYtNWQzOS00MTU1LWEwMTMtZmZkMWRkY2ZiZDlkIiwiZXhwIjoxNzIzNzk0MTczLCJpc3MiOiJ0aGluZ3Nib2FyZC5pbyIsImlhdCI6MTcyMTk5NDE3MywiZmlyc3ROYW1lIjoiSmFrZSIsImxhc3ROYW1lIjoiIiwiZW5hYmxlZCI6dHJ1ZSwicHJpdmFjeVBvbGljeUFjY2VwdGVkIjp0cnVlLCJpc1B1YmxpYyI6ZmFsc2UsInRlbmFudElkIjoiOTc5OWQ4MDAtMzU1Yy0xMWVmLTkxYWEtNGI1Yjg1N2JlZmJjIiwiY3VzdG9tZXJJZCI6IjEzODE0MDAwLTFkZDItMTFiMi04MDgwLTgwODA4MDgwODA4MCJ9.XlF0SrRRdzZCHxF3rCZkADm-4KfieuyLq9YXnKVRrFUm-YIj8pDLxuw_dGlbO3W6y2A7MritZLi0-eMuWFyUjA'; 

app.use(express.json());
app.use(express.static('public'));

app.post('/', (req, res) => {
    const parcel = req.body.parcel;
    if (!parcel) {
        return res.status(400).send({ status: 'failed' });
    }
    console.log(parcel);
    res.status(200).json({ info: 'received' });
});

app.get('/download', async (req, res) => {
    const startTs = req.query.startTs || Date.now() - (24 * 60 * 60 * 1000 * req.query.days);
    const endTs = req.query.endTs || Date.now();
    const keys = req.query.keys || 'timeTravelled,totalDistance,temperature,humidity'; // telemetry keys

    const url = `${THINGSBOARD_URL}/api/plugins/telemetry/DEVICE/${DEVICE_ID}/values/timeseries?keys=${keys}&startTs=${startTs}&endTs=${endTs}`;

    try {
        const response = await fetch(url, {
            headers: {
                'X-Authorization': `Bearer ${ACCESS_TOKEN}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const telemetryData = {};

        // Initialize data structure
        keys.split(',').forEach(key => {
            telemetryData[key] = data[key] || [];
        });

        // Find all unique timestamps
        const timestamps = new Set();
        Object.values(telemetryData).forEach(entries => {
            entries.forEach(entry => {
                timestamps.add(entry.ts);
            });
        });

        // Create rows with all keys
        const rows = Array.from(timestamps).map(ts => {
            const formattedTs = new Date(ts).toISOString().replace('T', ' ').replace(/\..+/, '');
            const row = { ts: formattedTs };
            keys.split(',').forEach(key => {
                const entry = telemetryData[key].find(e => e.ts === ts);
                row[key] = entry ? entry.value : '';
            });
            return row;
        });

        // Sort rows by timestamp in descending order
        rows.sort((a, b) => new Date(b.ts) - new Date(a.ts));

        const columns = [
            { label: 'Timestamp', value: 'ts' },
            ...keys.split(',').map(key => ({ label: key.charAt(0).toUpperCase() + key.slice(1), value: key }))
        ];

        const dataForXlsx = [{
            sheet: 'Telemetry Data',
            columns: columns,
            content: rows
        }];

        const settings = {
            fileName: 'TelemetryData', // Name of the resulting spreadsheet
            extraLength: 10, // A bigger number means that columns will be wider
            writeMode: 'writeFile', // The available parameters are 'writeFile' and 'write'. This setting is optional.
            writeOptions: {}, // Style options from https://docs.sheetjs.com/docs/api/write-options
            RTL: false, // Display the columns from right-to-left (the default value is false)
        };

        xlsx(dataForXlsx, settings);

        const filePath = 'TelemetryData.xlsx';

        res.download(filePath, 'TelemetryData.xlsx', (err) => {
            if (err) {
                res.status(500).send('Error downloading the file');
            } else {
                fs.unlinkSync(filePath); // Delete the file after sending it
            }
        });
    } catch (error) {
        res.status(500).send(`Error: ${error.message}`);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
