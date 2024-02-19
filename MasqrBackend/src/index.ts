/*
* Masqr Project - Backend validator
*/

import type {
	IncomingMessage,
	ServerResponse,
	RequestListener
} from "node:http"
import cookie from "cookie";
import { Buffer } from "node:buffer";

/**
 * Merge object b with object a.
 *
 *     var a = { foo: 'bar' }
 *       , b = { bar: 'baz' };
 *
 *     merge(a, b);
 *     // => { foo: 'bar', bar: 'baz' }
 */
function merge<T>(a: T, b: T) : T{
	if (a && b) {
	  for (var key in b) {
		a[key] = b[key];
	  }
	}
	return a;
};

function MasqFail(req: IncomingMessage, res: ServerResponse) {
	res.end("fail!!!");
}

async function checkLicense(serverUrl: string, host: string, license: string) : Promise<boolean> {
	const url = `${new URL("/validate?", serverUrl)}${new URLSearchParams({ license, host })}`;
	const res = await fetch(url);
	const json = await res.json();
	return json.status === "License valid";
}

interface MasqrConfig {
	/**
	 * Add any public domains you have here
	 */
	whiteListedDomains?: string[]
	/**
	 * Congratulations! Masqr failed to validate, this is either your first visit or you're a FRAUD
	 */
	fail: RequestListener,
	licenseServerUrl?: string
}

export default function masqr(config: MasqrConfig) {
	const { whiteListedDomains, fail, licenseServerUrl } = merge<MasqrConfig>({ fail: MasqFail, licenseServerUrl: "https://license.mercurywork.shop" }, config);
	return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
		if(
			!req.headers.host || !req.url
		) {
			fail(req, res);
			return;
		}
		const cookies = cookie.parse(req.headers.cookie || "");
		if (whiteListedDomains?.includes(req.headers.host)) return next();

		if (cookies["authcheck"]) return next();
	
		if (cookies["refreshcheck"] != "true") {
			res.setHeader("Set-Cookie", cookie.serialize("refreshcheck", "true", { maxAge: 10 * 1000 })); // 10s refresh check
			fail(req, res);
			return;
		}

		const authheader = req.headers.authorization;
		
		if (!authheader) {
			res.writeHead(401, {
				"WWW-Authenticate": "Basic" // Yeah so we need to do this to get the auth params, kinda annoying and just showing a login prompt gives it away so its behind a 10s refresh check
			});
			fail(req, res);
			return;
		}
	 
		const [user, pass] = Buffer.from(authheader.split(" ")[1], "base64").toString().split(":");
		
		const licenseValid = await checkLicense(licenseServerUrl!, req.headers.host, pass);
		console.log(licenseValid);
		if (licenseValid) {
			res.writeHead(200, {
				"Set-Cookie": cookie.serialize("authcheck", "true", { expires: new Date((Date.now()) + (365 * 24 * 60 * 60 * 1000)) }),
				"Content-Type": "text/html"
			}); // authorize session, for like a year, by then the link will be expired lol
			res.end(`<script>window.location.href=window.location.href</script>`) // fun hack to make the browser refresh and remove the auth params from the URL
			return;
		} else fail(req, res);
	}
}