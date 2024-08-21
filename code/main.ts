/* todo:
    * fix upgrades charging too much???
    * add a ranged player attack
    * inventory system???
*/
//@ts-ignore
import kaboom from "kaboom"
import "kaboom/global"

const SPEED = 320;
const ENEMY_SPEED = 160
const BULLET_SPEED = 800
let WeaponDamage = 1
let enemiesLeft = 0
let currentWave = 0
let baseEnemies = 5
let difficulty = 1.2
let weaponEquipped = "sword"

// initialize context
kaboom()

// load assets
loadSprite("bean", "sprites/bean.png")
loadSprite("enemy", "sprites/ben.png")
loadSprite("ranged", "sprites/ken.png")
loadSprite("friend", "sprites/zen.png")
loadSprite("npc", "sprites/glen.png")
loadSprite("sword", "sprites/sword.png")
loadSprite("heart", "sprites/heart.png")
loadSprite("grave", "sprites/gravestone.png")
loadSprite("background", "sprites/grass-background.png")
loadSprite("pineapple", "sprites/pineapple.png")
loadSprite("coin", "sprites/coin.png")
//loadSprite("upgrade", "sprites/jumpy.png")
loadSprite("sword-upgrade", "sprites/sword-upgrade.png")
loadSprite("next-wave-button", "sprites/next-wave.png")
loadSprite("heal", "sprites/heal.png")
loadSprite("hp_upgrade", "sprites/hp_upgrade.png")
loadSprite("bullet", "sprites/pixel-bullet.png")
loadSprite("shotgun", "sprites/shotgun.png")
loadSprite("shotgun-magazine-upgrade", "sprites/shotgun-bullet-upgrade.png")
loadSprite("shotgun-damage-upgrade", "sprites/shotgun-damage-upgrade.png")
// sounds
loadSound("oof", "sounds/oof.mp3")
loadSound("score", "sounds/score.mp3")
loadSound("slash", "sounds/slash.mp3")
loadSound("level-complete", "sounds/level-complete.mp3")
loadSound("new-wave", "sounds/whoosh-drum.mp3")
loadSound("level-failed", "sounds/level-failed.mp3")
loadSound("music", "sounds/background-music.mp3")
loadSound("gun-ready", "sounds/gun-cock.mp3")
loadSound("gun-reload", "sounds/reload.mp3")
loadSound("shotgun-fire", "sounds/shotgun-fire.mp3")
// font
loadFont("apl386", "fonts/apl386.ttf")
loadFont("lemon", "fonts/BubbleLemonDemoOutline.ttf")
loadFont("nabana", "fonts/nabana.ttf")
loadFont("cheri", "fonts/cheri.ttf")

// background
add([
	sprite("background"),
	pos(0, 0),
	fixed(),
	z(-999),
	"background",
])
const music = play("music", {
	loop: true,
	volume: 0.33
})
// score text
const score = add([
	text("Score: 0"),
	pos(12, 24 + height() / 25),
	color(rgb(0, 0, 0)),
	z(2),
	{value: 0}
])
const money = add([
	text("Money: 0"),
	pos(12, 24 + height() * 2 / 25),
	color(rgb(0, 0, 0)),
	z(2),
	{value: 0}
])
const enemiesLeftText = add([
	text("Enemies Left: 0"),
	pos(12, 24 + height() * 3 / 25),
	color(rgb(0, 0, 0)),
	z(2),
	{value: 0}
])
const waveText = add([
	text("Wave: 1"),
	pos(12, 24 + height() * 4 / 25),
	color(rgb(0, 0, 0)),
	z(2),
	{value: 1}
])
const shotgunText = add([
	text("Shells: 3/3"),
	pos(12, height() - 48),
	color(rgb(0,0,0)),
	z(2),
])
// dialogue stuff
function showDialogue(dialogues: { speaker: string; text: string }[], onComplete?: () => void) {
	let currentDialogueIndex = 0;

	const dialogueBox = add([
		rect(width() - 40, 100),
		pos(20, height() - 120),
		outline(2),
		color(0, 0, 0),
		opacity(0.8),
		z(3),
		"dialogueBox"
	]);

	const speakerText = add([
		text("", {size: 16, width: width() - 60}),
		pos(30, height() - 110),
		color(255, 255, 255),
		z(3),
		"speakerText"
	]);

	const dialogueText = add([
		text("", {size: 20, width: width() - 60}),
		pos(30, height() - 85),
		color(255, 255, 255),
		z(3),
		"dialogueText"
	]);

	function updateDialogue() {
		const currentDialogue = dialogues[currentDialogueIndex];
		speakerText.text = currentDialogue.speaker;
		dialogueText.text = currentDialogue.text;
	}

	const advanceDialogueListener = onKeyPress("space", () => {
		currentDialogueIndex++;
		if (currentDialogueIndex < dialogues.length) {
			updateDialogue();
		} else {
			destroy(dialogueBox);
			destroy(speakerText);
			destroy(dialogueText);
			if (onComplete) {
                advanceDialogueListener.cancel()
                onComplete();
            }
		}
	});

	updateDialogue();
}

