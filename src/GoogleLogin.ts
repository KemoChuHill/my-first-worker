import {env} from "cloudflare:workers";

export default class {

	env:Env

	constructor(env:Env){
		this.env = env;
	}

	async getLoginUrl(): Promise<string> {

		let client_id = env.google_client_id.get();
		let redirect_uri = env.google_redirect_uri.get();

		let scope:string[] = [
			'openid',
			'email',
			'profile'
		];
		return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${await client_id}&redirect_uri=${encodeURI(await redirect_uri)}&response_type=code&scope=${scope.join('+')}`
	}

	async getUser(code:string):Promise<Object|Error>{

		let client_id = env.google_client_id.get();
		let client_secret = env.google_client_secret.get();
		let redirect_uri = env.google_redirect_uri.get();

		const body =
			`client_id=${await client_id}`+
			`&client_secret=${await client_secret}`+
			`&grant_type=authorization_code`+
			`&code=${code}`+
			`&redirect_uri=${encodeURI(await redirect_uri)}`;

		const req = new Request('https://oauth2.googleapis.com/token',{
			method: 'POST',
			headers:{'Content-Type': 'application/x-www-form-urlencoded'},
			body: body
		});

		const accessTokenResponse = await fetch(req);
		if (accessTokenResponse.status !== 200)
			return new Error(`fetch accessToken error:${accessTokenResponse.statusText} (msg=${await accessTokenResponse.text()})`)

		const accessToken = JSON.parse(await accessTokenResponse.text());
		const id_token = accessToken.id_token;
		if (id_token === undefined){
			return new Error(`fetch accessToken error:accessToken is undefined (msg=${await accessTokenResponse.text()})`)
		}

		const reqTokenInfo = new Request('https://oauth2.googleapis.com/tokeninfo?id_token='+id_token,{
			method: 'GET'
		});

		const tokenInfoResponse = await fetch(reqTokenInfo);
		const tokenInfo = JSON.parse(await tokenInfoResponse.text());

		let google_id = tokenInfo.sub;
		let google_email = tokenInfo.email;
		let google_name = tokenInfo.name;

		return tokenInfo;

		/*{
			id: google_id,
			name: google_name,
			email: google_email
		};*/
	}

}

export class GoogledUser {
	id:string = "";
	name:string = "";
	email:string | null = null;
}
