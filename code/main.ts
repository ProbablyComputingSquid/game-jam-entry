/* todo:
    * add a player attack (done)
    * add improvements
    * lose screen
    * wave text
    * add a ranged enemy (done)
    * add a ranged player attack
    * add health bar (done)
    * add some sort of scoring system (done)
    * make waves? (done)
    * inventory system???
    * shop???
*/
//@ts-ignore
import kaboom, { AreaComp, GameObj } from "kaboom"
import "kaboom/global"

const SPEED = 320;
const ENEMY_SPEED = 160
const BULLET_SPEED = 800
let WeaponDamage = 1


// initialize context
kaboom()

// load assets
loadSprite("bean", "sprites/bean.png")
loadSprite("enemy", "sprites/ben.png")
loadSprite("ranged", "sprites/ken.png")
loadSprite("friendly", "sprites/zen.png")
loadSprite("npc", "sprites/glen.png")
loadSprite("sword", "sprites/sword.png")
loadSprite("heart", "sprites/heart.png")
// sounds
loadSound("oof", "sounds/oof.mp3")
loadSound("score", "sounds/score.mp3")
loadSound("slash", "sounds/slash.mp3")
loadSound("level-complete", "sounds/level-complete.mp3")
loadSound("new-level", "sounds/new-level.mp3")
loadSound("level-failed", "sounds/level-failed.mp3")
// font
loadFont("apl386", "fonts/apl386.ttf")
loadFont("lemon", "fonts/BubbleLemonDemoOutline.ttf")

// score text
const score = add([
	text("Score: 0"),
	pos(12, width()/25),
	color(rgb(0, 0, 0)),
	{value: 0}
])
const enemiesLeftText = add([
	text("Enemies Left: 0"),
	pos(12, width()/15),
	color(rgb(0, 0, 0)),
	{value: 0}
])
const waveText = add([
	text("Wave: 1"),
	pos(12, width()/10),
	color(rgb(0, 0, 0)),
	{value: 1}
])
// function to load in a melee enemy
function addMeleeEnemy(enemyHealth: number = 1) {
	const enemy = add([
		sprite("enemy"),
		pos(rand(0, width()), rand(0, height())),
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
			enemyDeath(enemy.points)
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
		pos(width() - 80, height() - 80),
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
	// when player takes a bullet, they get hurt
	player.onCollide("bullet", (bullet) => {
		destroy(bullet)
		player.hurt(1)
	})


	enemy.on("death", () => {
		enemy.enterState("dead")
		enemyDeath(enemy.points)
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

// player death event

player.on("death", () => {
	if (player.alive) {
		player.alive = false
		destroy(player)
		destroy(weapon)
		addKaboom(player.pos)
		play("level-failed")
		const gameOverText = add([
			text("Game Over!", {
				font: "lemon",
			}),
			pos(center()),
			anchor("center"),
			scale(3),
		])

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
		//@ts-ignore
		const heart = add([
			sprite("heart"),
			pos(10 + i * 65, 10),
			"heart",
			fixed(),
		])
	}
}

// deal with the score

function updateScore(amount: number) {
	score.value += amount
	score.text = "Score:" + score.value

}

// deal with the enemy death

// prevent goofy async stuff
let spawnedWave= false
function enemyDeath(points: number) {
	enemiesLeft-=1
	enemiesLeftText.text = "Enemies Left: " + enemiesLeft
	updateScore(points)
	play("score")
	if (enemiesLeft == 0 && !spawnedWave) {
		debug.log("wave completed!")
		spawnedWave = true
		currentWave+=1;
		spawnWave()
	}
}

hearts()
player.on("hurt", () => {
	play("oof")
	//debug.log("health: " + player.hp())
	destroyAll("heart")
	hearts()
})

let enemiesLeft = 0
let currentWave = 1
let baseEnemies = 5
let difficulty = 1.2
function spawnWave() {
	// spawn a wave
	debug.log("new wave!")
	enemiesLeft = Math.floor((baseEnemies * currentWave) + (difficulty * currentWave))
	let enemyNumber = enemiesLeft
	enemiesLeftText.text = "Enemies Left: " + enemiesLeft
	waveText.text = "Wave: " + currentWave
	for (let i = 0; i < enemyNumber; i++) {
		addEnemy(
			Math.round(rand(currentWave, currentWave*difficulty)), // health
			i % 3 == 0 ? 1 : 0 // 1 in 3 chance of range enemy
		)
	}
	// done spawning waves
	spawnedWave = false

}
spawnWave()

