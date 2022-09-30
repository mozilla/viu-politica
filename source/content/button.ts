import { EventType, RegretVideoEvent } from '../common/messages';
import { log } from './content';
import { browser } from 'webextension-polyfill-ts';
import { onModalOpen } from './modal';

enum PageLocation {
	Home,
	Explore,
	Watch,
	History,
	Other,
}

/** A set of video ids reported, lives as long as the page itself */
const videoIdsReported = new Set<string>();

let pageViewId: string | undefined;

function getPageLocation(): PageLocation {
	const { pathname } = window.location;
	switch (pathname) {
		case '/':
			return PageLocation.Home;
		case '/feed/explore':
			return PageLocation.Explore;
		case '/feed/history':
			return PageLocation.History;
		case '/watch':
			return PageLocation.Watch;
		default:
			return PageLocation.Other;
	}
}

function postMessage(message: any) {
	const messageToSend = { ...message, pageViewId };
	if (messageToSend.type === EventType.VideoBatchRecorded && messageToSend.data.length === 0) {
		return;
	}

	browser.runtime.sendMessage(messageToSend);
}

function isElementVisible(el: Element): boolean {
	return el.clientHeight > 0;
}

function generateButtonId(videoId: string) {
	return `regrets_reporter__video_${videoId}_${getPageLocation()}`;
}

/** Get currently played video id */
const getMainVideoId = () => document.getElementsByTagName('ytd-watch-flexy')[0].getAttribute('video-id');

function clearInjectedButtons() {
	const elements = document.getElementsByClassName('mrr-injected-btn');
	for (const element of Array.from(elements)) {
		element.remove();
	}
}

function injectHovers() {
	log('injecting hovers');
	const domNodes = Array.from(document.getElementsByTagName('ytd-thumbnail'));
	for (const domNode of domNodes) {
		if (isElementVisible(domNode)) {
			injectButton(
				domNode as HTMLElement,
				() => (domNode.getElementsByTagName('a') as any).thumbnail.href.split('=')[1],
			);
		}
	}
	const mainPlayer = document.getElementById('movie_player');
	if (mainPlayer && isElementVisible(mainPlayer)) {
		injectButton(mainPlayer, getMainVideoId);
	}

	const previewPlayer = document.getElementById('video-preview-container');
	const previewVideoIdThunk = () => (document.getElementById('media-container-link') as any)?.href.split('=')[1];
	if (previewPlayer && isElementVisible(previewPlayer)) {
		injectButton(previewPlayer as HTMLElement, previewVideoIdThunk);
	}
}

function injectButton(parentNode: HTMLElement, getVideoId: () => string | void) {
	const videoId = getVideoId();
	const lastChild = parentNode.lastElementChild;
	const hasInjectedButton = lastChild && lastChild.classList.contains('mrr-injected-btn');
	if (!videoId) {
		log('no video id found');
		if (hasInjectedButton) {
			lastChild.remove();
		}
		return;
	}
	const buttonId = generateButtonId(videoId);
	if (hasInjectedButton) {
		const prevButton = lastChild as HTMLDivElement;
		const skipButtonInjection = buttonId === prevButton.id;
		if (skipButtonInjection) {
			return;
		} else {
			lastChild.remove();
		}
	}
	const btn = document.createElement('div');
	btn.id = buttonId;
	btn.className = 'mrr-injected-btn';

	const label = document.createElement('span');
	label.innerText = 'VIU POLÍTICA?';

	btn.appendChild(document.createElement('div'));
	btn.appendChild(label);
	let state: 'none' | 'submitted' | 'tell-more' | 'final' = 'none';

	const onSubmitted = () => {
		btn.classList.remove('visible', 'submitted');
		btn.classList.add('tell-more');
		state = 'tell-more';
		label.innerText = 'Conte-nos mais';
	};

	btn.onclick = async function () {
		if (state === 'none') {
			label.innerText = 'Submitted';
			btn.classList.add('visible', 'submitted');
			postMessage({ type: EventType.RegretVideo, videoId, triggerOnboarding: false } as RegretVideoEvent);
			onSubmitted();
			onModalOpen(videoId);
			return;
		}
		if (state === 'submitted') {
			onSubmitted();
			return;
		}
		if (state === 'tell-more') {
			onModalOpen(videoId);
			return;
		}
	};

	parentNode.appendChild(btn);

	if (videoIdsReported.has(videoId)) {
		setButtonToFinalState(videoId, btn);
	}
}

export function setButtonToFinalState(videoId: string, node?: Element) {
	videoIdsReported.add(videoId);
	let button;
	if (!node) {
		const buttonId = generateButtonId(videoId);
		button = document.getElementById(buttonId);
	} else {
		button = node;
	}
	const sidebarContainer = document.getElementById('related');
	const isSidebarVideo = sidebarContainer && sidebarContainer.contains(button);
	button.classList.remove('tell-more');
	button.classList.add('final');
	(button.children[1] as HTMLElement).innerText = isSidebarVideo ? 'Obrigado!' : 'Obrigado por marcar este vídeo';
	button.onclick = undefined;
}

export function injectElements(pvid: string) {
	pageViewId = pvid;
	const pageLocation = getPageLocation();
	const enabled = pageLocation === PageLocation.Watch || pageLocation === PageLocation.Home;

	if (!enabled) {
		clearInjectedButtons();
		return;
	}
	injectHovers();
}
