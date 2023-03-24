const fs = require('fs');

const filePath = process.argv[2];
const manifestVersion = process.argv[3];

const content = fs.readFileSync(filePath);
const json = JSON.parse(content);

// Remove HTML files from web accessible resources
if (manifestVersion === 'v3') {
	json.manifest_version = 3;
	json.action = json.browser_action;
	delete json.browser_action;
}

fs.writeFileSync(filePath, JSON.stringify(json, null, 2));