// distance function ONLY FOR VEC2s!!!
function distance(pointA, pointB): number {
	return Math.sqrt(Math.pow(pointB.x - pointA.x, 2) + Math.pow(pointB.y - pointA.y, 2));
}
// vec2 rotate vector function
function rotateVector(vec, angle: number) {
	const cos = Math.cos(angle);
	const sin = Math.sin(angle);
	return vec2(
		vec.x * cos - vec.y * sin,
		vec.x * sin + vec.y * cos
	);
}
function vectorAngle(vec): number {
	return Math.atan2(vec.y, vec.x);
}
// finds the farthest spawn point from the player
function selectSpawn() {
	const playerPos = player.pos; // Get the player's current position
	const spawnRadius = 850; // Define a maximum radius for spawn points

	let spawnPoint = new Vec2();
	let maxDistance = 0;

	// Try several potential spawn points
	for (let i = 0; i < 10; i++) {
		const randomX = Math.random() * spawnRadius * 2 - spawnRadius;
		const randomY = Math.random() * spawnRadius * 2 - spawnRadius;
		const potentialPoint = vec2(randomX, randomY);

		const dist = distance(playerPos, potentialPoint);

		// Favor spawn points farther from the player
		if (dist > maxDistance) {
			maxDistance = dist;
			spawnPoint = potentialPoint;
		}
	}

    //return center().sub(0,200) // DEBUGGING ONLY
	return spawnPoint;
}

// function to load in a melee enemy
function addMeleeEnemy(enemyHealth: number = 1) {
	const enemy = add([
		sprite("enemy"),
		pos(selectSpawn()),
		area(),
		body(),
		health(enemyHealth),
		"enemy",
		"melee",
		{
			points: enemyHealth,
			alive: true
		}
	])

	enemy.on("death", () => {
		if (enemy.alive) {
			//debug.log("enemy died")
			enemy.alive = false
			destroy(enemy)
			enemyDeath(enemy.points, enemy.pos)
		}
	})
	enemy.onUpdate(() => {
		if (!player.exists()) return
		const dir = player.pos.sub(enemy.pos).unit()
		enemy.move(dir.scale(ENEMY_SPEED))
	})

}
// spawns ranged enemy
function addRangedEnemy(enemyHealth: number = 1) {
	// done
	const enemy = add([
		sprite("ranged"),
		pos(selectSpawn()),
		anchor("center"),
		area(),
		body(),
		// This enemy cycle between 3 states, and start from "idle" state
		state("move", ["idle", "attack", "move", "dead"]),
		"enemy",
		"ranged",
		health(enemyHealth),
		{points: enemyHealth * 3}
	])
	// @ts-ignore
	// when idle, wait a bit then do the attack
	enemy.onStateEnter("idle", async () => {
		await wait(0.5)
		enemy.enterState("attack")
	})
	// When we enter "attack" state, we fire a bullet, and enter "move" state after 1 sec
	// @ts-ignore
	enemy.onStateEnter("attack", async () => {
		// Don't do anything if player doesn't exist anymore
		if (player.exists() && enemy.exists()) {
			const dir = player.pos.sub(enemy.pos).unit()
			add([
				pos(enemy.pos),
				move(dir, BULLET_SPEED),
				rect(12, 12),
				area(),
				offscreen({destroy: true}),
				anchor("center"),
				color(BLUE),
				"bullet",
			])
		}
		await wait(1)
		enemy.enterState("move")
	})

	// @ts-ignore
	// move for two seconds, then idle
	enemy.onStateEnter("move", async () => {
		await wait(2)
		enemy.enterState("idle")
	})

	// Like .onUpdate() which runs every frame, but only runs when the current state is "move"
	// Here we move towards the player every frame if the current state is "move"
	enemy.onStateUpdate("move", () => {
		if (!player.exists()) return
		const dir = player.pos.sub(enemy.pos).unit()
		enemy.move(dir.scale(ENEMY_SPEED))
	})
	// on in 10 chance to drop a pineapple on enemy death (for fun)
	enemy.on("death", () => {
		enemy.enterState("dead")
		enemyDeath(enemy.points, enemy.pos)
		if (Math.random() < 0.1) {
			add([
				sprite("pineapple"),
				pos(enemy.pos),
				scale(0.75),
				body(),
				area(),
				"pineapple",
			])
		}
		destroy(enemy)
	})

}

function addEnemy(enemyHealth = 1, type = 0) {
	// type 0 is the default enemy, just melee
	// type 1 is a ranged enemy
	if (type == 1) {
		// melee enemy
		addRangedEnemy(enemyHealth)
	} else {
		addMeleeEnemy(enemyHealth)
	}
}

// add player to screen
const player = add([
	// list of components
	sprite("bean"),
	pos(width() / 2, height() / 2),
	area(),
	body(),
	health(5),
	anchor("center"),
	"player",
	{alive: true}
])

player.setMaxHP(5)

// pineapple heals you
player.onCollide("pineapple", (pineapple) => {
	destroy(pineapple)
	player.heal()
	hearts()
	burp()
})
// healing potion heals you, but more hearts are healed (3)
player.onCollide("heal", (potion) => {
    destroy(potion)
    player.heal(3)
    hearts()
    burp()
})
// when player touches coin, collect it
player.onCollide("coin", (coin) => {
	destroy(coin)
	play("score")
})
onDestroy("coin", (coin) => {
	updateMoney(coin.value)
})

