/* todo:
    * add upgrades
    * wave text
    * add a ranged player attack
    * inventory system???
    * shop???
*/
//@ts-ignore
import kaboom, { AreaComp, GameObj} from "kaboom"
import "kaboom/global"

const SPEED = 320;
const ENEMY_SPEED = 160
const BULLET_SPEED = 800
let WeaponDamage = 1
let enemiesLeft = 0
let currentWave = 0
let baseEnemies = 5
let difficulty = 1.2


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
loadSprite("upgrade", "sprites/jumpy.png")
loadSprite("button", "sprites/button.png")
// sounds
loadSound("oof", "sounds/oof.mp3")
loadSound("score", "sounds/score.mp3")
loadSound("slash", "sounds/slash.mp3")
loadSound("level-complete", "sounds/level-complete.mp3")
loadSound("new-wave", "sounds/whoosh-drum.mp3")
loadSound("level-failed", "sounds/level-failed.mp3")
loadSound("music", "sounds/background-music.mp3")
// font
loadFont("apl386", "fonts/apl386.ttf")
loadFont("lemon", "fonts/BubbleLemonDemoOutline.ttf")
loadFont("nabana", "fonts/nabana.ttf")
loadFont("cheri", "fonts/cheri.ttf")

// background
const background = add([
	sprite("background"),
	pos(0, 0),
	fixed(),
	z(-999),
	"background",
])
const music = play("music", {
	loop: true,
	volume: 0.5
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
	pos(12, 24 + height()  * 4 / 25),
	color(rgb(0, 0, 0)),
	z(2),
	{value: 1}
])
// dialouge stuff
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
        text("", { size: 16, width: width() - 60 }),
        pos(30, height() - 110),
        color(255, 255, 255),
        z(3),
        "speakerText"
    ]);

    const dialogueText = add([
        text("", { size: 20, width: width() - 60 }),
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

    onKeyPress("space", () => {
        currentDialogueIndex++;
        if (currentDialogueIndex < dialogues.length) {
            updateDialogue();
        } else {
            destroy(dialogueBox);
            destroy(speakerText);
            destroy(dialogueText);
            if (onComplete) onComplete();
        }
    });

    updateDialogue();
}

// distance function ONLY FOR VEC2s!!!
function distance(pointA, pointB): number {
	return Math.sqrt(Math.pow(pointB.x - pointA.x, 2) + Math.pow(pointB.y - pointA.y, 2));
}
function selectSpawn() {
	const playerPos = player.pos; // Get the player's current position
	const spawnRadius = 1000; // Define a maximum radius for spawn points

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
			enemy.alive=false
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

function addRangedEnemy(enemyHealth: number = 1) {
	// done
	const enemy = add([
		sprite("ranged"),
		pos(selectSpawn()),
		anchor("center"),
		area(),
		body(),
		// This enemy cycle between 3 states, and start from "idle" state
		state("move", [ "idle", "attack", "move", "dead" ]),
		"enemy",
		"ranged",
		health(enemyHealth),
		{points: enemyHealth*3}
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
				offscreen({ destroy: true }),
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

function addEnemy(enemyHealth = 1, type= 0) {
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

player.onCollide("pineapple", (pineapple) => {
	destroy(pineapple)
	player.heal()
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
			anchor("center")
		])
		destroy(player)
		destroy(weapon)
		play("level-failed")
		add([
			text("game over", {
				font: "cheri",
				size:height()/25,
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
				size:height()/25,
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

onCollide("player","melee", () => {
	player.hurt(1)
	//debug.log("ow")
})
const weapon = add([
	sprite("sword"),
	pos(player.pos.x + (width()/25), player.pos.y),
	area(),
	"weapon",
	anchor("center"),
	scale(0.2),
	rotate(0),
])

let weaponDistance = width()/25
// rotate the weapon to face mouse
onUpdate("player", () => {
	let weaponPos = new Vec2()
    let weaponAngle = Math.atan2(player.pos.y - mousePos().y, player.pos.x - mousePos().x) - Math.PI
	weaponPos.x = weaponDistance * Math.cos(weaponAngle) + player.pos.x
	weaponPos.y = weaponDistance * Math.sin(weaponAngle) + player.pos.y
	weapon.pos = weaponPos
	weapon.rotateTo(weaponAngle * 180 / Math.PI)
	//debug.log(weaponAngle)
})


onMousePress(() => {
	// if player clicked last frame, hurt the enemy
	//weaponDistance = width()/17.5
	if (player.exists()) {
		play("slash")
		// tween the weapon movement
		tween(width()/25, width()/17.5, 1, (p) => weaponDistance = p, easings.easeOutBounce)
		wait(0.1, () => {
			tween(width()/17.5, width()/25, 1, (p) => weaponDistance = p, easings.easeOutBounce)
		})
	}
})
onCollideUpdate("weapon", "enemy", (weapon, enemy) => {
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
				collisionIgnore: ["coin", "enemy", "bullet", "weapon", "pineapple"]
			}),
			z(-1),
			body(),
			scale(0.5),
			"coin",
			{value: 1},
		])
	}
	enemiesLeft-=1
	enemiesLeftText.text = "Enemies Left: " + enemiesLeft
	updateScore(points)
	play("score")
	if (enemiesLeft == 0 && !spawnedWave) {
		debug.log("wave completed!")
		spawnedWave = true
		waveDone()
	}
}

hearts()
player.on("hurt", () => {
	play("oof")
	//debug.log("health: " + player.hp())
	destroyAll("heart")
	hearts()
})
let swordUpgradeCost = 5
function shopMenu() {
	const upgrade = add([
		sprite("upgrade"),
		pos(center()),
		scale(0.5),
		area(),
		body(),
		anchor("center"),
		"upgrade",
		"intermission",
	])
	const upgrade_dialogue = [
		{ speaker: "Ben", text: "What is this?" },
		{ speaker: "Glen - Shopkeeper", text: "It's GlenForged GlenBlade the one of the newest in sword technologies, perfected by my company GlenDustry™ Inc. " },
		{ speaker: "Ben", text: "I'll take the GlenBlade" },
		{ speaker: "Glen - Shopkeeper", text: `That'll be ${swordUpgradeCost} coins` },
		{ speaker: "Ben", text: "I'll take it" },
		{ speaker: "Glen - Shopkeeper", text: "Thank you for supporting local businesses" },
	]
	const not_enough_money = [
		{ speaker: "Glen - Shopkeeper", text: "You don't have enough money for that." },
		{ speaker: "Ben", text: `I only need ${swordUpgradeCost - money.value} more coins!` },
	]
	let playerTouchingUpgrade = false
	onCollide("player", "upgrade", () => {
		playerTouchingUpgrade = true
	})
	onCollideEnd("player", "upgrade", () => {
		playerTouchingUpgrade = false
	})
	onKeyPress("e", () => {
		if (playerTouchingUpgrade) {
			playerTouchingUpgrade = false
			if (money.value < swordUpgradeCost) {
				showDialogue(not_enough_money)
				return
			} else {
				showDialogue(upgrade_dialogue, () => {
					WeaponDamage += 1
					updateMoney(swordUpgradeCost)
					destroy(upgrade)
					swordUpgradeCost *= 1.75
					swordUpgradeCost = Math.floor(swordUpgradeCost)
				})
			}
		}
	})
}
function waveDone() {
	const button = add([
		sprite("button"),
		pos(center()),
		scale(0.25),
		area(),
		body(),
		anchor("center"),
		"wave-button",
		"intermission",
		{clicked: false},
	])
	onClick("wave-button", () => {
		if (button.clicked) return
		button.clicked = true
		destroyAll("intermission")
		destroyAll("coin")

		spawnWave()
	})
	const shopkeeper = add([
		sprite("friend"),
		pos(center().sub(0, 100)),
		area(),
		anchor("center"),
		"shopkeeper",
		"npc",
		"intermission",
	])
	const shop_dialogue = [
		{ speaker: "Glen - Shopkeeper", text: "Hello traveler, would you like to sample some of my wonderful wares?" },
		{ speaker: "Ben", text: "What do you have in stock?" },
		{ speaker: "Glen - Shopkeeper", text: "I have many wonderful items, all available for a great price!" },
	]
	let playerTouchingShop = false
	onCollide("player", "shopkeeper", () => {
		playerTouchingShop = true
	})
	onCollideEnd("player", "shopkeeper", () => {
		playerTouchingShop = false
	})
	onKeyPress("e", () => {
		if (playerTouchingShop) {
			playerTouchingShop = false
			showDialogue(shop_dialogue, () => {
				shopMenu()
			})
		}
	})
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

