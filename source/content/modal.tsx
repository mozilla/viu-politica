import * as React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { EventType, Message, RegretDetailsSubmittedEvent } from '../common/messages';
import { abuseReportingPlatformUrl, extensionFeedbackUrl, faqPageUrl } from '../common/links';
import { setButtonToFinalState } from './button';
import { browser } from 'webextension-polyfill-ts';

export let onModalOpen: null | ((videoId: string) => void) = null;
const subscribeToModalOpenEvent = (fn: (videoId: string) => void) => {
	onModalOpen = fn;
};

function useModalState() {
	const [isSubmitted, updateSubmitted] = useState(false);
	const [videoId, updateVideoId] = useState<string | null>(null);
	const [feedbackText, setFeedbackText] = useState<string>('');
	const submit = useCallback(() => {
		const message: RegretDetailsSubmittedEvent = { type: EventType.RegretDetailsSubmitted, videoId, feedbackText };
		browser.runtime.sendMessage(message);
		setButtonToFinalState(videoId);
		updateSubmitted(true);
		setFeedbackText('');
	}, [videoId, feedbackText]);
	return {
		isSubmitted,
		updateSubmitted,
		videoId,
		updateVideoId,
		feedbackText,
		setFeedbackText,
		submit,
	};
}

export function Modal() {
	const [isVisible, updateVisible] = useState(false);
	const { isSubmitted, updateSubmitted, videoId, updateVideoId, feedbackText, setFeedbackText, submit } =
		useModalState();

	const feedbackTextEmpty = feedbackText.length === 0;

	const close = useCallback(() => {
		updateVisible(false);
		updateSubmitted(false);
	}, [videoId]);

	useEffect(() => {
		async function handler(videoId: string) {
			updateVisible(true);
			updateVideoId(videoId);
		}
		subscribeToModalOpenEvent(handler);
	}, []);

	if (!isVisible) {
		return <div />;
	}
	return (
		<div>
			<div className="mrr-overlay" />
			<div className="mrr-injected-modal">
				<div className="mrr-header">
					<div className="mrr-icon" />
					<span>Viu política</span>
					<div className="mrr-close" onClick={close} />
				</div>
				{isSubmitted ? (
					<>
						<div className="mrr-panel">
							<div className="mrr-label">Obrigado por marcar este vídeo.</div>
							<div className="mrr-message">
								Se você acredita que este vídeo contém algum tipo de conteúdo inadequado pro YouTube, você pode
								denunciá-lo diretamente para o YouTube{' '}
								<a href="https://support.google.com/youtube/answer/2802027?hl=pt-BR" target="_blank" rel="noreferrer">
									aqui
								</a>
								.
							</div>
						</div>
						<div className="mrr-footer">
							Você tem alguma mensagem para a equipe do Viu política? Fale com a gente{' '}
							<a href="mailto:viupolitica@gmail.com" target="_blank" rel="noreferrer">
								aqui
							</a>
							.
						</div>
					</>
				) : (
					<div className="mrr-panel">
						<div className="mrr-label">O que você considera político nesse vídeo?</div>
						<textarea
							placeholder="Escreva sua resposta aqui"
							value={feedbackText}
							onChange={(e) => {
								setFeedbackText(e.target.value);
							}}
						/>
						<button onClick={submit} disabled={feedbackTextEmpty}>
							Marcar vídeo
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
