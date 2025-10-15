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
import DiscordLogin from "./DiscordLogin";
import GoogleLogin from "./GoogleLogin";
import EmailUtil from "./EmailUtil";
import Env = Cloudflare.Env;

export default {

	async fetch(request, env, ctx): Promise<Response> {

		const url = new URL(request.url);

		switch (url.pathname) {
			case '/remote-info':

				return new Response('remote:'+request.headers.get('x-forwarded-for'));
			case '/test/url':
				return new Response(`host: ${url.host}
				hostname: ${url.hostname}
				protocol: ${url.protocol}
				port: ${url.port}
				pathname: ${url.pathname}
				search: ${url.search}`);
			case '/api/discord/login':
				return new Response(null,{status: 302, headers: {location: await new DiscordLogin(env).getLoginUrl()}})
			case '/api/discord/callback':
				let discord_code = url.searchParams.get('code') ?? "";
				return new Response(JSON.stringify(await new DiscordLogin(env).getUser(discord_code),null,2));
			case '/api/google/login':
				return new Response(null,{status: 302, headers: {location: await new GoogleLogin(env).getLoginUrl()}})
			case '/api/google/callback':
				let google_code = url.searchParams.get('code') ?? "";
				return new Response(JSON.stringify(await new GoogleLogin(env).getUser(google_code),null,2 ));
			case '/api/gmail/send':

				const params = await request.formData()
				const to = (params.get('to') as string ?? "").split(",");
				const subject = params.get('subject') as string ?? "";
				const text = params.get('text') as string ?? "";

				await new EmailUtil(env).send("希爾",to,subject,text);

				return new Response("done!")
			default:
				return new Response('Not Found', { status: 404 });
		}
	},
} satisfies ExportedHandler<Env>;

