import express from "express";
import 'crypto';
import fs from 'fs'
import cookieParser from "cookie-parser";

const app = express();
const port = 3001;

const failureFile = fs.readFileSync("Checkfailed.html", "utf8");

const LICENSE_SERVER_URL = "https://license.mercurywork.shop/validate?license=";

app.use(cookieParser())

app.use(async (req, res, next) => {

    if (req.url.includes("/bare/")) { // replace this with your bare endpoint
        next();
        return;
        // Bypass for UV and other bares
    }
    if (req.cookies["authcheck"]) {
        const pass = req.cookies.authcheck;
        const licenseCheck = (await (await fetch(LICENSE_SERVER_URL + pass + "&host=" + req.headers.host)).json())["status"]
        console.log(LICENSE_SERVER_URL + pass + "&host=" + req.headers.host +" returned " +licenseCheck)
        if (licenseCheck == "License valid") {
            next();
            return;
        } else {
            let err = new Error('You are not authenticated!');
            res.setHeader('WWW-Authenticate', 'Basic');
            err.status = 401;
            res.setHeader("Content-Type", "text/html"); 
            res.send(401, failureFile)
        }
    }

    const authheader = req.headers.authorization;

    if (req.cookies['refreshcheck'] != "true") {
        res.cookie("refreshcheck",  "true",  {maxAge: 10000}) // 10s refresh check
        res.setHeader("Content-Type", "text/html"); 
        res.send(failureFile);
        return;
    }
    
    if (!authheader) {
        
        let err = new Error('You are not authenticated!');
        res.setHeader('WWW-Authenticate', 'Basic');
        err.status = 401;
        res.setHeader("Content-Type", "text/html"); 
        res.send(401, failureFile)
        return;
    }
 
    const auth = new Buffer.from(authheader.split(' ')[1],
        'base64').toString().split(':');
    const user = auth[0];
    const pass = auth[1];

    const licenseCheck = (await (await fetch(LICENSE_SERVER_URL + pass + "&host=" + req.headers.host)).json())["status"]
    console.log(LICENSE_SERVER_URL + pass + "&host=" + req.headers.host +" returned " +licenseCheck)
    if (licenseCheck == "License valid") {
        res.cookie("authcheck", pass) // authorize session
        next();
        return;
    }
    res.setHeader("Content-Type", "text/html"); 
    res.send(failureFile);
})

app.use(express.static('public/'));

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