// player must stay on screen
onUpdate(() => {
	if (player.pos.x < 0) {
		player.pos.x = 0;
	}
	if (player.pos.x > width()) {
		player.pos.x = width();
	}
	if (player.pos.y < 0) {
		player.pos.y = 0;
	}
	if (player.pos.y > height()) {
		player.pos.y = height();
	}
});
// when player takes a bullet, they get hurt
player.onCollide("bullet", (bullet) => {
	destroy(bullet)
	player.hurt(1)
})
// player death event
player.on("death", () => {
	if (player.alive) {
		music.stop()
		player.alive = false
		addKaboom(player.pos)
		add([
			sprite("grave"),
			pos(player.pos),
			scale(0.5),
            area(),
            body(),
			anchor("center")
		])
		destroy(player)
		destroy(sword)
		play("level-failed")
		add([
			text("game over", {
				font: "cheri",
				size: height() / 25,
				lineSpacing: 80,
			}),
			pos(center()),
			anchor("center"),
			color(rgb(0, 0, 0)),
			scale(3),
		])
		add([
			text("press space to restart", {
				font: "cheri",
				size: height() / 25,
				lineSpacing: 80,
			}),
			pos(center().sub(0, -100)),
			anchor("center"),
			color(rgb(0, 0, 0)),
			scale(2),
		])
		onKeyPress("space", () => {
			window.location.reload()
		})
	}
})

onCollide("player", "melee", () => {
	player.hurt(1)
})
onCollide("shell", "enemy", (shell, enemy) => {
	destroy(shell)
	enemy.hurt(shell.damage)
})
const sword = add([
	sprite("sword"),
	pos(player.pos.x + (width() / 25), player.pos.y),
	area(),
	anchor("center"),
	scale(0.2),
	rotate(0),
	opacity(1),
	"sword",
])
const shotgun = add([
	sprite("shotgun"),
	pos(player.pos.x + (width() / 25), player.pos.y),
	area(),
	scale(0.25),
	anchor("center"),
	rotate(90),
	opacity(0),
	{
		reloading: false,
		reloadTime: 3,
		shells: 3,
		magazine: 3,
		damage: 1,
	},
	"shotgun",
])
onKeyPress("r", () => {
	if (shotgun.shells < shotgun.magazine && !shotgun.reloading) {
		shotgun.reloading = true
		play("gun-reload")
		wait(shotgun.reloadTime, () => {
			play("gun-ready")
			shotgun.shells = shotgun.magazine
			shotgun.reloading = false
			updateBulletsText()
		})
	}
})
onKeyPress("tab", () => {
	if (weaponEquipped == "sword") {
		weaponEquipped = "shotgun"
		sword.opacity = 0
		shotgun.opacity = 1
	} else {
		weaponEquipped = "sword"
		sword.opacity = 1
		shotgun.opacity = 0
	}
})
let weaponDistance = width() / 25
// rotate the sword to face mouse
onUpdate("player", () => {
	let weaponPos = new Vec2()
	let weaponAngle = Math.atan2(player.pos.y - mousePos().y, player.pos.x - mousePos().x) - Math.PI
	weaponPos.x = weaponDistance * Math.cos(weaponAngle) + player.pos.x
	weaponPos.y = weaponDistance * Math.sin(weaponAngle) + player.pos.y
	sword.pos = weaponPos
	sword.rotateTo(weaponAngle * 180 / Math.PI)
	shotgun.pos = weaponPos
	shotgun.rotateTo(weaponAngle * 180 / Math.PI)
	//debug.log(weaponAngle)
})

function updateBulletsText() {
	shotgunText.text = `Shells: ${shotgun.shells}/${shotgun.magazine}`
}
onMousePress(() => {
	// if player clicked last frame, hurt the enemy
	//weaponDistance = width()/17.5
	if (player.exists() && weaponEquipped == "sword") {
		play("slash")
		// tween the sword movement
		tween(width() / 25, width() / 17.5, 1, (p) => weaponDistance = p, easings.easeOutBounce)
		wait(0.1, () => {
			tween(width() / 17.5, width() / 25, 1, (p) => weaponDistance = p, easings.easeOutBounce)
		})
	} else if (player.exists() && weaponEquipped == "shotgun") {
		if (shotgun.shells > 0 && !shotgun.reloading) {
			play("shotgun-fire")
			shotgun.shells -= 1
			for (let i = 0; i < 5; i++) {
				let dir = mousePos().sub(player.pos).unit()
				dir = rotateVector(dir, Math.random() * 0.5 - 0.25)
				add([
					sprite("bullet"),
					scale(0.1),
					pos(player.pos),
					move(dir, BULLET_SPEED),
					area(),
					offscreen({destroy: true}),
					rotate(vectorAngle(dir) * 180 / Math.PI),
					lifespan(1, {fade: 0.75}),
					anchor("center"),
					{damage: shotgun.damage},
					"shell",
				])
			}
			updateBulletsText()
		}
	}
})
onCollide("shell", "glen", (shell) => {
	destroy(shell)
	showDialogue([{speaker: "Glen", text: "Hey, stop that!"}])
})
onCollide("shell", "shopkeeper", (shell) => {
	destroy(shell)
	showDialogue([{speaker: "Zen - Shopkeeper", text: "Bro, do you think that's going to make me lower my prices? Just don't shoot me again...ouch..."}], () => {
		// raise prices :)
		swordUpgradeCost *= 1.1
		maxHealthUpgradeCost *= 1.1
		healPotionCost *= 1.1
		shotgunDamageUpgradeCost *= 1.1
		shotgunMagazineUpgradeCost *= 1.1
	})
})
onCollideUpdate("sword", "enemy", (weapon, enemy) => {
	// if player clicked last frame, hurt the enemy
	if (isMousePressed() && player.exists()) {
		enemy.hurt(WeaponDamage)
	}
})

