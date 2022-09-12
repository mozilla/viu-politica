import * as React from 'react';
import '../common/tailwind.css';
import '../common/photon-components-web/index.css';
import '../common/photon-components-web/attributes/index.css';
import './index.css';
import { installationId } from '../common/common';
import { getBackgroundScript, useAsync } from '../common/helpers';

export function Main() {
	const installationIdValue = installationId.use();
	const { value: bg } = useAsync(getBackgroundScript, true);
	return (
		<>
			<div className="text-xl font-semibold mt-4">Comentários</div>
			<div className="my-4">
				Você tem alguma mensagem para a equipe do Viu política? Fale com a gente{' '}
				<a className="font-bold underline" href="mailto:viupolitica@gmail.com" target="_blank" rel="noreferrer">
					aqui
				</a>
				.
			</div>
			<div className="text-xl font-semibold mt-8">Informações de instalação</div>
			<div className="my-4">
				Versão da extensão: <code>{process.env.EXTENSION_VERSION}</code>
			</div>
			<div className="my-4">
				Identificador de instalação: <code>{installationIdValue}</code>
			</div>
			<div className="my-4">
				Identificador de relatório de erros: <code>{installationIdValue}</code>
			</div>
		</>
	);
}
