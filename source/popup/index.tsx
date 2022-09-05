import * as React from 'react';
import '../common/tailwind.css';
import { faqPageUrl } from '../common/links';
export function Main() {
	return (
		<div className="m-3 text-sm">
			<div className="font-bold mb-2">Obrigado por usar o Viu política!</div>
			O Viu política ajuda você a contribuir com a pesquisa colaborativa sobre os algoritmos do YouTube e as Eleições
			2022 no Brasil.
			<br />
			Saiba mais sobre como usar o Viu política e sobre a nossa pesquisa <a href={faqPageUrl}>aqui</a>.
		</div>
	);
}
