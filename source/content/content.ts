import { browser } from 'webextension-polyfill-ts';
import { EventType, Message, PagePingEvent } from '../common/messages';
import { get } from 'object-path';

import * as ReactDOM from 'react-dom';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import pageScript from 'bundle-text:./page.ts';
import { Modal } from './modal';
import * as React from 'react';
import { injectElements } from './button';

const loggingOn = process.env.ENABLE_CONTENT_LOGS === 'true';

export function log(...args) {
	if (loggingOn) {
		console.log('[content]', ...args);
	}
}

let ytApiKey = null;
let ytRequestHeaders = null;

const pollingInterval = 2000;

/** Injects page.ts as a script into the YT page DOM. Needed to allow direct DOM access. */
async function injectScript() {
	const scr = document.createElement('script');
	scr.textContent = `(function () {
		function define(m) {
				console.log("[page loader] page module defined");
				// run default export
				if (typeof m === 'function') {
					const module = m();
					module.default();
				}
		}
		define.amd = true;
		${pageScript}
	})();`;

	(document.head || document.documentElement).appendChild(scr);

	setInterval(async () => {
		const event: PagePingEvent = {
			type: 'ping',
		};

		injectElements();

		/** Send pings to injected script to parse page videos and inject buttons */
		window.postMessage(event, window.location.origin);
	}, pollingInterval);
}

/** Handles messages from injected page and forwards them to background page */
const onPageMessage = (event: MessageEvent) => {
	const allowedMessageTypes = [EventType.VideoViewed, EventType.VideoBatchRecorded];
	const isAllowedMessage = allowedMessageTypes.includes(event.data.type as EventType);
	const isSameOrigin = event.origin === window.location.origin;
	if (!isSameOrigin || !isAllowedMessage) {
		return;
	}
	log('got page message, data:', event.data);
	const message = event.data as Message;

	if (message.type === EventType.VideoBatchRecorded && message.data.length === 0) {
		return;
	}

	browser.runtime.sendMessage(message);
};

/** Handle message from background script */
browser.runtime.onMessage.addListener(async (message: Message) => {
	log('got runtime message:', message);
	if (message.type === EventType.AuthRecorded) {
		log(`auth ${message.keyId}`);
		ytApiKey = message.keyId;
		ytRequestHeaders = message.headers;
	}
});

function appendFeedbackModal() {
	const div = document.createElement('div');
	document.body.append(div);

	ReactDOM.render(React.createElement(Modal), div);
}

/** Initialization */
injectScript();
window.addEventListener('message', onPageMessage);
appendFeedbackModal();

// We inject styles manually because of an open bug in chrome.
// This bug preventing style imports from properly resolving in CSS files injected using manifest.json
function injectStyles(url) {
	const elem = document.createElement('link');
	elem.rel = 'stylesheet';
	elem.setAttribute('href', url);
	document.body.appendChild(elem);
}
injectStyles(browser.runtime.getURL('content/content.css'));
