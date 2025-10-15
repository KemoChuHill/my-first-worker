import { WorkerMailer} from "worker-mailer";
import {env} from "cloudflare:workers";

export default class EmailUtil {
	env:Env

	constructor(env:Env){
		this.env = env;
	}

	async send(senderName:string,to:string[],subject:string,text:string,html:string|undefined=undefined){
		let fromEmail:string = await env.service_email.get();
		const conn = await WorkerMailer.connect({
			host: 'smtp.gmail.com',
			port: 465,
			secure: true,
			authType: 'plain',
			credentials: {
				username: fromEmail ,
				password:await env.service_key.get()
			}
		});

		await conn.send({
			from:{name:senderName,email:fromEmail},
			to:to,
			subject:subject,
			text:text,
			html:html
		});
	}
}
