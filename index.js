const fetch = require('node-fetch');

const base = 'https://dokken-api.wbagora.com'

class Client {
	constructor(accessToken, apiKey, clientId, userAgent) {
		this.accessToken = accessToken;
		this.apiKey = apiKey;
		this.clientId = clientId;
		this.userAgent = userAgent || 'Hydra-Cpp/1.132.0';
	}

	handleData(data, resolve, reject) {
		data.then(res => {
			return res.text();
		}).then(json => {
			if (JSON.parse(json).msg) {
				return reject(new Error(JSON.parse(json).msg));
			}
			return resolve(JSON.parse(json));
		})
	}

	searchByUsername(username, limit = 25) {
		return new Promise((resolve, reject) => {
			if (!username) {
				throw new Error('A query must be provided.')
			}
			const data = fetch(base + `/profiles/search_queries/get-by-username/run?username=${username}&limit=${limit}`, {
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

	getMatch(id) {
		return new Promise((resolve, reject) => {
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
}

export class CharacterData {
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