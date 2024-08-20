/* todo:
    * add upgrades
    * wave text
    * add a ranged player attack
    * inventory system???
    * shop???
*/
//@ts-ignore
import kaboom, { AnchorComp, AreaComp, GameObj, PosComp, ScaleComp, SpriteComp} from "kaboom"
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
loadSprite("next-wave-button", "sprites/next-wave.png")
loadSprite("heal", "sprites/heal.png")
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

// finds the farthest spawn point from the player
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
		destroy(weapon)
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
const weapon = add([
	sprite("sword"),
	pos(player.pos.x + (width() / 25), player.pos.y),
	area(),
	"weapon",
	anchor("center"),
	scale(0.2),
	rotate(0),
])

let weaponDistance = width() / 25
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
		tween(width() / 25, width() / 17.5, 1, (p) => weaponDistance = p, easings.easeOutBounce)
		wait(0.1, () => {
			tween(width() / 17.5, width() / 25, 1, (p) => weaponDistance = p, easings.easeOutBounce)
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
				collisionIgnore: ["coin", "enemy", "bullet", "weapon", "pineapple"]
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
// DO NOT CHANGE THESE VARIABLES WITHOUT CHANGING THE VALUES IN UPDATE DIALOGUE FUNCTION FIRST
let swordUpgradeCost = 20
let healPotionCost = 10
let maxHealthUpgradeCost = 50
function shopMenu() {
    let touchingSwordUpgrade = false
    let touchingHealthUpgrade = false
    let touchingHeal = false
	add([
		sprite("upgrade"),
		pos(center().sub(50, 50)),
		scale(0.5),
		area(),
        body(),
		anchor("center"),
		"upgrade",
        "sword_upgrade",
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
			sword_upgrade_dialogue[3] = {speaker: "Zen - Shopkeeper", text: `That'll be ${swordUpgradeCost} coins`}
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
			health_upgrade_dialogue[7] = {speaker: "Zen - Shopkeeper", text: `That'll be ${maxHealthUpgradeCost} coins`}
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
			heal_potion_dialogue[3] = {
				speaker: "Zen - Shopkeeper",
				text: `Alright, that'll be ${healPotionCost} coins.`
			}
			heal_potion_dialogue[4] = {
				speaker: "Ren",
				text: (money.value >= healPotionCost * 2) ? "What an affordable price!" : "Why are these so expensive, It's almost like you're trying to make a profit."
			}
		}
	}


    function cleanupUpgrades() {
        destroyAll("upgrade")
    }
	function doUpgrade(upgrade: String) {
		updateDialogue()
        upgradeListener.cancel()
        if (upgrade == "sword") {
            if (money.value >= swordUpgradeCost) {
                showDialogue(sword_upgrade_dialogue, () => {
                    WeaponDamage += 1
                    updateMoney(-swordUpgradeCost)
                    swordUpgradeCost *= 1.75
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
					maxHealthUpgradeCost *= 2
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
        } else if (upgrade == "heal") {
            // todo: healing potion
			if (money.value >= healPotionCost) {
				showDialogue(heal_potion_dialogue, () => {
					spawnHeal(center().sub(0, 100))
					updateMoney(-healPotionCost)
					healPotionCost *= 1.5
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
        } else {
            debug.log("something went wrong")
        }
	}
    onCollide("player", "sword_upgrade", () => {
        touchingSwordUpgrade = true
    })
    onCollideEnd("player", "sword_upgrade", () => {
        touchingSwordUpgrade = false
    })
    onCollide("player", "health_upgrade", () => {
        touchingHealthUpgrade = true
    })
    onCollideEnd("player", "health_upgrade", () => {
        touchingHealthUpgrade = false
    })
    onCollide("player", "heal", () => {
        touchingHeal = true
    })
    onCollideEnd("player", "heal", () => {
        touchingHeal = false
    })
	const upgradeListener = onKeyPress("e", () => {
		if (touchingSwordUpgrade) {
            doUpgrade("sword")
        } else if (touchingHealthUpgrade) {
            doUpgrade("health")
        } else if (touchingHeal) {
            doUpgrade("heal")
        }
	})
}
function waveDone() {
	destroyAll("coin")
	// shopkeeper contact listeners
	let shopkeeperListener = onCollide("player", "shopkeeper", () => {
		playerTouchingShop = true
		debug.log("touching shopkeeper")
	})
	let shopkeeperListener2 = onCollideEnd("player", "shopkeeper", () => {
		playerTouchingShop = false
		shopListener.paused = false
		debug.log("not touching shopkeeper")
	})

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
		shopkeeperListener.cancel()
		shopkeeperListener2.cancel()
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
	const shop_dialogue = [
		{ speaker: "Zen - Shopkeeper", text: "Hello traveler, would you like to sample some of my wonderful wares?" },
		{ speaker: "Ren", text: "What do you have in stock?" },
		{ speaker: "Zen - Shopkeeper", text: "I have many wonderful items, all available for a great price!" },
	]
	let playerTouchingShop = false
	const shopListener = onKeyPress("e", () => {
		if (playerTouchingShop) {
            shopListener.paused = true
			showDialogue(shop_dialogue, () => {
				shopMenu()
                debug.log("entered the shop")
			})
		}
	})

    // npc stuff
    if (Math.random() < 0.33 || true) {
        const glen = add([
            sprite("npc"),
            pos(center().sub(400, 400)),
            area(),
            body(),
            anchor("center"),
            "npc",
			"glen",
            "intermission",
        ])
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
		onCollide("player", "glen", () => {
			touchingGlen = true
		})
		onCollideEnd("player", "glen", () => {
			touchingGlen = false
		})
		const glenListener = onKeyPress("e", () => {
			if (touchingGlen) {
				showDialogue(glen_dialogue, () => {
					spawnHeal(glen.pos)
				})
				glenListener.cancel()
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

