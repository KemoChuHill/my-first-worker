import {env} from "cloudflare:workers";


export default class {

	env:Env

	constructor(env:Env){
		this.env = env;
	}

	async getLoginUrl(): Promise<string> {
		let scope:string[] = [
			'identify',
			'email'
		];
		const client_id = env.discord_client_id.get();
		const redirect_uri = env.discord_redirect_uri.get();

		return `https://discord.com/api/oauth2/authorize?client_id=${await client_id}&redirect_uri=${encodeURI(await redirect_uri)}&response_type=code&scope=${scope.join('+')}`
	}

	async getUser(code:string):Promise<DiscordUser|Error>{

		const _client_id = env.discord_client_id.get();
		const _redirect_uri = env.discord_redirect_uri.get();
		const _client_secret = env.discord_client_secret.get();

		const client_id = await _client_id;
		const redirect_uri = await _redirect_uri;
		const client_secret = await _client_secret;

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

		if (accessTokenResponse.status !== 200)
			return new Error(`fetch accessToken error:${accessTokenResponse.statusText} (msg=${await accessTokenResponse.text()})`)

		const accessToken = JSON.parse(await accessTokenResponse.text()).access_token;

		if (accessToken === undefined){
			return new Error(`fetch accessToken error:accessToken is undefined (msg=${await accessTokenResponse.text()})`)
		}

		const reqMe = new Request('https://discord.com/api/users/@me',{
			method: 'GET',
			headers:{'Authorization': `Bearer ${accessToken}`}
		});

		const meResponse = await fetch(reqMe);
		if (meResponse.status !== 200)
			return new Error(`fetch user data error:${meResponse.statusText} (msg=${await meResponse.text()})`)

		return JSON.parse(await meResponse.text()) as DiscordUser;
	}

	getUserPhotoUrl(discord_user_id:string,avatar:string):string{
		return `https://cdn.discordapp.com/avatars/${discord_user_id}/${avatar}`;
	}

}

export class DiscordUser {
	id:string = "";
	username:string = "";
	avatar:string | null | undefined = null;
	email:string | null = null;
	verified:boolean = false;
}
