/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */
import {WorkerMailer} from "worker-mailer";

export default {

	async fetch(request, env, ctx): Promise<Response> {

		const url = new URL(request.url);
		const url_base = `${url.protocol}//${url.host}`;

		let discord_client_id = "";
		let discord_client_secret = "";
		let discord_redirect_uri = "";

		let google_client_id = "";
		let google_redirect_uri = "";
		let google_client_secret = "";

		if (url.pathname.startsWith("/api/discord/")||url.pathname.startsWith("/api/google/")){
			discord_client_id = await env.discord_client_id.get();
			discord_client_secret = await env.discord_client_secret.get();
			discord_redirect_uri = `${url_base}${await env.discord_redirect_uri.get()}`;

			google_client_id = await env.google_client_id.get();
			google_redirect_uri = `${url_base}${await env.google_redirect_uri.get()}`;
			google_client_secret = await env.google_client_secret.get();
		}

		switch (url.pathname) {
			case '/remote-info':
				const info = {
					"env":env,
					"headers":request.headers
				}
				return new Response('remote:'+request.headers.get('x-forwarded-for'));
			case '/test/url':
				return new Response(`host: ${url.host}
				hostname: ${url.hostname}
				protocol: ${url.protocol}
				port: ${url.port}
				pathname: ${url.pathname}
				search: ${url.search}`);
			case '/api/discord/login':
				return new Response(null,{status: 302, headers: {location: getDiscordLoginUrl(discord_client_id, discord_redirect_uri)}})
			case '/api/discord/callback':
				let discord_code = url.searchParams.get('code') ?? "";
				return new Response(await redirectDiscordLogin(discord_code,discord_client_id,discord_client_secret,discord_redirect_uri));
			case '/api/google/login':
				return new Response(null,{status: 302, headers: {location: getGoogleLoginUrl(google_client_id, google_redirect_uri)}})
			case '/api/google/callback':
				let google_code = url.searchParams.get('code') ?? "";
				return new Response(await redirectGoogleLogin(google_code,google_client_id,google_client_secret,google_redirect_uri));

			case '/api/gmail/send':

				const params = await request.formData()
				const to = params.get('to') as string ?? "";
				const subject = params.get('subject') as string ?? "";
				const text = params.get('text') as string ?? "";

				return await sendMail(to.split(","),subject,text);
			default:
				return new Response('Not Found', { status: 404 });
		}
	},
} satisfies ExportedHandler<Env>;


function getDiscordLoginUrl(client_id: string, redirect_uri: string):string {
	let scope:string[] = [
		'identify',
		'email'
	];
	return `https://discord.com/api/oauth2/authorize?client_id=${client_id}&redirect_uri=${encodeURI(redirect_uri)}&response_type=code&scope=${scope.join('+')}`
}


async function redirectDiscordLogin(code:string,client_id:string,client_secret:string,redirect_uri:string){

	const body =
		`client_id=${client_id}`+
		`&client_secret=${client_secret}`+
		`&grant_type=authorization_code`+
		`&code=${code}`+
		`&redirect_uri=${encodeURI(redirect_uri)}`;

	const req = new Request('https://discord.com/api/oauth2/token',{
		method: 'POST',
		headers:{'Content-Type': 'application/x-www-form-urlencoded'},
		body: body
	});

	const accessTokenResponse = await fetch(req);
	const accessToken = JSON.parse(await accessTokenResponse.text()).access_token;

	const reqMe = new Request('https://discord.com/api/users/@me',{
		method: 'GET',
		headers:{'Authorization': `Bearer ${accessToken}`}
	});

	const meResponse = await fetch(reqMe);
	const me = JSON.parse(await meResponse.text());
	return JSON.stringify(me,null,2);
}

async function getDiscordUserPhoto(discord_id:string,avatar_id:string){
	return await fetch(`https://cdn.discordapp.com/avatars/${discord_id}/${avatar_id}`);
}

function getGoogleLoginUrl(client_id: string, redirect_uri: string):string {
	let scope:string[] = [
		'openid',
		'email',
		'profile'
	];
	return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${client_id}&redirect_uri=${encodeURI(redirect_uri)}&response_type=code&scope=${scope.join('+')}`
}

async function redirectGoogleLogin(code:string,client_id:string,client_secret:string,redirect_uri:string){

	const body =
		`client_id=${client_id}`+
		`&client_secret=${client_secret}`+
		`&grant_type=authorization_code`+
		`&code=${code}`+
		`&redirect_uri=${encodeURI(redirect_uri)}`;

	const req = new Request('https://oauth2.googleapis.com/token',{
		method: 'POST',
		headers:{'Content-Type': 'application/x-www-form-urlencoded'},
		body: body
	});

	const accessTokenResponse = await fetch(req);
	const accessToken = JSON.parse(await accessTokenResponse.text());

	console.log(JSON.stringify(accessToken,null,2));

	const id_token = accessToken.id_token;

	const reqTokenInfo = new Request('https://oauth2.googleapis.com/tokeninfo?id_token='+id_token,{
		method: 'GET'
	});

	const tokenInfoResponse = await fetch(reqTokenInfo);
	const tokenInfo = JSON.parse(await tokenInfoResponse.text());

	let google_id = tokenInfo.sub;
	let google_email = tokenInfo.email;
	let google_name = tokenInfo.name;

	return JSON.stringify(tokenInfo,null,2);
}

const gmail_password = 'ydideqzbehleotrc';

async function sendMail(to:string[],subject:string,text:string){
	const transport = await WorkerMailer.connect({
		host: 'smtp.gmail.com',
		port: 465,
		secure: true,
		authType: 'plain',
		credentials: {
			username: 'kemokemo0904@gmail.com',
			password: gmail_password
		}
	});

	await transport.send({
		from:{name:"希爾獸畜",email:'kemokemo0904@gmail.com'},
		to:to,
		subject:subject,
		text:text,
	});

	return new Response('send success');
}
