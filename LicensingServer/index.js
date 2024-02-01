import http from 'http';
import crypto from 'node:crypto';
import { configDotenv } from 'dotenv';
configDotenv();

/**
 * @type {string[]}
 */
const keys = JSON.parse(process.env.PSK);

const activeLicences = new Map();

/**
 * @description Route for /newLicense which handles ID generation
 * @param {http.IncomingMessage} req 
 * @param {http.ServerResponse} res 
 */
async function genID(req, res) {
    const params = new URL(req.url, "http://localhost/").searchParams;
    if (!keys.includes(req.headers.psk)) 
        return throwError(res, "Invalid PSK; Cannot assign licenses");

    // Define default variables and throw errors for no hostname
    const assignedKey = params.get("assignedLicense") || crypto.randomUUID().substring(0,6);
    const proxyHost = params.get("host")
    const expireTime = params.get("expires") || Date.now() + (3 * 24 * 60 * 60 * 1000);
    if (!proxyHost)
        return throwError(res, "No host defined in URL")
    

    // License assignment
    activeLicences.set(assignedKey, {host: proxyHost, expires: expireTime});

    // Success
    res.statusCode = 200;
    res.end(JSON.stringify({assignedLicense: assignedKey, expires: expireTime}))
}

/**
 * @description House keeping task to clean up licenses that have been invalid for 7 or more days; this only really runs once per day
 */
async function cleanupLicenses() {
    for (const license in activeLicences.keys()) {
        if (activeLicences.get(license).expires < (Date.now() + (7 * 24 * 60 * 60 * 1000))) {
            activeLicences.delete(license);
        }
    } 
}

/**
 * @description Route for /validate which handles License validation
 * @param {http.IncomingMessage} req 
 * @param {http.ServerResponse} res 
 */
async function validateID(req, res) {
    const params = new URL(req.url, "http://localhost/").searchParams;
    if (!activeLicences.get(params.get("license"))) {
        res.statusCode = 403;
        res.end(JSON.stringify({error: "Invalid License"}));
        return;
    }
    if (activeLicences.get(params.get("license")).expires < Date.now()) {
        delete activeLicences[params.get("license")];
        res.statusCode = 403;
        res.end(JSON.stringify({error: "Expired License"}));
        return;
    }
    if (activeLicences.get(params.get("license")).host != params.get("host")) {
        res.statusCode = 403;
        res.end(JSON.stringify({error: "License for incorrect product"}));
        return;
    }
    res.statusCode = 200;
    res.end(JSON.stringify({status: "License valid"}));
    activeLicences.delete(params.get("license"));
}

/**
 * @description Error handler
 * @param {http.ServerResponse} res 
 * @param {string} error
 */
function throwError(res, error) {
    res.statusCode = 500;
    res.end(JSON.stringify({error: error}));
}

/**
 * @description Entrypoint and URL router
 */
http.createServer(function (req, res) {
    
    if (req.url?.startsWith("/newLicense"))
        return genID(req, res).catch();
    if (req.url?.startsWith("/validate"))
        return validateID(req, res).catch();

    res.statusCode = 404
    res.end(JSON.stringify({error: "Invalid route"}))

}).listen(8004);

// Run cleanupLicenses once per day to prevent a memory leak
setInterval(cleanupLicenses, 24 * 60 * 60 * 1000);
