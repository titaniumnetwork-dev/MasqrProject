# The MASQR project

This repository contains the backend for Masqr, and two example clients, using Express middleware and just browser side JS.

## What is MASQR?

Think of Masqr as a "anti link leaking" authentication system that allows you to use your proxy bot domain only on one device to prevent filters from grabbing on and to help developers not spend so much money on buying hundreds of domains just for them to be blocked because of link leakers.

## How can deploy this?

This is fairly easy to deploy to your backend using `express` as seen in the `MasqrBackend` example, and you can implement this into different backends fairly similarly.

## How it works

How masqr works is really simple. When you get a link from a proxy bot of some sorts (for demonstration purposes I will be referencing Titanium Networks Proxy Bot) and you will be told to click on a link with a username and password that will create a cookie which is "your license", then when you visit the site afterwards it will check the cookie with the one in the licensing server's database to make sure it wasn't tampered with then it lets you in in!

### Credits

&copy; Mercury Workshop 2024
<br>
Licensed under the AntiSkip License
