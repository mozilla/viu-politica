import * as React from 'react';
import 'photon-colors/photon-colors.css';
import '../common/photon-components-web/attributes/index.css';
// @ts-expect-error png declaration
import logo from './img/logo.png';
import '../common/tailwind.css';
import { faqPageUrl } from '../common/links';

export function GetStartedFlow() {
	return (
		<div>
			<div className="img-get-started-bg absolute" />
			<div className="img-circles absolute" />
			<div className="px-16 mb-16">
				<div className="flex flex-col">
					<div className="justify-center">
						<img className="img-mozilla-logo m-auto mt-12.5 leading-none" src={logo} />
					</div>
				</div>
				<div className="mx-auto max-w-3xl grid grid-cols-12 gap-5 font-sans text-xl">
					<div className="col-span-1" />
					<div className="col-span-10">
						<>
							<div className="flex flex-col text-center text-white">
								<div className="font-changa text-big mt-16 leading-none">
									Obrigado por instalar a extensão Viu Política!
								</div>
								<div className="font-sans font-light text-left text-xl mt-5 leading-tight">
									<p>
										Ao instalar esta extensão, você está ajudando a Mozilla Foundation, a Universidade de Exeter, e o
										Instituto Vero a entender o conteúdo político espalhado pelo YouTube em 2022.
									</p>
									<br />
									<h1>O que acontece agora:</h1>
									<br />
									<p>
										Agora você pode usar o YouTube normalmente. Se você achar que algum vídeo fala de algo ligado a
										política, é só clicar no mapinha do Brasil no canto do vídeo pra informar a gente. Se você quiser,
										você pode ajudar dando detalhes do que você viu no vídeo que é um tema político.
									</p>
								</div>
							</div>
						</>
					</div>
					<div className="col-span-1" />
					<div className="col-span-4 text-center">
						<div className="img-step-1 m-auto border border-grey-95" />
					</div>
					<div className="col-span-4 text-center">
						<div className="img-step-2 m-auto border border-grey-95" />
					</div>
					<div className="col-span-4 text-center">
						<div className="img-step-3 m-auto border border-grey-95" />
					</div>
					<div className="col-span-2" />
					<div className="col-span-8 font-light pt-10">
						<p className="font-bold">
							Quando você marca que um vídeo tem política, a extensão Viu Política coleta o link do vídeo marcado, o
							link dos vídeos recomendados, e manda pra gente.
						</p>
						<br />
						<br />
						Cada pessoa que instala a extensão ajuda a gente a entender melhor que tipo de conteúdo político está se
						espalhando pelo YouTube, seja ele diretamente sobre política, ou seja ele sobre outro assunto, mas que acabe
						tocando em política também.
						<br />
						<br />
						<p className="font-bold">
							E é isso! A extensão não coleta nenhuma informação sobre você, e a sua contribuição é totalmente anônima.
						</p>
						<br />
						Se você quiser contribuir um pouco mais com a pesquisa, nós temos um formulário. Ele é 100% opcional, 100%
						anônimo, e é só pra gente entender quem são as pessoas que contribuem para este projeto. Se você puder
						responder ao formulário, o link está logo abaixo.
						<br />
						<br />
						<a className="underline font-bold" href="https://www.surveymonkey.co.uk/r/WV7G8WZ">
							Clique aqui para acessar o formulário.
						</a>
						<br />
						<br />
						Faltou alguma informação? Você tem alguma pergunta? Veja as nossas perguntas mais frequentes{' '}
						<a className="underline font-bold" href={faqPageUrl}>
							aqui
						</a>
						.
					</div>
				</div>
			</div>
		</div>
	);
}