// player control stuff
onKeyDown("d", () => {
	player.move(SPEED, 0)
})
onKeyDown("a", () => {
	player.move(-SPEED, 0)
})
onKeyDown("w", () => {
	player.move(0, -SPEED)
})
onKeyDown("s", () => {
	player.move(0, SPEED)
})

// deal with the heart bar
function hearts() {
	for (let i = 0; i < player.hp(); i++) {
		add([
			sprite("heart"),
			pos(10 + i * 65, 10),
			"heart",
			fixed(),
			z(2),
		])
	}
}
hearts()

function spawnHeal(position) {
	add([
		sprite("heal"),
		pos(position),
		area(),
		body(),
		scale(0.1),
		"heal",
		"intermission",
	])
}
// deal with the score
function updateScore(amount: number) {
	score.value += amount
	score.text = "Score:" + score.value
}

// money update

function updateMoney(amount: number) {
	money.value += amount
	money.text = "Money:" + money.value
}

// deal with the enemy death
let spawnedWave = false // prevent goofy async stuff

function enemyDeath(points: number, position) {
	// todo: make more valuable coins
	let coins = Math.floor(Math.random() * points) + 1
	for (let i = 0; i < coins; i++) {
		add([
			sprite("coin"),
			pos(position),
			area({
				collisionIgnore: ["coin", "enemy", "bullet", "sword", "pineapple"]
			}),
			z(-1),
			body(),
			scale(0.5),
			"coin",
			{value: 1},
		])
	}
	enemiesLeft -= 1
	enemiesLeftText.text = "Enemies Left: " + enemiesLeft
	updateScore(points)
	play("score")
	if (enemiesLeft == 0 && !spawnedWave) {
		debug.log("wave completed!")
		spawnedWave = true
		waveDone()
	}
}

player.on("hurt", () => {
	play("oof")
	//debug.log("health: " + player.hp())
	destroyAll("heart")
	hearts()
})

// cost for purchasing upgrades
let swordUpgradeCost = 20
let healPotionCost = 10
let maxHealthUpgradeCost = 75
let shotgunDamageUpgradeCost = 50
let shotgunMagazineUpgradeCost = 100
let touchingSwordUpgrade = false
let touchingHealthUpgrade = false
let touchingHeal = false
let touchingShotgunDamageUpgrade = false
let touchingShotgunMagazineUpgrade = false
// positions for upgrades
let swordUpgradePos = center().sub(75, 50)
let healPotionPos = center().sub(-150, 50)
let hpUpgradePos = center().sub(-75, 50)
let shotgunDamageUpgradePos = center().sub(200, 50)
let shotgunMagazineUpgradePos = center().sub(300, 50)
const swordUpgradePriceText = add([
	text(swordUpgradeCost + " coins"),
	pos(center()),
	opacity(0),
	anchor("center"),
	color(rgb(0, 0, 0)),
])
const healthUpgradePriceText = add([
	text(maxHealthUpgradeCost + " coins"),
	pos(center()),
	opacity(0),
	anchor("center"),
	color(rgb(0, 0, 0)),
])
const healPotionPriceText =  add([
	text(healPotionCost + " coins"),
	pos(center()),
	opacity(0),
	anchor("center"),
	color(rgb(0, 0, 0)),
])
const shotgunDamageUpgradePriceText = add([
	text(shotgunDamageUpgradeCost + " coins"),
	pos(center()),
	opacity(0),
	anchor("center"),
	color(rgb(0, 0, 0)),
])
const shotgunMagazineUpgradePriceText = add([
	text(shotgunMagazineUpgradeCost + " coins"),
	pos(center()),
	opacity(0),
	anchor("center"),
	color(rgb(0, 0, 0)),
])
// collision handlers for upgrade price text
onCollide("player", "sword_upgrade", (player, upgrade) => {
	touchingSwordUpgrade = true
	swordUpgradePriceText.opacity = 1
	swordUpgradePriceText.pos = upgrade.pos.sub(0, -50)
	swordUpgradePriceText.text = swordUpgradeCost + " coins"
})
onCollideEnd("player", "sword_upgrade", () => {
	touchingSwordUpgrade = false
	swordUpgradePriceText.opacity = 0
})
onCollide("player", "health_upgrade", (player, upgrade) => {
	touchingHealthUpgrade = true
	healthUpgradePriceText.opacity = 1
	healthUpgradePriceText.pos = upgrade.pos.sub(0, -50)
	healthUpgradePriceText.text = maxHealthUpgradeCost + " coins"
})
onCollideEnd("player", "health_upgrade", () => {
	touchingHealthUpgrade = false
	healthUpgradePriceText.opacity = 0
})
onCollide("player", "shotgun-damage-upgrade", (player, upgrade) => {
	touchingShotgunDamageUpgrade = true
	shotgunDamageUpgradePriceText.opacity = 1
	shotgunDamageUpgradePriceText.pos = upgrade.pos.sub(0, -50)
	shotgunDamageUpgradePriceText.text = shotgunDamageUpgradeCost + " coins"
})
onCollideEnd("player", "shotgun-damage-upgrade", () => {
	touchingShotgunDamageUpgrade = false
	shotgunDamageUpgradePriceText.opacity = 0
})
onCollide("player", "shotgun-magazine-upgrade", (player, upgrade) => {
	touchingShotgunMagazineUpgrade = true
	shotgunMagazineUpgradePriceText.opacity = 1
	shotgunMagazineUpgradePriceText.pos = upgrade.pos.sub(0, -50)
	shotgunMagazineUpgradePriceText.text = shotgunMagazineUpgradeCost + " coins"
})
onCollideEnd("player", "shotgun-magazine-upgrade", () => {
	touchingShotgunMagazineUpgrade = false
	shotgunMagazineUpgradePriceText.opacity = 0
})
onCollide("player", "heal_potion", (player, upgrade) => {
	touchingHeal = true
	healPotionPriceText.opacity = 1
	healPotionPriceText.pos = upgrade.pos.sub(0, -50)
	healPotionPriceText.text = healPotionCost + " coins"
})
onCollideEnd("player", "heal_potion", () => {
	touchingHeal = false
	healPotionPriceText.opacity = 0
})
function cleanupUpgrades() {
	destroyAll("upgrade")
}
onUpdate("sword_upgrade", (upgrade) => {
	upgrade.pos = swordUpgradePos
})
onUpdate("heal_potion", (upgrade) => {
	upgrade.pos = healPotionPos
})
onUpdate("health_upgrade", (upgrade) => {
	upgrade.pos = hpUpgradePos
})
onUpdate("shotgun-damage-upgrade", (upgrade) => {
	upgrade.pos = shotgunDamageUpgradePos
})
onUpdate("shotgun-bullet-upgrade", (upgrade) => {
	upgrade.pos = shotgunMagazineUpgradePos
})

