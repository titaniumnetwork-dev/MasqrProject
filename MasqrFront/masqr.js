LICENSE_SERVER_URL = "https://license.mercurywork.shop/validate?license=";
async function checkLicense(pass) {
    if (localStorage["LICENSE_CHECK"]) {
        return true;
    }
    licenseCheck = (await (await fetch(LICENSE_SERVER_URL + pass + "&host=" + location.origin)).json())["status"];
    if (licenseCheck == "License valid") {
        localStorage["LICENSE_CHECK"] = true;
        return true;
    }
    return false;
}