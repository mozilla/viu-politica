import { browser } from 'webextension-polyfill-ts';
import { EventType, Message, PagePingEvent } from '../common/messages';
import * as ReactDOM from 'react-dom';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import pageScript from 'bundle-text:./page.ts';
import { Modal } from './modal';
import * as React from 'react';
import { injectElements } from './button';
import { v4 as uuid } from 'uuid';

const loggingOn = process.env.ENABLE_CONTENT_LOGS === 'true';

export function log(...args) {
	if (loggingOn) {
		console.log('[content]', ...args);
	}
}

let lastLocationPathname: string | null = null;

function generatePageViewId(videoId = 'null') {
	return `${videoId}-${uuid()}`;
}

let pageViewId = generatePageViewId();

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
		const urlParams = new URLSearchParams(window.location.search);
		const videoId = urlParams.get('v');
		const currentLocation = window.location.toString();
		if (currentLocation !== lastLocationPathname) {
			lastLocationPathname = currentLocation;
			pageViewId = generatePageViewId(videoId);
		}
		const event: PagePingEvent = {
			type: 'ping',
			pageViewId,
		};

		injectElements(pageViewId);

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