function shopMenu() {
	touchingSwordUpgrade = false
    touchingHealthUpgrade = false
    touchingHeal = false
	// sword upgrade
	add([
		sprite("sword-upgrade"),
		pos(swordUpgradePos),
		scale(0.75),
		area(),
        body(),
		anchor("center"),
		"upgrade",
        "sword_upgrade",
		"intermission",
	])
	// healing potion
	add([
		sprite("heal"),
		pos(healPotionPos),
		scale(0.1),
		area(),
		body(),
		anchor("center"),
		"upgrade",
		"heal_potion",
		"intermission",
	])
	// hp upgrade
	add([
		sprite("hp_upgrade"),
		pos(hpUpgradePos),
		scale(0.75),
		area(),
		body(),
		anchor("center"),
		"upgrade",
		"health_upgrade",
		"intermission",
	])
	// shotgun damage increase
	add([
		sprite("shotgun-damage-upgrade"),
		pos(shotgunDamageUpgradePos),
		scale(0.75),
		area(),
		body(),
		anchor("center"),
		"upgrade",
		"shotgun-damage-upgrade",
		"intermission",
	])
	// shotgun magazine increase
	add([
		sprite("shotgun-magazine-upgrade"),
		pos(shotgunMagazineUpgradePos),
		scale(0.75),
		area(),
		body(),
		anchor("center"),
		"upgrade",
		"shotgun-magazine-upgrade",
		"intermission",
	])

	let sword_upgrade_dialogue = [
		{speaker: "Ren", text: "What is this?"},
		{
			speaker: "Zen - Shopkeeper",
			text: "It's ZenForged ZenBlade the one of the newest in sword technologies, perfected by my company ZenDustry™ Inc."
		},
		{speaker: "Ren", text: "I'll take the ZenBlade."},
		{speaker: "Zen - Shopkeeper", text: `That'll be ${swordUpgradeCost} coins.`},
		{speaker: "Ren", text: (money.value >= swordUpgradeCost * 2) ? "What a good price!" : "Man, that was a lot of money."},
		{speaker: "Zen - Shopkeeper", text: "Thank you for supporting local businesses."},
	]
	let health_upgrade_dialogue = [
		{speaker: "Ren", text: "What is this?"},
		{speaker: "Zen - Shopkeeper", text: "It's a health upgrade, it'll increase your maximum health by 1"},
		{speaker: "Ren", text: "I didn't even know that was possible!"},
		{speaker: "Zen - Shopkeeper", text: "It was possible due to recent ZenDustry™ Inc. advancements in health technology."},
		{speaker: "Zen - Shopkeeper", text: "But research isn't free, you know. My scientists have to eat, and so do I. It's not like food grows on trees."},
		{speaker: "Ren", text: "But food does grow on trees..."},
		{speaker: "Zen - Shopkeeper", text: "Bah, kids these days..."},
		{speaker: "Zen - Shopkeeper", text: `That'll be ${maxHealthUpgradeCost} coins.`},
		{speaker: "Ren", text: (money.value >= maxHealthUpgradeCost * 2) ? "That's a good price!" : "Oof, that was a lot of money. Now what am 𝑰 going to eat?"},
		{speaker: "Zen - Shopkeeper", text: "I hear that the orange enemies drop pineapples when they die. Maybe you could eat those."},
	]
	let heal_potion_dialogue = [
		{speaker: "Ren", text: "What is this?"},
		{speaker: "Zen - Shopkeeper", text: "It's a healing potion, it'll heal you for 3 hearts."},
		{speaker: "Ren", text: "I'll take one."},
		{speaker: "Zen - Shopkeeper", text: `Alright, that'll be ${healPotionCost} coins.`},
		{speaker: "Ren", text: (money.value >= healPotionCost * 2) ? "What an affordable price!" : "Why are these so expensive, It's almost like you're trying to make a profit."},
		{speaker: "Zen - Shopkeeper", text: "It's a free market."},
		{speaker: "Ren", text: "If it was a free market, couldn't you just give me the market for free? Besides, you're a monopoly. "},
		{speaker: "Zen - Shopkeeper", text: "Think of it like you're supporting a local business."},
		{speaker: "Ren", text: "I don't even know where we are. How can you be local?"},
		{speaker: "Ren", text: "Besides, where do you even go between waves?"},
	]
	let shotgun_damage_dialogue = [
		{speaker: "Ren", text: "My shotgun is too weak. It isn't damaging the enemies enough. "},
		{speaker: "Zen - Shopkeeper", text: `I'll can make your shotgun more powerful...`},
		{speaker: "Ren", text: "Alright, bet!"}, // slang for "I agree"
		{speaker: "Zen - Shopkeeper", text: `That'll be ${shotgunDamageUpgradeCost} coins`},
		{speaker: "Ren", text: (money.value >= shotgunDamageUpgradeCost * 2) ? "That's a decent price." : "That much? It's almost like you're hammering coins into my shotgun!"}
	]
	let shotgun_magazine_dialogue = [
		{speaker: "Ren", text: "I need more bullets in my shotgun. It's not enough. There's too many of those red frowning guys out there."},
		{speaker: "Zen - Shopkeeper", text: "I have just the solution for your problems. More bullets!!!"},
		{speaker: "Ren", text: "I love America!!! 🇺🇸🇺🇸🇺🇸🦅🦅🦅🔫🔫🔫"},
		{speaker: "Zen - Shopkeeper", text: `That'll be ${shotgunMagazineUpgradeCost} coins`},
		{speaker: "Ren", text: (money.value >= shotgunMagazineUpgradeCost * 2) ? "My constitutional rights are being excersized!" : "That's a lot of money. I could buy a lot of pineapples with that."}

	]
	// updates the variable parts of the dialogue
	function updateDialogue() {
		// if you already bought sword upgrade, reduce the dialogue to only essentials
		if (swordUpgradeCost != 20) {
			sword_upgrade_dialogue = [
				{speaker: "Ren", text: "Can you upgrade my sword again?"},
				{speaker: "Zen - Shopkeeper", text: `That'll be ${swordUpgradeCost} coins.`},
				{
					speaker: "Ren",
					text: (money.value >= swordUpgradeCost * 2) ? "What a good price!" : "Man, that was a lot of money."
				},
			]
		} else {
			sword_upgrade_dialogue[4] = {
				speaker: "Ren",
				text: (money.value >= swordUpgradeCost * 2) ? "What a good price!" : "Man, that was a lot of money."
			}
		}
		// if you already bought maxHealth upgrade, reduce the dialogue to only essentials
		if (maxHealthUpgradeCost != 50) {
			health_upgrade_dialogue = [
				{speaker: "Ren", text: "I'm not feeling strong enough yet...Upgrade me some more!"},
				{speaker: "Zen - Shopkeeper", text: `No problem, that'll be ${maxHealthUpgradeCost} coins.`},
				{
					speaker: "Ren",
					text: (money.value >= maxHealthUpgradeCost * 2) ? "That's a good price!" : "Why are scientists so expensive...Are they eating at Michelin-star restaurants?"
				},
			]
		} else {
			health_upgrade_dialogue[8] = {
				speaker: "Ren",
				text: (money.value >= maxHealthUpgradeCost * 2) ? "That's a good price!" : "Oof, that was a lot of money. Now what am 𝑰 going to eat?"
			}
		}
		// if you already bought health potion, change dialogue
		if (healPotionCost != 10) {
			heal_potion_dialogue = [
				{speaker: "Ren", text: "Give me some more of that red juice! It makes me feel amazing!"},
				{
					speaker: "Zen - Shopkeeper",
					text: `The customer is always right...That'll be ${healPotionCost} coins.`
				},
				{
					speaker: "Ren",
					text: (money.value >= healPotionCost * 2) ? "What an affordable price!" : "Why are these so expensive, It's almost like you're trying to make a profit."
				},
			]
		} else {
			heal_potion_dialogue[4] = {
				speaker: "Ren",
				text: (money.value >= healPotionCost * 2) ? "What an affordable price!" : "Why are these so expensive, It's almost like you're trying to make a profit."
			}
		}
		// if you already bought shotgun damage upgrade, change dialogue
		if (shotgunDamageUpgradeCost != 50) {
			shotgun_damage_dialogue = [
				{speaker: "Ren", text: "Give me more power!"},
				{speaker: "Zen - Shopkeeper", text: `Of course, for a price of ${shotgunDamageUpgradeCost} coins`},
				{speaker: "Ren", text: (money.value >= shotgunDamageUpgradeCost * 2) ? "That's a decent price." : "That much? It's almost like you're hammering coins into my shotgun!"}
			]
		} else {
			shotgun_damage_dialogue[4] = {speaker: "Ren", text: (money.value >= shotgunDamageUpgradeCost * 2) ? "That's a decent price." : "That much? It's almost like you're hammering coins into my shotgun!"}
		}
		// if you already bought shotgun magazine upgrade, change dialogue
		if (shotgunMagazineUpgradeCost != 100) {
			shotgun_magazine_dialogue = [
				{speaker: "Ren", text: "I need more bullets to fit in my shotgun!"},
				{speaker: "Zen - Shopkeeper", text: `I have just the solution for your problems. A larger magazine!!!`},
				{speaker: "Zen - Shopkeeper", text: `That'll be ${shotgunMagazineUpgradeCost} coins`},
				{speaker: "Ren", text: (money.value >= shotgunMagazineUpgradeCost * 2) ? "My constitutional rights are being excersized!🇺🇸🇺🇸🇺🇸🦅🦅🦅" : "That's a lot of money. I could buy a lot of pineapples with that."}
			]
		} else {
			shotgun_magazine_dialogue[4] = {speaker: "Ren", text: (money.value >= shotgunMagazineUpgradeCost * 2) ? "My constitutional rights are being excersized!🇺🇸🇺🇸🇺🇸🦅🦅🦅" : "That's a lot of money. I could buy a lot of pineapples with that."}
		}
	}



	function doUpgrade(upgrade: String) {
		updateDialogue()
        if (upgrade == "sword") {
            if (money.value >= swordUpgradeCost) {
                showDialogue(sword_upgrade_dialogue, () => {
                    WeaponDamage += 1
                    updateMoney(-swordUpgradeCost)
                    swordUpgradeCost *= 2
                    swordUpgradeCost = Math.floor(swordUpgradeCost)
                    cleanupUpgrades()
                })
            } else {
                showDialogue(
					[
						{speaker: "Zen - Shopkeeper", text: "You don't have enough money for that."},
						{speaker: "Ren", text: `I only need ${swordUpgradeCost - money.value} more coins!`}
					],
					() => {
                    	cleanupUpgrades()
                	}
				)
            }
        } else if (upgrade == "health") {
			if (money.value >= maxHealthUpgradeCost) {
				showDialogue(health_upgrade_dialogue, () => {
					player.setMaxHP(player.hp() + 1)
					updateMoney(-maxHealthUpgradeCost)
					maxHealthUpgradeCost *= 2.5
					maxHealthUpgradeCost = Math.floor(maxHealthUpgradeCost)
					cleanupUpgrades()
				})
			} else {
				showDialogue(
					[
						{speaker: "Zen - Shopkeeper", text: "You don't have enough money for that."},
						{speaker: "Ren", text: `I only need ${maxHealthUpgradeCost - money.value} more coins!`}
					],
					() => {
						cleanupUpgrades()
					}
				)
			}
        } else if (upgrade == "heal_potion") {
			if (money.value >= healPotionCost) {
				showDialogue(heal_potion_dialogue, () => {
					spawnHeal(center().sub(0, 100))
					updateMoney(-healPotionCost)
					healPotionCost *= 1.75
					healPotionCost = Math.floor(healPotionCost)
					cleanupUpgrades()
				})
			} else {
				showDialogue(
					[
						{speaker: "Zen - Shopkeeper", text: "You don't have enough money for that."},
						{speaker: "Ren", text: `I only need ${healPotionCost - money.value} more coins!`}
					],
					() => {
						cleanupUpgrades()
					}
				)
			}
        } else if (upgrade == "shotgun-damage") {
			if (money.value >= shotgunDamageUpgradeCost) {
				showDialogue(shotgun_damage_dialogue, () => {
					shotgun.damage += 1
					updateMoney(-shotgunDamageUpgradeCost)
					shotgunDamageUpgradeCost *= 2
					shotgunDamageUpgradeCost = Math.floor(shotgunDamageUpgradeCost)
					cleanupUpgrades()
				})
			} else {
				showDialogue(
					[
						{speaker: "Zen - Shopkeeper", text: "You don't have enough money for that."},
						{speaker: "Ren", text: `I only need ${shotgunDamageUpgradeCost - money.value} more coins!`}
					],
					() => {
						cleanupUpgrades()
					}
				)
			}
		} else if (upgrade == "shotgun-magazine") {
			if (money.value >= shotgunMagazineUpgradeCost) {
				showDialogue(shotgun_magazine_dialogue, () => {
					shotgun.magazine += 1
					updateMoney(-shotgunMagazineUpgradeCost)
					shotgunMagazineUpgradeCost *= 2
					shotgunMagazineUpgradeCost = Math.floor(shotgunMagazineUpgradeCost)
					cleanupUpgrades()
				})
			} else {
				showDialogue(
					[
						{speaker: "Zen - Shopkeeper", text: "You don't have enough money for that."},
						{speaker: "Ren", text: `I only need ${shotgunMagazineUpgradeCost - money.value} more coins!`}
					],
					() => {
						cleanupUpgrades()
					}
				)
			}
		} else {
            debug.log("something went wrong")
        }
	}
	const upgradeListener = onKeyPress("e", () => {
		upgradeListener.cancel()
		if (touchingSwordUpgrade) {
            doUpgrade("sword")
        } else if (touchingHealthUpgrade) {
            doUpgrade("health")
        } else if (touchingHeal) {
            doUpgrade("heal_potion")
        } else if (touchingShotgunDamageUpgrade) {
			doUpgrade("shotgun-damage")
		} else if (touchingShotgunMagazineUpgrade) {
			doUpgrade("shotgun-magazine")
		}
	})
}
let playerTouchingShop = false;
// shopkeeper contact listeners
onCollide("player", "shopkeeper", () => {
	playerTouchingShop = true
})
onCollideEnd("player", "shopkeeper", () => {
	playerTouchingShop = false
	shopListener.paused = false
})
const shopListener = onKeyPress("e", () => {
	if (playerTouchingShop) {
		shopListener.paused = true
		showDialogue(shop_dialogue, () => {
			shopMenu()
		})
	}
})
const shop_dialogue = [
	{ speaker: "Zen - Shopkeeper", text: "Hello traveler, would you like to sample some of my wonderful wares?" },
	{ speaker: "Ren", text: "What do you have in stock?" },
	{ speaker: "Zen - Shopkeeper", text: "I have many wonderful items, all available for a great price!" },
]
function waveDone() {
	destroyAll("coin")


	// button to advance wave
	const button = add([
		sprite("next-wave-button"),
		pos(center().add(0, height()/2 - 100)),
		scale(0.25),
		area(),
		anchor("center"),
		"wave-button",
		"intermission",
		{clicked: false},
	])
	onClick("wave-button", () => {
		if (button.clicked) return
		button.clicked = true
		destroyAll("intermission")
		spawnWave()
	})

    // shopkeeper stuff
	add([
		sprite("friend"),
		pos(center().sub(0, 100)),
		area(),
        body(),
		anchor("center"),
		"shopkeeper",
		"npc",
		"intermission",
	])

    // glen controllers
    if (Math.random() < 0.33) {
		let glenOriginalPos = center().sub(350, 350)
        const glen = add([
            sprite("npc"),
            pos(glenOriginalPos),
            area(),
            body(),
			offscreen({destroy:true}),
            anchor("center"),
            "npc",
			"glen",
            "intermission",
        ])
		onDestroy("glen", () => {
			glenListener.cancel()
		})
        let glen_dialogue = [
            {speaker: "???", text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit..."},
            {speaker: "Ren", text: "Bro what are you saying???"},
            {speaker: "???", text: "Sorry, that was just placeholder text that the developers gave me. They still haven't removed it."},
            {speaker: "Ren", text: "What's a developer?"},
            {speaker: "???", text: "I don't know."},
            {speaker: "Glen", text: "By the way, My name is Glen."},
            {speaker: "Ren", text: "Nice to meet you Glen."},
            {speaker: "Glen", text: "Here, have this healing potion. It's on the house."},
            {speaker: "Ren", text: "What house?"},
            {speaker: "Glen", text: "I don't know, I'm homeless. I just sometimes appear here and then disappear, sent off to a black expanse of nothingness. It's boring out there."},
        ]
		let touchingGlen = false
		let gotPotion = false
		onCollide("player", "glen", () => {
			touchingGlen = true
		})
		onCollideEnd("player", "glen", () => {
			touchingGlen = false
			const dir = glenOriginalPos.sub(glen.pos).unit();
			const speed = 100; // Adjust speed as needed
			if (distance(glenOriginalPos, glen.pos) > 100) {
				showDialogue([{speaker:"Glen", text: "Hey, stop pushing me!"}])
			}
			glen.onUpdate(() => {
				if (glen.pos.dist(glenOriginalPos) > 1) {
					glen.move(dir.scale(speed));
				} else {
					glen.pos = glenOriginalPos;
					glen.onUpdate(() => {}); // Stop updating once Glen reaches the original position
				}
			});
		})
		const glenListener = onKeyPress("e", () => {
			if (touchingGlen && !gotPotion) {
				showDialogue(glen_dialogue, () => {
					spawnHeal(glen.pos.add(100,100))
				})
				gotPotion = true
				wait(5, () => {
					glenListener.cancel()
				})
			} else if (touchingGlen) {
				showDialogue([
					{speaker: "Glen", text: "Bro, I'm not going to give you more free stuff"}
				])
			}
		})

    }
}

function spawnWave() {
	// spawn a wave
	currentWave+=1;
	play("new-wave")
	add([
		text("WAVE " + currentWave, {
			font: "cheri",
			size:height()/25,
			lineSpacing: 80,
		}),
		pos(center()),
		anchor("center"),
		color(rgb(0, 0, 0)),
		scale(3),
		fadeIn(1),
		opacity(1),
		lifespan(2.5, { fade: 0.5 }),
	])

	enemiesLeft = Math.floor((baseEnemies * currentWave) + (difficulty * currentWave))
	let enemyNumber = enemiesLeft
	enemiesLeftText.text = "Enemies Left: " + enemiesLeft
	waveText.text = "Wave: " + currentWave
	for (let i = 0; i < enemyNumber; i++) {
		addEnemy(
			Math.round(rand(currentWave, currentWave*difficulty)), // health
			i % 3 == 0 ? 1 : 0 // 1 in 3 chance of ranged enemy
		)
	}
	// done spawning waves
	spawnedWave = false

}
spawnWave()

