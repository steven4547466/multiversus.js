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
				this.refreshAppToken()
				return reject({ code: 401, msg: 'Invalid access token.' });
			}
			return res.text();
		}).then(json => {
			try {
				if (JSON.parse(json).msg) {
					return reject(new Error(JSON.parse(json).msg));
				}
			} catch (e) {
				return reject(new Error("Invalid JSON.\n"+json));
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
					this.refreshAppToken()
					return reject({ code: 401, msg: 'Invalid access token.' });
				}
				return res.text();
			}).then(json => {
				if (JSON.parse(json).msg) {
					return reject(new Error(JSON.parse(json).msg));
				}
				let parsed = JSON.parse(json)

				if (platform) {
					parsed.results = parsed.results.filter(p => p.result && p.result.account && p.result.account.identity && p.result.account.identity.alternate && p.result.account.identity.alternate[platform] ? p.result.account.identity.alternate[platform][0].username.toLowerCase().includes(username.toLowerCase()) : false)
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
					this.refreshAppToken()
					return reject({ code: 401, msg: 'Invalid access token.' });
				}
				return res.text();
			}).then(async json => {
				if (JSON.parse(json).msg) {
					return reject(new Error(JSON.parse(json).msg));
				}
				let parsed = JSON.parse(json)

				if (platform) {
					parsed.results = parsed.results.filter(p => p.result && p.result.account && p.result.account.identity && p.result.account.identity.alternate && p.result.account.identity.alternate[platform] && p.result.account.identity.alternate[platform][0].username ? p.result.account.identity.alternate[platform][0].username.toLowerCase() == username.toLowerCase() : false)
				}

				if (parsed.results.length == 0) {
					if (parsed.cursor && parsed.cursor.trim().length > 0) {
						return resolve(await this.searchExactUsername(username, 100, parsed.cursor, platform))
					}
					else {
						return resolve(null)
					}
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

	getLeaderboardForCharacter(type, character) {
		return new Promise((resolve, reject) => {
			if (!this.ready) {
				return reject(new Error('Client is not ready.'));
			}

			if (type !== '2v2' && type !== '1v1') {
				return reject(new Error('Leaderboard type must be 1v1 or 2v2.'));
			}
			if (!character) {
				return reject(new Error('A character must be provided.'));
			}
			const data = fetch(base + `/leaderboards/${character}_${type}/show`, {
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
	batchRequest(requests) {
		return new Promise((resolve, reject) => {
			const data = fetch(base + `/batch`, {
				headers: {
					'x-hydra-access-token': this.accessToken,
					'x-hydra-api-key': this.apiKey,
					'x-hydra-client-id': this.clientId,
					'x-hydra-user-agent': this.userAgent,
					'Content-Type': 'application/json'
				},
				method: 'PUT',
				body: JSON.stringify({
					options: {
						allow_failures: false,
					},
					requests
				})
			})
			this.handleData(data, resolve, reject);
		})
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

	static RickSanchez = {
		"id": "character_c020",
		"displayName": "Rick Sanchez",
		"aliases": ["Rick"]
	}
}

class PerkData {
	static StarLabsAerodynamics = {
		displayName: "STAR Labs Aerodynamics",
		ids: ["perk_general_jumpspeed_medium", "perk_general_jumpspeed_large"],
		characterSpecific: false,
		category: "Utility",
		levels: [
			{
				slug: "perk_general_jumpspeed_medium",
				description: "20% increased jump speed"
			},
			{
				slug: "perk_general_jumpspeed_large",
				description: "30% increased jump speed"
			}
		]
	}

	static BoundlessEnergy = {
		displayName: "Boundless Energy",
		ids: ["perk_general_evaderechargetime_small", "perk_general_evaderechargetime_medium", "perk_general_evaderechargetime_large"],
		characterSpecific: false,
		category: "Defense",
		levels: [
			{
				slug: "perk_general_evaderechargetime_small",
				description: "Your team receives 10% faster dodge invulnerability recharge.undefined"
			},
			{
				slug: "perk_general_evaderechargetime_medium",
				description: "Dodges recharge 20% faster"
			},
			{
				slug: "perk_general_evaderechargetime_large",
				description: "Dodges recharge 30% faster"
			}
		]
	}

	static TasmanianTrigonometry = {
		displayName: "Tasmanian Trigonometry",
		ids: ["perk_general_directionalinfluence_small", "perk_general_directionalinfluence_medium", "perk_general_directionalinfluence_large"],
		characterSpecific: false,
		category: "Utility",
		levels: [
			{
				slug: "perk_general_directionalinfluence_small",
				description: "Your team receives 15% increased base knockback influence.undefined"
			},
			{
				slug: "perk_general_directionalinfluence_medium",
				description: "300% increased directional influence"
			},
			{
				slug: "perk_general_directionalinfluence_large",
				description: "400% increased directional influence"
			}
		]
	}

	static IGottaGetInThere = {
		displayName: "I Gotta Get In There!",
		ids: ["perk_C015_teamfightcloud"],
		characterSpecific: true,
		category: "CharacterSpecific",
		levels: [
			{
				slug: "perk_C015_teamfightcloud",
				description: "Taz's allies can jump into his dogpile, giving it more damage, more knockback, longer duration, and armor."
			}
		]
	}

	static IronStomach = {
		displayName: "Iron Stomach",
		ids: ["perk_C015_ironstomach"],
		characterSpecific: true,
		category: "CharacterSpecific",
		levels: [
			{
				slug: "perk_C015_ironstomach",
				description: "After Taz eats a projectile, he will burp an anvil item instead of of the projectile he ate."
			}
		]
	}

	static KeepPossession = {
		displayName: "Keep Possession",
		ids: ["perk_c016_keeppossession"],
		characterSpecific: true,
		category: "CharacterSpecific",
		levels: [
			{
				slug: "perk_c016_keeppossession",
				description: "When LeBron or his allies receive a pass, they gain gray health for a few seconds."
			}
		]
	}

	static HotHands = {
		displayName: "Hot Hands",
		ids: ["perk_c016_hothands"],
		characterSpecific: true,
		category: "CharacterSpecific",
		levels: [
			{
				slug: "perk_c016_hothands",
				description: "If LeBron completes a no-look pass to his ally, the basketball is ignited. If LeBron dunks an ignited basketball, he ignites all"
			}
		]
	}

	static ForThree = {
		displayName: "For Three!",
		ids: ["perk_c016_distanceshot"],
		characterSpecific: true,
		category: "CharacterSpecific",
		levels: [
			{
				slug: "perk_c016_distanceshot",
				description: "LeBron and his allies that hit enemies with a basketball from far away cause the basketball to explode, dealing damage and knock"
			}
		]
	}

	static Afterburners = {
		displayName: "Afterburners",
		ids: ["perk_c017_scorchedearth"],
		characterSpecific: true,
		category: "CharacterSpecific",
		levels: [
			{
				slug: "perk_c017_scorchedearth",
				description: "When Iron Giant's rocket boots ignite the ground, they leave behind firewalls."
			}
		]
	}

	static StaticDischarge = {
		displayName: "Static Discharge",
		ids: ["perk_c017_stackthorns"],
		characterSpecific: true,
		category: "CharacterSpecific",
		levels: [
			{
				slug: "perk_c017_stackthorns",
				description: "Iron Giant's passive grants a stack of Thorns for each unique source of gray health."
			}
		]
	}

	static WrongSideOfTheBed = {
		displayName: "Wrong Side of the Bed",
		ids: ["perk_c017_fastweaponmode"],
		characterSpecific: true,
		category: "CharacterSpecific",
		levels: [
			{
				slug: "perk_c017_fastweaponmode",
				description: "Iron Giant spawns with some of his RAGE meter already filled."
			}
		]
	}

	static GoingOutOfBusiness = {
		displayName: "Going Out Of Business",
		ids: ["perk_finn_goingoutofbusiness"],
		characterSpecific: true,
		category: "CharacterSpecific",
		levels: [
			{
				slug: "perk_finn_goingoutofbusiness",
				description: "All the items in Finn's shop are discounted by 200 gold for 10 seconds after Finn's ally is rung out. The discount is permanent "
			}
		]
	}

	static OnTheHouse = {
		displayName: "On The House!",
		ids: ["perk_finn_gemoncharge"],
		characterSpecific: true,
		category: "CharacterSpecific",
		levels: [
			{
				slug: "perk_finn_gemoncharge",
				description: "Generate a free gem after connecting a fully charged ground attack."
			}
		]
	}

	static InASingleBound = {
		displayName: "...in a Single Bound!",
		ids: ["perk_general_jumpspeed_small"],
		characterSpecific: false,
		category: "Utility",
		levels: [
			{
				slug: "perk_general_jumpspeed_small",
				description: "Your team receives 10% increased jump speed.undefined"
			}
		]
	}

	static Marker = {
		displayName: "Marker",
		ids: ["perk_garnet_marker"],
		characterSpecific: true,
		category: "CharacterSpecific",
		levels: [
			{
				slug: "perk_garnet_marker",
				description: "Garnet's rocket gauntlets will spawn her marker at their location when they are destroyed. The marker will not spawn if it is on"
			}
		]
	}

	static ElectricGroove = {
		displayName: "Electric Groove",
		ids: ["perk_garnet_electricgroove"],
		characterSpecific: true,
		category: "CharacterSpecific",
		levels: [
			{
				slug: "perk_garnet_electricgroove",
				description: "Applying shocked to enemies as Garnet or her ally grant stacks of Garnet's rhythym."
			}
		]
	}

	static Studied = {
		displayName: "Studied",
		ids: ["perk_velma_studied"],
		characterSpecific: true,
		category: "CharacterSpecific",
		levels: [
			{
				slug: "perk_velma_studied",
				description: "Velma spawns with 1 piece of evidence already collected."
			}
		]
	}

	static KnowledgeIsPower = {
		displayName: "Knowledge Is Power",
		ids: ["perk_velma_knowledgeispower"],
		characterSpecific: true,
		category: "CharacterSpecific",
		levels: [
			{
				slug: "perk_velma_knowledgeispower",
				description: "Velma's ally receives 7 gray health for a few seconds after picking up evidence."
			}
		]
	}

	static PaintedTarget = {
		displayName: "Painted Target",
		ids: ["perk_general_paintedtarget"],
		characterSpecific: false,
		category: "Offense",
		levels: [
			{
				slug: "perk_general_paintedtarget",
				description: "Your team deals 5% increased damageundefined when hitting enemies that are in hitstun."
			}
		]
	}

	static SpeedForceAssist = {
		displayName: "Speed Force Assist",
		ids: ["perk_general_movespeed_small", "perk_general_movespeed_medium", "perk_general_movespeed_large"],
		characterSpecific: false,
		category: "Utility",
		levels: [
			{
				slug: "perk_general_movespeed_small",
				description: "Your team receives 4% increased base movement speed.undefined"
			},
			{
				slug: "perk_general_movespeed_medium",
				description: "Increases base move speed by 15%"
			},
			{
				slug: "perk_general_movespeed_large",
				description: "Increases base move speed by 20%"
			}
		]
	}

	static CominThroughDoc = {
		displayName: "Comin' Through Doc",
		ids: ["perk_bugsbunny_shockwave"],
		characterSpecific: true,
		category: "CharacterSpecific",
		levels: [
			{
				slug: "perk_bugsbunny_shockwave",
				description: "After leaving an existing tunnel, Bugs Bunny and his allies release a shockwave that damages nearby enemies."
			}
		]
	}

	static LingeringLove = {
		displayName: "Lingering Love",
		ids: ["perk_bugsbunny_lingeringlove"],
		characterSpecific: true,
		category: "CharacterSpecific",
		levels: [
			{
				slug: "perk_bugsbunny_lingeringlove",
				description: "Bugs' kiss leaves behind a floating heart. Enemies who run into it will be charmed, but the charm's duration is significantly re"
			}
		]
	}

	static Deadshot = {
		displayName: "Deadshot",
		ids: ["perk_general_projectiledamageboost_small", "perk_general_projectiledamageboost_medium", "perk_general_projectiledamageboost_large"],
		characterSpecific: false,
		category: "Offense",
		levels: [
			{
				slug: "perk_general_projectiledamageboost_small",
				description: "Your team deals 5% increased damageundefined with projectiles."
			},
			{
				slug: "perk_general_projectiledamageboost_medium",
				description: "10% increased damage with projectiles"
			},
			{
				slug: "perk_general_projectiledamageboost_large",
				description: "15% increased damage with projectiles"
			}
		]
	}

	static SlipperyCustomer = {
		displayName: "Slippery Customer",
		ids: ["perk_general_evadebaseinvulnerability_small", "perk_general_evadespeed_medium", "perk_general_evadebaseinvulnerability_medium", "perk_general_evadespeed_large", "perk_general_evadebaseinvulnerability_large"],
		characterSpecific: false,
		category: "Utility",
		levels: [
			{
				slug: "perk_general_evadebaseinvulnerability_small",
				description: "Your team receives a 10% longer dodge invulnerability window.undefined"
			},
			{
				slug: "perk_general_evadespeed_medium",
				description: "18% increased dodge speed"
			},
			{
				slug: "perk_general_evadebaseinvulnerability_medium",
				description: "20% longer dodge window"
			},
			{
				slug: "perk_general_evadespeed_large",
				description: "25% increased dodge speed"
			},
			{
				slug: "perk_general_evadebaseinvulnerability_large",
				description: "30% longer dodge window"
			}
		]
	}

	static ItsCalledTheBuddySystemMorty = {
		displayName: "It's Called The Buddy System, Morty",
		ids: ["perk_c020_signature_1"],
		characterSpecific: true,
		category: "CharacterSpecific",
		levels: [
			{
				slug: "perk_c020_signature_1",
				description: "Allies that are knocked into portals have their hitstun negated and velocity reduced."
			}
		]
	}

	static SturdyDodger = {
		displayName: "Sturdy Dodger",
		ids: ["perk_general_dodgearmor"],
		characterSpecific: false,
		category: "Defense",
		levels: [
			{
				slug: "perk_general_dodgearmor",
				description: "Your team receives armor for 1 secondundefined after successfully neutral dodging a projectile."
			}
		]
	}

	static HitMeIfYoureAble = {
		displayName: "Hit Me If You're Able",
		ids: ["perk_general_evadespeed_small"],
		characterSpecific: false,
		category: "Utility",
		levels: [
			{
				slug: "perk_general_evadespeed_small",
				description: "Your team receives 5% increased dodge speed.undefined"
			}
		]
	}

	static SmoothMoves = {
		displayName: "Smooth Moves",
		ids: ["perk_harley_smoothmoves"],
		characterSpecific: true,
		category: "CharacterSpecific",
		levels: [
			{
				slug: "perk_harley_smoothmoves",
				description: "Harley's ground and air side specials also become dodges, giving her brief invulnerability at the beginning of the attack."
			}
		]
	}

	static ConfettiExplosion = {
		displayName: "Confetti Explosion",
		ids: ["perk_harley_confettiexplosion"],
		characterSpecific: true,
		category: "CharacterSpecific",
		levels: [
			{
				slug: "perk_harley_confettiexplosion",
				description: "Instead of igniting, at max stacks Harley's Confetti debuff creates a large explosion launching enemies upward"
			}
		]
	}

	static GloveControl = {
		displayName: "Glove Control",
		ids: ["perk_harley_bullseye"],
		characterSpecific: true,
		category: "CharacterSpecific",
		levels: [
			{
				slug: "perk_harley_bullseye",
				description: "Harley can aim the direction she fires her boxing glove on her air down normal attack."
			}
		]
	}

	static BounceBubble = {
		displayName: "Bounce Bubble",
		ids: ["perk_steven_shieldbounce"],
		characterSpecific: true,
		category: "CharacterSpecific",
		levels: [
			{
				slug: "perk_steven_shieldbounce",
				description: "Enemies have their hitstun extended and velocity increased after getting knocked into Steven's wall or platform shields."
			}
		]
	}

	static GreenThumb = {
		displayName: "Green Thumb",
		ids: ["perk_steven_greenthumb"],
		characterSpecific: true,
		category: "CharacterSpecific",
		levels: [
			{
				slug: "perk_steven_greenthumb",
				description: "Watermelon Steven grows larger and deals more damage the longer he is alive."
			}
		]
	}

	static IceToBeatYou = {
		displayName: "Ice to Beat You!",
		ids: ["perk_general_iceprojectile"],
		characterSpecific: false,
		category: "Offense",
		levels: [
			{
				slug: "perk_general_iceprojectile",
				description: "Your team's projectiles deal 1 stack of iceundefined if they knock enemies back."
			}
		]
	}

	static CollateralDamage = {
		displayName: "Collateral Damage",
		ids: ["perk_general_collateraldamage"],
		characterSpecific: false,
		category: "Offense",
		levels: [
			{
				slug: "perk_general_collateraldamage",
				description: "Your team deals 1 additional damageundefined when knocked back enemies collide with a wall or floor."
			}
		]
	}

	static AbsorbNGo = {
		displayName: "Absorb 'n' Go",
		ids: ["perk_general_abilityrefundontakeprojectilekb"],
		characterSpecific: false,
		category: "Defense",
		levels: [
			{
				slug: "perk_general_abilityrefundontakeprojectilekb",
				description: "Your team receives a 7% ability cooldown refundundefined after being knocked back by a projectile."
			}
		]
	}

	static DynamiteSplit = {
		displayName: "Dynamite Split",
		ids: ["perk_tomandjerry_dynamitesplit"],
		characterSpecific: true,
		category: "CharacterSpecific",
		levels: [
			{
				slug: "perk_tomandjerry_dynamitesplit",
				description: "Reflecting Tom's dynamite with his tennis racket will split it into 3 dynamite sticks."
			}
		]
	}

	static FlyFisher = {
		displayName: "Fly Fisher",
		ids: ["perk_tomandjerry_bait"],
		characterSpecific: true,
		category: "CharacterSpecific",
		levels: [
			{
				slug: "perk_tomandjerry_bait",
				description: "Tom's fishing pole is weaker, but if he hits the ground or a wall with it, he will pull himself to the terrain."
			}
		]
	}

	static SchoolMeOnce = {
		displayName: "School Me Once...",
		ids: ["perk_general_projectileblock"],
		characterSpecific: false,
		category: "Defense",
		levels: [
			{
				slug: "perk_general_projectileblock",
				description: "Your team receives a projectile block buff for 2 secondsundefined after being knocked back by a projectile."
			}
		]
	}

	static ShirtCannonSniper = {
		displayName: "Shirt Cannon Sniper",
		ids: ["perk_general_sniper"],
		characterSpecific: false,
		category: "Offense",
		levels: [
			{
				slug: "perk_general_sniper",
				description: "Your team's projectiles deal 7% increased damageundefined to far away victims."
			}
		]
	}

	static ThatsFlammableDoc = {
		displayName: "That's Flammable, Doc!",
		ids: ["perk_general_fireprojectile"],
		characterSpecific: false,
		category: "Offense",
		levels: [
			{
				slug: "perk_general_fireprojectile",
				description: "For 3 seconds after knocking back an enemy with a projectile, your team can melee attack that enemy to ignite them for "
			}
		]
	}

	static IDodgeYouDodgeWeDodge = {
		displayName: "I Dodge You Dodge We Dodge",
		ids: ["perk_general_abilityrefundondodge"],
		characterSpecific: false,
		category: "Utility",
		levels: [
			{
				slug: "perk_general_abilityrefundondodge",
				description: "Your team receives a 10% ability cooldown refundundefined after dodging an attack."
			}
		]
	}

	static ArmorCrush = {
		displayName: "Armor Crush",
		ids: ["perk_general_chargearmorbreak"],
		characterSpecific: false,
		category: "Offense",
		levels: [
			{
				slug: "perk_general_chargearmorbreak",
				description: "Your team's fully charged attacks break armor.undefined"
			}
		]
	}

	static Trophy = {
		displayName: "Trophy",
		ids: ["perk_arya_copycat"],
		characterSpecific: true,
		category: "CharacterSpecific",
		levels: [
			{
				slug: "perk_arya_copycat",
				description: "When Arya knocks out an enemy, she automatically obtains their face."
			}
		]
	}

	static Betrayal = {
		displayName: "Betrayal",
		ids: ["perk_arya_enrageallies"],
		characterSpecific: true,
		category: "CharacterSpecific",
		levels: [
			{
				slug: "perk_arya_enrageallies",
				description: "Hitting an ally with Arya's dagger has a longer cooldown, but the ally is given an enraged buff. If Arya dashes to a dagger on a"
			}
		]
	}

	static FancyFootwork = {
		displayName: "Fancy Footwork",
		ids: ["perk_general_evadedistance_small", "perk_general_evadedistance_medium", "perk_general_evadedistance_large"],
		characterSpecific: false,
		category: "Utility",
		levels: [
			{
				slug: "perk_general_evadedistance_small",
				description: "Your team receives 5% increased dodge distance.undefined"
			},
			{
				slug: "perk_general_evadedistance_medium",
				description: "10% increased dodge distance"
			},
			{
				slug: "perk_general_evadedistance_large",
				description: "15% increased dodge distance"
			}
		]
	}

	static MakeItRainDog = {
		displayName: "Make It Rain, Dog!",
		ids: ["perk_general_projectilespeed_small", "perk_general_projectilespeed_medium", "perk_general_projectilespeed_large"],
		characterSpecific: false,
		category: "Offense",
		levels: [
			{
				slug: "perk_general_projectilespeed_small",
				description: "Your team receives 20% increased projectile speed.undefined"
			},
			{
				slug: "perk_general_projectilespeed_medium",
				description: "30% increased projectile speed"
			},
			{
				slug: "perk_general_projectilespeed_large",
				description: "40% Increased Projectile Speed"
			}
		]
	}

	static StaticElectricity = {
		displayName: "Static Electricity",
		ids: ["perk_general_electricprojectile"],
		characterSpecific: false,
		category: "Offense",
		levels: [
			{
				slug: "perk_general_electricprojectile",
				description: "After allies move on the ground for 4 seconds, their next projectile applies shocked to enemies.undefined Leaving the ground "
			}
		]
	}

	static CrystalPal = {
		displayName: "Crystal Pal",
		ids: ["perk_creature_airsupport"],
		characterSpecific: true,
		category: "CharacterSpecific",
		levels: [
			{
				slug: "perk_creature_airsupport",
				description: "Reindog's crystal follows him as it descends."
			}
		]
	}

	static FireFluff = {
		displayName: "Fire Fluff",
		ids: ["perk_creature_firestorm"],
		characterSpecific: true,
		category: "CharacterSpecific",
		levels: [
			{
				slug: "perk_creature_firestorm",
				description: "Reindog's fireball creates a larger firewall upon hitting the ground."
			}
		]
	}

	static LegDayChamp = {
		displayName: "Leg Day Champ",
		ids: ["perk_general_jumpheight_small", "perk_general_jumpheight_medium", "perk_general_jumpheight_large"],
		characterSpecific: false,
		category: "Utility",
		levels: [
			{
				slug: "perk_general_jumpheight_small",
				description: "Your team receives 10% increased jump height.undefined"
			},
			{
				slug: "perk_general_jumpheight_medium",
				description: "20% increased jump height"
			},
			{
				slug: "perk_general_jumpheight_large",
				description: "30% increased jump height"
			}
		]
	}

	static ToonElasticity = {
		displayName: "'Toon Elasticity",
		ids: ["perk_general_wallbouncereduction_small", "perk_general_wallbouncereduction_medium", "perk_general_wallbouncereduction_large"],
		characterSpecific: false,
		category: "Defense",
		levels: [
			{
				slug: "perk_general_wallbouncereduction_small",
				description: "Your team receives a 20% reduction to ground and wall bounce velocity.undefined"
			},
			{
				slug: "perk_general_wallbouncereduction_medium",
				description: "Wall bounce velocity reduced by 30%"
			},
			{
				slug: "perk_general_wallbouncereduction_large",
				description: "Wall bounce velocity reduced by 40%"
			}
		]
	}

	static Sticky = {
		displayName: "Sticky",
		ids: ["perk_jake_quickstretch"],
		characterSpecific: true,
		category: "CharacterSpecific",
		levels: [
			{
				slug: "perk_jake_quickstretch",
				description: "Enemies that touch Jake while he's stretching are briefly stunned, making them easier to hit with his buns."
			}
		]
	}

	static StayLimberDude = {
		displayName: "Stay Limber, Dude",
		ids: ["perk_jake_bouncyhouse"],
		characterSpecific: true,
		category: "CharacterSpecific",
		levels: [
			{
				slug: "perk_jake_bouncyhouse",
				description: "Jake's House ability bounces back into the air after hitting the ground."
			}
		]
	}

	static SecondWindBeneathYourWings = {
		displayName: "Second Wind Beneath Your Wings",
		ids: ["perk_general_refreshingknockout"],
		characterSpecific: false,
		category: "Offense",
		levels: [
			{
				slug: "perk_general_refreshingknockout",
				description: "Your team refreshes air special attacksundefined after ringing out an enemy."
			}
		]
	}

	static WildcatBrawler = {
		displayName: "Wildcat Brawler",
		ids: ["perk_general_groundmeleedamageboost_small", "perk_general_groundmeleedamageboost_medium", "perk_general_groundmeleedamageboost_large"],
		characterSpecific: false,
		category: "Offense",
		levels: [
			{
				slug: "perk_general_groundmeleedamageboost_small",
				description: "Your team deals 5% increased damageundefined with melee attacks on the ground."
			},
			{
				slug: "perk_general_groundmeleedamageboost_medium",
				description: "10% increased damage to melee attacks on the ground"
			},
			{
				slug: "perk_general_groundmeleedamageboost_large",
				description: "15% increased damage to melee attacks on the ground"
			}
		]
	}

	static ClearTheAir = {
		displayName: "Clear the Air",
		ids: ["perk_general_dodgereflect"],
		characterSpecific: false,
		category: "Defense",
		levels: [
			{
				slug: "perk_general_dodgereflect",
				description: "Your team destroys enemy projectilesundefined after successfully neutral dodging the projectile."
			}
		]
	}

	static SniperPunch = {
		displayName: "Sniper Punch",
		ids: ["perk_superman_sniperpunch"],
		characterSpecific: true,
		category: "CharacterSpecific",
		levels: [
			{
				slug: "perk_superman_sniperpunch",
				description: "Superman's aim punch range is extended. The damage and knockback from the aim punch are increased at long distances but decrease"
			}
		]
	}

	static BreakTheIce = {
		displayName: "Break The Ice",
		ids: ["perk_superman_icebreaker"],
		characterSpecific: true,
		category: "CharacterSpecific",
		levels: [
			{
				slug: "perk_superman_icebreaker",
				description: "Superman deals additional damage to fighters debuffed by Ice. The additional damage scales with stacks of Ice."
			}
		]
	}

	static FlamingReentry = {
		displayName: "Flaming Re-Entry",
		ids: ["perk_superman_fireslam"],
		characterSpecific: true,
		category: "CharacterSpecific",
		levels: [
			{
				slug: "perk_superman_fireslam",
				description: "The landing from Superman's leap attack ignites enemies and leaves a firewall on the ground."
			}
		]
	}

	static PercussivePunchPower = {
		displayName: "Percussive Punch Power",
		ids: ["perk_general_horizontalknockbackboost"],
		characterSpecific: false,
		category: "Offense",
		levels: [
			{
				slug: "perk_general_horizontalknockbackboost",
				description: "Your team deals 5% increased damageundefined with attacks that knock back enemies horizontally."
			}
		]
	}

	static TripleJump = {
		displayName: "Triple Jump",
		ids: ["perk_general_jumpcount"],
		characterSpecific: false,
		category: "Utility",
		levels: [
			{
				slug: "perk_general_jumpcount",
				description: "Your team receives an extra jump after hitting an enemyundefined while in air."
			}
		]
	}

	static GravityManipulation = {
		displayName: "Gravity Manipulation",
		ids: ["perk_general_fastfall_small", "perk_general_fastfall_medium", "perk_general_fastfall_large"],
		characterSpecific: false,
		category: "Utility",
		levels: [
			{
				slug: "perk_general_fastfall_small",
				description: "Your team receives 10% increased fast fall speed.undefined"
			},
			{
				slug: "perk_general_fastfall_medium",
				description: "15% increased fast fall speed"
			},
			{
				slug: "perk_general_fastfall_large",
				description: "25% increased fast fall speed"
			}
		]
	}

	static CookieCatPower = {
		displayName: "Cookie Cat Power!",
		ids: ["perk_general_aircontrol_medium", "perk_general_aircontrol_large"],
		characterSpecific: false,
		category: "Utility",
		levels: [
			{
				slug: "perk_general_aircontrol_medium",
				description: "50% increase in air control"
			},
			{
				slug: "perk_general_aircontrol_large",
				description: "100% increase in air control"
			}
		]
	}

	static AerialAcrobat = {
		displayName: "Aerial Acrobat",
		ids: ["perk_general_aircontrol_small"],
		characterSpecific: false,
		category: "Utility",
		levels: [
			{
				slug: "perk_general_aircontrol_small",
				description: "Your team receives 10% increased air acceleration.undefined"
			}
		]
	}

	static UpUpAndAslay = {
		displayName: "Up, Up, and A-Slay",
		ids: ["perk_general_verticalknockbackboost"],
		characterSpecific: false,
		category: "Offense",
		levels: [
			{
				slug: "perk_general_verticalknockbackboost",
				description: "Your team deals 5% increased damageundefined with attacks that knock back enemies upward."
			}
		]
	}

	static SlipperyWhenFeint = {
		displayName: "Slippery When Feint",
		ids: ["perk_general_evadedistanceonhitcancel"],
		characterSpecific: false,
		category: "Offense",
		levels: [
			{
				slug: "perk_general_evadedistanceonhitcancel",
				description: "Your team receives 10% increased dodge distanceundefined when dodging out of an attack hit cancel."
			}
		]
	}

	static PrecisionGrapple = {
		displayName: "Precision Grapple",
		ids: ["perk_batman_heavygrapple"],
		characterSpecific: true,
		category: "CharacterSpecific",
		levels: [
			{
				slug: "perk_batman_heavygrapple",
				description: "Batman's grappling hook emits a powerful blast when Batman arrives at his destination. However, he deals less damage and knockba"
			}
		]
	}

	static Bouncerang = {
		displayName: "Bouncerang",
		ids: ["perk_batman_bouncerang"],
		characterSpecific: true,
		category: "CharacterSpecific",
		levels: [
			{
				slug: "perk_batman_bouncerang",
				description: "Hitting an enemy with the Batarang while it is returning to Batman will apply maximum stacks of weakened."
			}
		]
	}

	static ThatsNotAllFolks = {
		displayName: "That's (Not) All, Folks!",
		ids: ["perk_general_knockoutbounce"],
		characterSpecific: false,
		category: "Offense",
		levels: [
			{
				slug: "perk_general_knockoutbounce",
				description: "Ringing out enemies while near the blast zone pushes the attacker back towards the center of the map.undefined"
			}
		]
	}

	static HitEmWhileTheyreDown = {
		displayName: "Hit 'Em While They're Down",
		ids: ["perk_general_damageboostondebuffhit"],
		characterSpecific: false,
		category: "Offense",
		levels: [
			{
				slug: "perk_general_damageboostondebuffhit",
				description: "Your team deals 5% increased damageundefined when hitting debuffed enemies."
			}
		]
	}

	static ChronosConnection = {
		displayName: "Chronos Connection",
		ids: ["perk_general_abilitycooldownreduction_medium", "perk_general_abilitycooldownreduction_large"],
		characterSpecific: false,
		category: "Utility",
		levels: [
			{
				slug: "perk_general_abilitycooldownreduction_medium",
				description: "20% reduced ability cooldowns"
			},
			{
				slug: "perk_general_abilitycooldownreduction_large",
				description: "30% reduced ability cooldowns"
			}
		]
	}

	static ShieldOfAthena = {
		displayName: "Shield of Athena",
		ids: ["perk_wonderwoman_projectileblock"],
		characterSpecific: true,
		category: "CharacterSpecific",
		levels: [
			{
				slug: "perk_wonderwoman_projectileblock",
				description: "Dodging creates a barrier that blocks enemy projectiles. The barrier goes on cooldown after a successful block. "
			}
		]
	}

	static WhipOfHephaestus = {
		displayName: "Whip of Hephaestus",
		ids: ["perk_wonderwoman_lassotipper"],
		characterSpecific: true,
		category: "CharacterSpecific",
		levels: [
			{
				slug: "perk_wonderwoman_lassotipper",
				description: "The tip of Wonder Woman's lasso has a powerful knockback sweetspot."
			}
		]
	}

	static GrappleOfHermes = {
		displayName: "Grapple of Hermes",
		ids: ["perk_wonderwoman_lassograpple"],
		characterSpecific: true,
		category: "CharacterSpecific",
		levels: [
			{
				slug: "perk_wonderwoman_lassograpple",
				description: "Wonder Woman's lasso will grapple lightning out of the air and pull her to its location."
			}
		]
	}

	static BackToBack = {
		displayName: "Back To Back",
		ids: ["perk_general_backtoback"],
		characterSpecific: false,
		category: "Defense",
		levels: [
			{
				slug: "perk_general_backtoback",
				description: "Your team receives 6% reduced damageundefined when near an ally."
			}
		]
	}

	static StrongerThanEver = {
		displayName: "Stronger Than Ever",
		ids: ["perk_general_armorondeath"],
		characterSpecific: false,
		category: "Defense",
		levels: [
			{
				slug: "perk_general_armorondeath",
				description: "Your team receives armor for 5 secondsundefined after respawning."
			}
		]
	}

	static ThePurestOfMotivations = {
		displayName: "The Purest of Motivations",
		ids: ["perk_general_inmemoriam"],
		characterSpecific: false,
		category: "Utility",
		levels: [
			{
				slug: "perk_general_inmemoriam",
				description: "Your team deals 15% increased damage for 10 secondsundefined after an ally is rung out."
			}
		]
	}

	static Coffeezilla = {
		displayName: "Coffeezilla",
		ids: ["perk_general_abilitycooldownreduction_small"],
		characterSpecific: false,
		category: "Utility",
		levels: [
			{
				slug: "perk_general_abilitycooldownreduction_small",
				description: "Your team receives 10% reduced ability cooldown duration.undefined"
			}
		]
	}

	static AirMaster = {
		displayName: "Air Master",
		ids: ["perk_general_airmeleedamageboost_medium", "perk_general_airmeleedamageboost_large"],
		characterSpecific: false,
		category: "Offense",
		levels: [
			{
				slug: "perk_general_airmeleedamageboost_medium",
				description: "10% increased damage to melee attacks in the air"
			},
			{
				slug: "perk_general_airmeleedamageboost_large",
				description: "15% increased damage to melee attacks in the air"
			}
		]
	}

	static KryptonianSkin = {
		displayName: "Kryptonian Skin",
		ids: ["perk_general_damagereduction_small", "perk_general_damagereduction_medium", "perk_general_damagereduction_large"],
		characterSpecific: false,
		category: "Defense",
		levels: [
			{
				slug: "perk_general_damagereduction_small",
				description: "Your team receives 4% reduced incoming damage.undefined"
			},
			{
				slug: "perk_general_damagereduction_medium",
				description: "Take 10% reduced damage"
			},
			{
				slug: "perk_general_damagereduction_large",
				description: "Take 15% reduced damage"
			}
		]
	}

	static HangryMan = {
		displayName: "Hangry Man",
		ids: ["perk_shaggy_extrahungry"],
		characterSpecific: true,
		category: "CharacterSpecific",
		levels: [
			{
				slug: "perk_shaggy_extrahungry",
				description: "If Shaggy has a sandwich equipped, he can quickly charge rage at the cost of eating his sandwich."
			}
		]
	}

	static OneLastZoinks = {
		displayName: "One Last Zoinks",
		ids: ["perk_shaggy_dyingrage"],
		characterSpecific: true,
		category: "CharacterSpecific",
		levels: [
			{
				slug: "perk_shaggy_dyingrage",
				description: "Shaggy gains rage automatically after passing 100 damage."
			}
		]
	}

	static Retaliationready = {
		displayName: "Retaliation-Ready",
		ids: ["perk_general_projectilegrayhealth"],
		characterSpecific: false,
		category: "Utility",
		levels: [
			{
				slug: "perk_general_projectilegrayhealth",
				description: "Your team grants allies 3 gray health for 3 secondsundefined after knocking back enemies with projectiles."
			}
		]
	}

	static LumpySpacePunch = {
		displayName: "Lumpy Space Punch",
		ids: ["perk_general_airmeleedamageboost_small", "perk_general_airmeleeknockbackboost_small"],
		characterSpecific: false,
		category: "Offense",
		levels: [
			{
				slug: "perk_general_airmeleedamageboost_small",
				description: "Your team deals 5% increased damageundefined with melee attacks in the air."
			},
			{
				slug: "perk_general_airmeleeknockbackboost_small",
				description: "Your team gains 5% increased knockback for melee attacks in the air."
			}
		]
	}

	static LastStand = {
		displayName: "Last Stand",
		ids: ["perk_general_laststand"],
		characterSpecific: false,
		category: "Utility",
		levels: [
			{
				slug: "perk_general_laststand",
				description: "Your team deals 10% increased damageundefined after reaching 100 damage."
			}
		]
	}

	static SnowballEffect = {
		displayName: "Snowball Effect",
		ids: ["perk_general_culltheweak"],
		characterSpecific: false,
		category: "Offense",
		levels: [
			{
				slug: "perk_general_culltheweak",
				description: "Your team deals 7% increased damageundefined against the fighter with the highest damage."
			}
		]
	}

	static IllTakeThat = {
		displayName: "I'll Take That",
		ids: ["perk_general_abilityrefundondebuffhit"],
		characterSpecific: false,
		category: "Offense",
		levels: [
			{
				slug: "perk_general_abilityrefundondebuffhit",
				description: "Your team receives a 0.5 second refund on ability cooldownsundefined after hitting debuffed enemies."
			}
		]
	}

	static Wounded = {
		displayName: "Wounded",
		ids: ["perk_arya_wounded"],
		characterSpecific: true,
		category: "CharacterSpecific",
		levels: [
			{
				slug: "perk_arya_wounded",
				description: "Enemies hit by Arya's thrown knife will gain stacks of stun debuff when knocked back. Arya's ally knocking back the enemy will a"
			}
		]
	}

	static Backstab = {
		displayName: "Backstab",
		ids: ["perk_general_backstab"],
		characterSpecific: false,
		category: "Offense",
		levels: [
			{
				slug: "perk_general_backstab",
				description: "TEAM deals 5% increased damage and knockback to enemies when you melee them in the back."
			}
		]
	}

	static Inevitable = {
		displayName: "Inevitable",
		ids: ["perk_general_inevitable"],
		characterSpecific: false,
		category: "Utility",
		levels: [
			{
				slug: "perk_general_inevitable",
				description: "TEAM gains attacks that always break armor if your victim has at least 125% damage."
			}
		]
	}

	static Aggro = {
		displayName: "Aggro",
		ids: ["perk_general_aggro"],
		characterSpecific: false,
		category: "Offense",
		levels: [
			{
				slug: "perk_general_aggro",
				description: "Start with reduced damage and knockback (80%). Increase your multiplier by repeatedly hitting enemies with melee attacks (max of"
			}
		]
	}

	static BombDownSpike = {
		displayName: "Bomb Down Spike",
		ids: ["perk_batman_bombdownspike"],
		characterSpecific: true,
		category: "CharacterSpecific",
		levels: [
			{
				slug: "perk_batman_bombdownspike",
				description: "Batman's bomb knocks enemies downward instead of upward"
			}
		]
	}

	static Chimney = {
		displayName: "Chimney",
		ids: ["perk_batman_chimney"],
		characterSpecific: true,
		category: "CharacterSpecific",
		levels: [
			{
				slug: "perk_batman_chimney",
				description: "Increases the vertical size of Batman's smoke bomb but decrease the horizontal size."
			}
		]
	}

	static IncreasedBatarangControl = {
		displayName: "Increased Batarang Control",
		ids: ["perk_batman_increasedbatarangcontrol"],
		characterSpecific: true,
		category: "CharacterSpecific",
		levels: [
			{
				slug: "perk_batman_increasedbatarangcontrol",
				description: "Slow down batarang movement speed but increase damage and the duration it is out for"
			}
		]
	}

	static Revenge = {
		displayName: "Revenge",
		ids: ["perk_general_revenge"],
		characterSpecific: false,
		category: "Utility",
		levels: [
			{
				slug: "perk_general_revenge",
				description: "After being knocked back, quickly hit an enemy to regain some of the damage you lost."
			}
		]
	}

	static Escapist = {
		displayName: "Escapist",
		ids: ["perk_bugsbunny_escapist"],
		characterSpecific: true,
		category: "CharacterSpecific",
		levels: [
			{
				slug: "perk_bugsbunny_escapist",
				description: "Upon leaving a tunnel, Bugs Bunny and his allies recieve a large push upward"
			}
		]
	}

	static HeavyMetal = {
		displayName: "Heavy Metal",
		ids: ["perk_bugsbunny_safey"],
		characterSpecific: true,
		category: "CharacterSpecific",
		levels: [
			{
				slug: "perk_bugsbunny_safey",
				description: "Enemies can't launch allied safes into allies. However, enemies deal 150% damage to safes."
			}
		]
	}

	static RightBackAtYou = {
		displayName: "Right Back At You",
		ids: ["perk_C015_tornadoreflect"],
		characterSpecific: true,
		category: "CharacterSpecific",
		levels: [
			{
				slug: "perk_C015_tornadoreflect",
				description: "Taz's tornado and the buff it gives his allies will reflect incoming projectiles, but the tornado moves slower."
			}
		]
	}

	static AllyBarrierGrayHealth = {
		displayName: "Ally Barrier Gray Health",
		ids: ["perk_c017_allybarriergrayhealth"],
		characterSpecific: true,
		category: "CharacterSpecific",
		levels: [
			{
				slug: "perk_c017_allybarriergrayhealth",
				description: "Iron Giant's ally barrier no longer reflects damage. Instead, Iron Giant gains a portion of the damage blocked by the barrier as"
			}
		]
	}

	static BigBrother = {
		displayName: "Big Brother",
		ids: ["perk_creature_bigbrother"],
		characterSpecific: true,
		category: "CharacterSpecific",
		levels: [
			{
				slug: "perk_creature_bigbrother",
				description: "Warps creature to thethered ally. Also reduces cooldown on tether ability."
			}
		]
	}

	static WreckingBall = {
		displayName: "Wrecking Ball",
		ids: ["perk_creature_wreckingball"],
		characterSpecific: true,
		category: "CharacterSpecific",
		levels: [
			{
				slug: "perk_creature_wreckingball",
				description: "When reindog pulls tethered allies back to them, they hit enemies on their way back"
			}
		]
	}

	static ArmoredCharge = {
		displayName: "Armored Charge",
		ids: ["perk_general_armored_charge"],
		characterSpecific: false,
		category: "Defense",
		levels: [
			{
				slug: "perk_general_armored_charge",
				description: "Replace invincibility with armor on evades. Armor window is longer that invincibility window."
			}
		]
	}

	static ElvenReflexes = {
		displayName: "Elven Reflexes",
		ids: ["perk_general_catch"],
		characterSpecific: false,
		category: "Defense",
		levels: [
			{
				slug: "perk_general_catch",
				description: "Touch allies that are knocked back to stop their hitstun and slow them down, provided you aren't already stunned."
			}
		]
	}

	static BubbleBuddies = {
		displayName: "Bubble Buddies",
		ids: ["perk_general_hunkerdown"],
		characterSpecific: false,
		category: "Defense",
		levels: [
			{
				slug: "perk_general_hunkerdown",
				description: "YOU receive armor when your damage reaches 100%."
			}
		]
	}

	static GemSplosion = {
		displayName: "Gem 'Splosion",
		ids: ["perk_finn_gemboost"],
		characterSpecific: true,
		category: "CharacterSpecific",
		levels: [
			{
				slug: "perk_finn_gemboost",
				description: "Finn's gem will repeatedly send out a shockwave that hurts enemies, but it is more expensive. While holding the gem, use its neu"
			}
		]
	}

	static SlowItDown = {
		displayName: "Slow It Down",
		ids: ["perk_garnet_slow"],
		characterSpecific: true,
		category: "CharacterSpecific",
		levels: [
			{
				slug: "perk_garnet_slow",
				description: "Enemy Projectiles that pass into Garnet's sing radius with be slowed. Garnet can also melee projectiles to reflect them while sh"
			}
		]
	}

	static HitstunIncrease = {
		displayName: "Hitstun Increase",
		ids: ["perk_general_hitstunincrease_small", "perk_general_hitstunincrease_medium", "perk_general_hitstunincrease_large"],
		characterSpecific: false,
		category: "Offense",
		levels: [
			{
				slug: "perk_general_hitstunincrease_small",
				description: ""
			},
			{
				slug: "perk_general_hitstunincrease_medium",
				description: ""
			},
			{
				slug: "perk_general_hitstunincrease_large",
				description: ""
			}
		]
	}

	static FloatyBounce = {
		displayName: "Floaty Bounce",
		ids: ["perk_jake_floatybounce"],
		characterSpecific: true,
		category: "CharacterSpecific",
		levels: [
			{
				slug: "perk_jake_floatybounce",
				description: "Jake deals a float debuff on enemies when they bounce off him"
			}
		]
	}

	static SafetyNet = {
		displayName: "Safety Net",
		ids: ["perk_jake_safetynet"],
		characterSpecific: true,
		category: "CharacterSpecific",
		levels: [
			{
				slug: "perk_jake_safetynet",
				description: "When allies bounce off of Jake, they recieve Air Superiority and have their air abilities repeatedly refreshed. If they are in h"
			}
		]
	}

	static WeaponMaster = {
		displayName: "Weapon Master",
		ids: ["perk_jake_weaponmaster"],
		characterSpecific: true,
		category: "CharacterSpecific",
		levels: [
			{
				slug: "perk_jake_weaponmaster",
				description: "Switching to Jake's weapon arm gives him a damage boost for his next hit"
			}
		]
	}

	static DensityControl = {
		displayName: "Density Control",
		ids: ["perk_general_knockbackmitigation_medium", "perk_general_knockbackmitigation_large"],
		characterSpecific: false,
		category: "Defense",
		levels: [
			{
				slug: "perk_general_knockbackmitigation_medium",
				description: "Take 10% reduced knockback"
			},
			{
				slug: "perk_general_knockbackmitigation_large",
				description: "Take 15% reduced knockback"
			}
		]
	}

	static LayOffTheScoobySnax = {
		displayName: "Lay off the Scooby Snax",
		ids: ["perk_general_knockbackmitigation_small"],
		characterSpecific: false,
		category: "Defense",
		levels: [
			{
				slug: "perk_general_knockbackmitigation_small",
				description: "TEAM gains +5% reduced knockback."
			}
		]
	}

	static PowairPunch = {
		displayName: "Pow-Air Punch",
		ids: ["perk_general_airmeleeknockbackboost_medium", "perk_general_airmeleeknockbackboost_large"],
		characterSpecific: false,
		category: "Offense",
		levels: [
			{
				slug: "perk_general_airmeleeknockbackboost_medium",
				description: "Deal 10% increased knockback for melee attacks in the air"
			},
			{
				slug: "perk_general_airmeleeknockbackboost_large",
				description: "Deal 15% increased knockback for melee attacks in the air"
			}
		]
	}

	static TactileTelekinesis = {
		displayName: "Tactile Telekinesis",
		ids: ["perk_general_groundmeleeknockbackboost_small", "perk_general_groundmeleeknockbackboost_medium", "perk_general_groundmeleeknockbackboost_large"],
		characterSpecific: false,
		category: "Offense",
		levels: [
			{
				slug: "perk_general_groundmeleeknockbackboost_small",
				description: "Your team gains 5% increased knockback for melee attacks on the ground."
			},
			{
				slug: "perk_general_groundmeleeknockbackboost_medium",
				description: "Deal 10% increased knockback for melee attacks on the ground"
			},
			{
				slug: "perk_general_groundmeleeknockbackboost_large",
				description: "Deal 15% increased knockback for melee attacks on the ground"
			}
		]
	}

	static MithrillTipped = {
		displayName: "Mithrill Tipped",
		ids: ["perk_general_projectileknockbackboost_medium", "perk_general_projectileknockbackboost_large"],
		characterSpecific: false,
		category: "Offense",
		levels: [
			{
				slug: "perk_general_projectileknockbackboost_medium",
				description: "Deal 10% increased knockback with projectiles"
			},
			{
				slug: "perk_general_projectileknockbackboost_large",
				description: "Deal 15% increased knockback with projectiles"
			}
		]
	}

	static BoxingGloveArrow = {
		displayName: "Boxing Glove Arrow",
		ids: ["perk_general_projectileknockbackboost_small"],
		characterSpecific: false,
		category: "Offense",
		levels: [
			{
				slug: "perk_general_projectileknockbackboost_small",
				description: "Your team gains 5% increased knockback with projectiles."
			}
		]
	}

	static ArmorMaster = {
		displayName: "Armor Master",
		ids: ["perk_general_armorboost_small", "perk_general_armorboost_medium", "perk_general_armorboost_large"],
		characterSpecific: false,
		category: "Defense",
		levels: [
			{
				slug: "perk_general_armorboost_small",
				description: "50% increase in armor strength."
			},
			{
				slug: "perk_general_armorboost_medium",
				description: "100% increase in armor strength"
			},
			{
				slug: "perk_general_armorboost_large",
				description: "100% increase in armor strength and 1 extra minimum hit"
			}
		]
	}

	static AttackRecoverySpeed = {
		displayName: "Attack Recovery Speed",
		ids: ["perk_general_attackrecoveryspeed_small", "perk_general_attackrecoveryspeed_medium", "perk_general_attackrecoveryspeed_large"],
		characterSpecific: false,
		category: "Offense",
		levels: [
			{
				slug: "perk_general_attackrecoveryspeed_small",
				description: "Recover from attacks 20% faster"
			},
			{
				slug: "perk_general_attackrecoveryspeed_medium",
				description: "Recover from attacks 30% faster"
			},
			{
				slug: "perk_general_attackrecoveryspeed_large",
				description: "Recover from attacks 40% faster"
			}
		]
	}

	static NinjaTraining = {
		displayName: "Ninja Training",
		ids: ["perk_general_sticktowall"],
		characterSpecific: false,
		category: "Utility",
		levels: [
			{
				slug: "perk_general_sticktowall",
				description: "Hold up while wall sliding to stay put"
			}
		]
	}

	static Regroup = {
		displayName: "Regroup",
		ids: ["perk_general_regroup"],
		characterSpecific: false,
		category: "Utility",
		levels: [
			{
				slug: "perk_general_regroup",
				description: "You and your allies gain a 7% movement speed increase when moving towards each other."
			}
		]
	}

	static KeepYourDistance = {
		displayName: "Keep Your Distance",
		ids: ["perk_general_clearheadspace"],
		characterSpecific: false,
		category: "Offense",
		levels: [
			{
				slug: "perk_general_clearheadspace",
				description: "Your team's projectiles deal 7% increased damageundefined when there are no other fighters near you."
			}
		]
	}

	static Abilityrefundonhit = {
		displayName: "Ability-Refund-On-Hit",
		ids: ["perk_general_abilityrefundonhit"],
		characterSpecific: false,
		category: "Utility",
		levels: [
			{
				slug: "perk_general_abilityrefundonhit",
				description: "Hitting an enemy with an ability refunds 50% of its cooldown"
			}
		]
	}

	static ScaredyCat = {
		displayName: "Scaredy Cat",
		ids: ["perk_shaggy_scaredycat"],
		characterSpecific: true,
		category: "CharacterSpecific",
		levels: [
			{
				slug: "perk_shaggy_scaredycat",
				description: "Gain a speed boost on successful evades"
			}
		]
	}

	static EmpathyDamage = {
		displayName: "Empathy Damage",
		ids: ["perk_general_empathydamage"],
		characterSpecific: false,
		category: "Defense",
		levels: [
			{
				slug: "perk_general_empathydamage",
				description: "Incoming damage on you ally is reduced by 20%, but that 20% gets transferred to you."
			}
		]
	}

	static BackToReality = {
		displayName: "Back To Reality",
		ids: ["perk_general_backtoreality"],
		characterSpecific: false,
		category: "Defense",
		levels: [
			{
				slug: "perk_general_backtoreality",
				description: "Hitstun from attacks will never exceed 1 second on your fighter."
			}
		]
	}

	static Healthy = {
		displayName: "Healthy",
		ids: ["perk_general_healthy"],
		characterSpecific: false,
		category: "Defense",
		levels: [
			{
				slug: "perk_general_healthy",
				description: "YOU gain 25 bonus health when you respawn."
			}
		]
	}

	static Geometric = {
		displayName: "Geometric",
		ids: ["perk_velma_geometric"],
		characterSpecific: true,
		category: "CharacterSpecific",
		levels: [
			{
				slug: "perk_velma_geometric",
				description: "Hitting pieces of evidence with Velma's beam will spawn an additional beam on the evidence. The evidence will auotmatically be p"
			}
		]
	}

	static GoodReception = {
		displayName: "Good Reception",
		ids: ["perk_velma_goodreception"],
		characterSpecific: true,
		category: "CharacterSpecific",
		levels: [
			{
				slug: "perk_velma_goodreception",
				description: "When Velma hits a fighter with the last hit of her megahone attack, she attaches a snark marker projectile to them if one does n"
			}
		]
	}

	static WonderWomanFastFallSlam = {
		displayName: "Wonder Woman Fast Fall Slam",
		ids: ["perk_wonderwoman_fastfallslam"],
		characterSpecific: true,
		category: "CharacterSpecific",
		levels: [
			{
				slug: "perk_wonderwoman_fastfallslam",
				description: "After fast falling into the ground, create a small explosion"
			}
		]
	}

	static PortalMeleeBuff = {
		displayName: "Portal Melee Buff",
		ids: ["perk_c020_signature_3"],
		characterSpecific: true,
		category: "CharacterSpecific",
		levels: [
			{
				slug: "perk_c020_signature_3",
				description: "After traveling through a portal, Rick's next attack applies a fire buff"
			}
		]
	}
}

module.exports = {
	Client,
	CharacterData,
	PerkData
}