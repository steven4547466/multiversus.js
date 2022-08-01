const fetch = require('node-fetch');
const SteamUser = require("steam-user");

const base = 'https://dokken-api.wbagora.com'

class Client {
	constructor(username, password, apiKey, clientId, userAgent) {
		this.steamUser = new SteamUser();
		this.steamUser.logOn({ accountName: username, password: password });
		this.apiKey = apiKey;
		this.clientId = clientId;
		this.userAgent = userAgent || 'Hydra-Cpp/1.132.0';
		this.ready = false;
		this.steamUser.on("loggedOn", () => {
			this.refreshAppToken()
		})
	}

	refreshAppToken() {
		this.ready = false;
		this.steamUser.createEncryptedAppTicket(1818750, async (err, appTicket) => {
			if (err) {
				console.error(err);
				return;
			}

			let data = await this.refreshAccessToken(appTicket.toString("hex"))

			this.accessToken = data.token
			this.ready = true;
		})
	}

	handleData(data, resolve, reject) {
		data.then(res => {
			if (res.status == 401) {
				return reject({ code: 401, msg: 'Invalid access token.' });
			}
			return res.text();
		}).then(json => {
			if (JSON.parse(json).msg) {
				return reject(new Error(JSON.parse(json).msg));
			}
			return resolve(JSON.parse(json));
		})
	}

	searchByUsername(username, limit = 25, cursor = null, platform = null) {
		return new Promise((resolve, reject) => {
			if (!this.ready) {
				return reject(new Error('Client is not ready.'));
			}

			if (!username) {
				throw new Error('A query must be provided.')
			}
			const data = fetch(base + `/profiles/search_queries/get-by-username/run?username=${username}&limit=${limit}&${cursor ? `cursor=${cursor}&` : ""}account_fields=identity&account_fields=presence&account_fields=server_data&account_fields=data`, {
				headers: {
					'x-hydra-access-token': this.accessToken,
					'x-hydra-api-key': this.apiKey,
					'x-hydra-client-id': this.clientId,
					'x-hydra-user-agent': this.userAgent
				}
			})
			data.then(res => {
				if (res.status == 401) {
					return reject({ code: 401, msg: 'Invalid access token.' });
				}
				return res.text();
			}).then(json => {
				if (JSON.parse(json).msg) {
					return reject(new Error(JSON.parse(json).msg));
				}
				let parsed = JSON.parse(json)

				if (platform) {
					parsed.results = parsed.results.filter(p => p.result.account.identity.alternate[platform] ? p.result.account.identity.alternate[platform][0].username.toLowerCase().includes(username.toLowerCase()) : false)
				}

				return resolve(parsed);
			})
		});
	}

	searchExactUsername(username, limit = 25, cursor = null, platform = null) {
		return new Promise((resolve, reject) => {
			if (!this.ready) {
				return reject(new Error('Client is not ready.'));
			}

			if (!username) {
				throw new Error('A query must be provided.')
			}
			const data = fetch(base + `/profiles/search_queries/get-by-username/run?username=${username}&limit=${limit}&${cursor ? `cursor=${cursor}&` : ""}account_fields=identity&account_fields=presence&account_fields=server_data&account_fields=data`, {
				headers: {
					'x-hydra-access-token': this.accessToken,
					'x-hydra-api-key': this.apiKey,
					'x-hydra-client-id': this.clientId,
					'x-hydra-user-agent': this.userAgent
				}
			})
			data.then(res => {
				if (res.status == 401) {
					return reject({ code: 401, msg: 'Invalid access token.' });
				}
				return res.text();
			}).then(async json => {
				if (JSON.parse(json).msg) {
					return reject(new Error(JSON.parse(json).msg));
				}
				let parsed = JSON.parse(json)

				if (platform) {
					parsed.results = parsed.results.filter(p => p.result.account.identity.alternate[platform] && p.result.account.identity.alternate[platform][0].username ? p.result.account.identity.alternate[platform][0].username.toLowerCase() == username.toLowerCase() : false)
				}

				if (parsed.results.length == 0) {
					return resolve(await this.searchExactUsername(username, 100, parsed.cursor, platform))
				}

				return resolve(parsed.results[0].result);
			})
		});
	}

	getMatch(id) {
		return new Promise((resolve, reject) => {
			if (!this.ready) {
				return reject(new Error('Client is not ready.'));
			}

			if (!id) {
				throw new Error('A match ID must be provided.')
			}
			const data = fetch(base + `/matches/${id}`, {
				headers: {
					'x-hydra-access-token': this.accessToken,
					'x-hydra-api-key': this.apiKey,
					'x-hydra-client-id': this.clientId,
					'x-hydra-user-agent': this.userAgent
				}
			})
			this.handleData(data, resolve, reject);
		})
	}

	getProfile(id) {
		return new Promise((resolve, reject) => {
			if (!this.ready) {
				return reject(new Error('Client is not ready.'));
			}

			if (!id) {
				throw new Error('A user ID must be provided.')
			}
			const data = fetch(base + `/profiles/${id}`, {
				headers: {
					'x-hydra-access-token': this.accessToken,
					'x-hydra-api-key': this.apiKey,
					'x-hydra-client-id': this.clientId,
					'x-hydra-user-agent': this.userAgent
				}
			})
			this.handleData(data, resolve, reject);
		})
	}

