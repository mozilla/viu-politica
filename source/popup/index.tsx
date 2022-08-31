import * as React from 'react';
import '../common/tailwind.css';
import { experimentGroupsUrl, onboardingUrl } from '../common/links';
import { installReason } from '../common/common';
import { localStorageKeys, useExtensionState } from '../common/storage';
export function Main() {
	const installReasonValue = installReason.use();
	const [onboardingCompleted] = useExtensionState(localStorageKeys.onboardingCompleted, false);

	if (!onboardingCompleted) {
		if (installReasonValue === 'install') {
			return (
				<div className="m-3 text-sm">
					<div className="font-bold mb-2">
						RegretsReporter is active, but you haven't indicated whether you'd like to participate in our research.
					</div>
					Please{' '}
					<a href={onboardingUrl} target="_blank" className="underline text-red-70" rel="noreferrer">
						click here
					</a>{' '}
					to let us know if you'd like to contribute to Mozilla's crowdsourced research into YouTube's algorithms.
				</div>
			);
		}
		return (
			<div className="m-3 text-sm">
				<div className="font-bold mb-2">A new version of RegretsReporter is active.</div>
				Please{' '}
				<a href={onboardingUrl} target="_blank" className="underline text-red-70" rel="noreferrer">
					click here
				</a>{' '}
				for information about new features and to opt-in to our crowdsourced research.
			</div>
		);
	} else {
		return (
			<div className="m-3 text-sm">
				<div className="font-bold mb-2">RegretsReporter is active.</div>
				RegretsReporter helps you take control of your YouTube recommendations and, if you've opted in, contribute to
				Mozilla’s crowdsourced research into YouTube's algorithms.
				<br />
				<br />
				Learn more about our research and frequently asked questions about RegretsReporter{' '}
				<a href={experimentGroupsUrl} target="_blank" rel="noreferrer" className="underline text-red-70">
					here
				</a>
				.
				<br />
				<br />
				Learn more about how to use RegretsReporter{' '}
				<a href={`${onboardingUrl}#active-user`} target="_blank" rel="noreferrer" className="underline text-red-70">
					here
				</a>
				.
			</div>
		);
	}
}
