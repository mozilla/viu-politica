import * as React from 'react';
import '../common/tailwind.css';
export function Main() {
	return (
		<div className="m-3 text-sm">
			<div className="font-bold mb-2">Obrigado por usar o Viu Política!</div>O projeto Viu Política chegou ao fim. Se
			você quiser ver os resultados do nosso estudo, clique{' '}
			<a href="https://www.vero.org.br/viupolitica" target="_blank" rel="noreferrer" className="text-blue-60">
				aqui
			</a>
			{'.'}
			&nbsp;Se você tiver alguma pergunta, manda um email pra gente no{' '}
			<a href="mailto:viupolitica@gmail.com" target="_blank" rel="nofollow noreferrer" className="text-blue-60">
				viupolitica@gmail.com
			</a>
			. Obrigado por participar!
		</div>
	);
}
