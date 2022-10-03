const fs = require('fs');

const filePath = process.argv[2];
const manifestVersion = process.argv[3];

const content = fs.readFileSync(filePath);
const json = JSON.parse(content);

/** @type {Array.<string>} */
const webResources = json['web_accessible_resources'];

// Make font files web accessible
webResources.push('*.woff', '*.woff2');

const htmlFilePathRegex = /.*html/gm;

// Remove HTML files from web accessible resources
json['web_accessible_resources'] = webResources.filter((r) => !r.match(htmlFilePathRegex));

const hostPermissions = ['*://*.youtube.com/*', 'https://incoming.telemetry.mozilla.org/*'];

if (manifestVersion === 'v3') {
	json.manifest_version = 3;
	json.host_permissions = hostPermissions;
	json.background.service_worker = json.background.scripts[0];
	delete json.background.scripts;
	json.background.type = 'module';
	json.action = json.browser_action;
	delete json.browser_action;
	json.web_accessible_resources = [
		{
			resources: json.web_accessible_resources,
			matches: ['*://*.youtube.com/*'],
			extensionIds: ['*'],
		},
	];
} else {
	json['permissions'].push(...hostPermissions);
}

fs.writeFileSync(filePath, JSON.stringify(json, null, 2));
