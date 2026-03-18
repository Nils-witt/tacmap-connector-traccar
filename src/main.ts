import main = require("dotenv");

const unitsMapping: { [key: string]: string } = {};

main.config();

const mapAuthToken = process.env.API_TOKEN || '';
const traccarToken = process.env.TRACCAR_TOKEN || '';
const traccarUrl = process.env.TRACCAR_URL || '';
const apiUrl = process.env.API_URL || '';

for (const key in process.env) {
    if (key.startsWith("UNIT_")) {
        console.log(`Mapping device ${key} to unit ID ${process.env[key]}`);
        const deviceId = key.split("_")[1] || '';
        unitsMapping[deviceId] = process.env[key] || '';
    }
}

(async () => {
    const res = await fetch(`https://${traccarUrl}/api/session?token=${traccarToken}`)
    let authCookie = '';
    res.headers.getSetCookie()?.forEach(cookie => {
        authCookie = cookie.split(";")[0] || '';
    });

    console.log("Authentication cookie:", authCookie);

    const wsOptions: WebSocketInit = {
        headers: {
            "Cookie": authCookie
        }
    };

    const ws = new WebSocket(`wss://${traccarUrl}/api/socket`, wsOptions);
    ws.onopen = () => {
        console.log("WebSocket connection opened");
    };
    ws.onmessage = (event) => {
        processMessage(event.data);
    };
    ws.onerror = (error) => {
        console.error("WebSocket error:", error);
    };

    ws.onclose = () => {
        console.log("WebSocket connection closed");
    };

})();

async function sendToApi(unitId: string, latitude: number, longitude: number, altitude: number, accuracy: number) {

    const callUrl = `${apiUrl}/units/${unitId}`;
    const options = {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${mapAuthToken}`
        },
        body: JSON.stringify({
            position: {
                latitude: latitude,
                longitude: longitude,
                altitude: altitude,
                accuracy: accuracy,
                timestamp: new Date().toISOString()
            }
        })
    };

    const res = await fetch(callUrl, options)
    console.log(`Sent data to API for unit ${unitId}, response status: ${res.status}`);
}

function processMessage(data: string) {
    const message = JSON.parse(data);

    if (message.hasOwnProperty("positions")) {
        const position = message.positions;
        console.log(`Received positions: `);
        for (const pos of position) {
            console.log(`Device ID: ${pos.deviceId}, Latitude: ${pos.latitude}, Longitude: ${pos.longitude}, Time: ${pos.fixTime}`);
            if(unitsMapping[pos.deviceId]) {
                sendToApi(unitsMapping[pos.deviceId]!, pos.latitude, pos.longitude, pos.altitude, pos.accuracy);
            }
        }
    }

}