	getProfileLeaderboard(id, type) {
		return new Promise((resolve, reject) => {
			if (!this.ready) {
				return reject(new Error('Client is not ready.'));
			}

			if (type !== '2v2' && type !== '1v1') {
				return reject(new Error('Leaderboard type must be 1v1 or 2v2.'));
			}
			if (!id) {
				return reject(new Error('A user ID must be provided.'));
			}
			const data = fetch(base + `/leaderboards/${type}/score-and-rank/${id}`, {
				headers: {
					'x-hydra-access-token': this.accessToken,
					'x-hydra-api-key': this.apiKey,
					'x-hydra-client-id': this.clientId,
					'x-hydra-user-agent': this.userAgent
				}
			})
			this.handleData(data, resolve, reject);
		});
	}

	getProfileLeaderboardForCharacter(id, type, character) {
		return new Promise((resolve, reject) => {
			if (!this.ready) {
				return reject(new Error('Client is not ready.'));
			}

			if (type !== '2v2' && type !== '1v1') {
				return reject(new Error('Leaderboard type must be 1v1 or 2v2.'));
			}
			if (!id) {
				return reject(new Error('A user ID must be provided.'));
			}
			if (!character) {
				return reject(new Error('A character must be provided.'));
			}
			const data = fetch(base + `/leaderboards/${character}_${type}/score-and-rank/${id}`, {
				headers: {
					'x-hydra-access-token': this.accessToken,
					'x-hydra-api-key': this.apiKey,
					'x-hydra-client-id': this.clientId,
					'x-hydra-user-agent': this.userAgent
				}
			})
			this.handleData(data, resolve, reject);
		});
	}

	getLeaderboard(type) {
		return new Promise((resolve, reject) => {
			if (!this.ready) {
				return reject(new Error('Client is not ready.'));
			}

			if (type !== '2v2' && type !== '1v1') {
				return reject(new Error('Leaderboard type must be 1v1 or 2v2.'));
			}
			const data = fetch(base + `/leaderboards/${type}/show`, {
				headers: {
					'x-hydra-access-token': this.accessToken,
					'x-hydra-api-key': this.apiKey,
					'x-hydra-client-id': this.clientId,
					'x-hydra-user-agent': this.userAgent
				}
			})
			this.handleData(data, resolve, reject);
		});
	}

	getMatches(id, page = 1) {
		return new Promise((resolve, reject) => {
			if (!this.ready) {
				return reject(new Error('Client is not ready.'));
			}

			if (!id) {
				return reject(new Error('A user ID must be provided.'));
			}
			const data = fetch(base + `/matches/all/${id}?page=${page}`, {
				headers: {
					'x-hydra-access-token': this.accessToken,
					'x-hydra-api-key': this.apiKey,
					'x-hydra-client-id': this.clientId,
					'x-hydra-user-agent': this.userAgent
				}
			})
			this.handleData(data, resolve, reject);
		});
	}

	refreshAccessToken(steamToken) {
		return new Promise((resolve, reject) => {
			const data = fetch(base + `/access`, {
				headers: {
					'x-hydra-api-key': this.apiKey,
					'x-hydra-client-id': this.clientId,
					'x-hydra-user-agent': this.userAgent,
					'Content-Type': 'application/json'
				},
				method: 'POST',
				body: JSON.stringify({ auth: { steam: steamToken, fail_on_missing: true } })
			})
			this.handleData(data, resolve, reject);
		});
	}
}

class CharacterData {
	static Shaggy = {
		"id": "character_shaggy",
		"displayName": "Shaggy",
		"aliases": []
	}

	static WonderWoman = {
		"id": "character_wonder_woman",
		"displayName": "Wonder Woman",
		"aliases": []
	}

	static Batman = {
		"id": "character_batman",
		"displayName": "Batman",
		"aliases": []
	}

	static Superman = {
		"id": "character_superman",
		"displayName": "Superman",
		"aliases": []
	}

	static Taz = {
		"id": "character_taz",
		"displayName": "Taz",
		"aliases": []
	}

	static IronGiant = {
		"id": "character_C017",
		"displayName": "Iron Giant",
		"aliases": []
	}

	static Garnet = {
		"id": "character_garnet",
		"displayName": "Garnet",
		"aliases": []
	}

	static StevenUniverse = {
		"id": "character_steven",
		"displayName": "Steven Universe",
		"aliases": []
	}

	static Jake = {
		"id": "character_jake",
		"displayName": "Jake the Dog",
		"aliases": [
			"Jake"
		]
	}

	static Reindog = {
		"id": "character_creature",
		"displayName": "Reindog",
		"aliases": []
	}

	static Finn = {
		"id": "character_finn",
		"displayName": "Finn the Human",
		"aliases": [
			"Finn"
		]
	}

	static Velma = {
		"id": "character_velma",
		"displayName": "Velma",
		"aliases": []
	}

	static AryaStark = {
		"id": "character_arya",
		"displayName": "Arya Stark",
		"aliases": []
	}

	static BugsBunny = {
		"id": "character_bugs_bunny",
		"displayName": "Bugs Bunny",
		"aliases": []
	}

	static HarleyQuinn = {
		"id": "character_harleyquinn",
		"displayName": "Harley Quinn",
		"aliases": []
	}

	static TomAndJerry = {
		"id": "character_tom_and_jerry",
		"displayName": "Tom and Jerry",
		"aliases": []
	}

	static LeBronJames = {
		"id": "character_c16",
		"displayName": "LeBron James",
		"aliases": []
	}
}

module.exports = {
	Client,
	CharacterData
}