import { browser, Runtime } from 'webextension-polyfill-ts';
import { v4 as uuid } from 'uuid';
import { localStorageKeys, StorageValue } from './storage';
import { useEffect, useState } from 'react';
import OnInstalledReason = Runtime.OnInstalledReason;

export enum FeedbackUiVariant {
	/** Feedback UX variant with an intermediate "Tell us more" step */
	TellUsMore = 'tell_use_more_variant',
	/** Feedback UX variant showing a modal immediately on regret click */
	ForcedModal = 'forced_modal_variant',
}

/** User experiment arm */
export enum ExperimentArm {
	DislikeAction = 'dislike',
	NotInterestedAction = 'not_interested',
	NoRecommendAction = 'dont_recommend',
	RemoveFromHistory = 'remove_from_history',
	/** Control-with-UX (shows the button but it doesn’t do anything) */
	NoAction = 'control_with_ux',
	/** UX-control (doesn’t show the button, data collection enabled) */
	NoInject = 'ux_control',
	/** Opt-out (shows the button, sending dislikes on click, disables data collection).
	 * Important: value must always come last in this enum! */
	OptOut = 'opt_out',
}

function getRandomInt(min: number, max: number) {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

export const installationId = new StorageValue<string>(localStorageKeys.installationId, uuid);

new StorageValue<ExperimentArm>(localStorageKeys.experimentArm, () => {
	const arms = Object.values(ExperimentArm);
	// Get random experiment arm, omitting the last arm (the opt-out arm)
	const armIndex = getRandomInt(0, arms.length - 2);
	const armCode = arms[armIndex];
	return armCode as ExperimentArm;
});

/** Last extension installation trigger: install, update or browser_update */
export const installReason = new StorageValue<OnInstalledReason>(localStorageKeys.installedAsUpdate, () => 'install');

export const errorReportingEnabled = new StorageValue<boolean>(localStorageKeys.errorReportingEnabled, () => false);

/** Set of all unique video ids played */
export const videosPlayedSet = new StorageValue<Record<string, true>>(localStorageKeys.videosPlayedSet, () => ({}));

export function useErrorReportingToggle(): [boolean, (v: boolean) => void] {
	const enabled = errorReportingEnabled.use();
	const [toggleOn, setToggleOn] = useState(false);
	useEffect(() => setToggleOn(!!enabled), [enabled]);
	return [toggleOn, setToggleOn];
}
