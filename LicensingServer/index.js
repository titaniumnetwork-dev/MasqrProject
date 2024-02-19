import http from "node:http";
import { randomUUID } from "node:crypto";
import connect from "connect";
import cors from "cors";
import "dotenv/config";

/**
 * @type {string[]}
 */
const keys = JSON.parse(process.env.PSK);

/**
 * @type {Map<string, { host: string, expires: number }>}
 */
const activeLicences = new Map();

const app = connect();

app.use(cors({
	origin: process.env.ORIGIN
}));

app.use("/newLicense", (req, res) => {
	const params = new URL(req.url, "http://localhost/").searchParams;
    if (!keys.includes(req.headers.psk)) 
        return throwError(res, "Invalid PSK; Cannot assign licenses")
    // Define default variables and throw errors for no hostname
    const assignedKey = params.get("assignedLicense") || randomUUID().substring(0,6);
    const proxyHost = params.get("host")
    const expireTime = params.get("expires") || Date.now() + (3 * 24 * 60 * 60 * 1000);
    if (!proxyHost)
        return throwError(res, "No host defined in URL");
    
    // License assignment
    activeLicences.set(assignedKey, { host: proxyHost, expires: expireTime });

    // Success
    res.statusCode = 200;
	res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ assignedLicense: assignedKey, expires: expireTime }));
})

app.use("/validate", (req, res) => {
	const params = new URL(req.url, "http://localhost/").searchParams;
    if (!activeLicences.get(params.get("license")))
		return throwError(res, "Invalid License", 403);

    if (activeLicences.get(params.get("license")).expires < Date.now()) {
		activeLicences.delete(params.get("license"));
		return throwError(res, "Expired License", 403);
    }
    if (activeLicences.get(params.get("license")).host != params.get("host"))
		return throwError(res, "License for incorrect product", 403);

    res.statusCode = 200;
	res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ status: "License valid" }));
    activeLicences.delete(params.get("license"));
})

/**
 * @description House keeping task to clean up licenses that have been invalid for 7 or more days; this only really runs once per day
 */
async function cleanupLicenses() {
    for (const license in activeLicences.keys()) {
        if (activeLicences.get(license).expires < (Date.now() - (7 * 24 * 60 * 60 * 1000))) {
            activeLicences.delete(license);
        }
    } 
}

/**
 * @description Error handler
 * @param {http.ServerResponse} res 
 * @param {string} error
 * @param {number | undefined} statusCode
 */
function throwError(res, error, statusCode = 500) {
    res.statusCode = statusCode;
	res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: error }));
}

/**
 * @description Entrypoint and URL router
 */
const server = http.createServer();

server.on("request", app);
server.on("listening", () => {
	const addr = server.address();
	console.log(`Server running on port ${addr.port}`)
})

server.listen({ port: 8004 });

// Run cleanupLicenses once per day to prevent a memory leak
setInterval(cleanupLicenses, 24 * 60 * 60 * 1000);