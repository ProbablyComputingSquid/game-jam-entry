/* todo:
    * add a player attack
    * add a ranged enemy (done)
    * add a ranged player attack
    * add health bar
    * add some sort of scoring system
    * make waves?
    * inventory system???
    * shop???
*/

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
loadSound("oof", "sounds/oof.mp3")

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
	])
	enemy.on("death", () => {
		destroy(enemy)
	})
	enemy.onUpdate(() => {
		if (!player.exists()) return
		const dir = player.pos.sub(enemy.pos).unit()
		enemy.move(dir.scale(ENEMY_SPEED))
	})

	onCollide("player","melee", (enemy, player) => {
		enemy.hurt(1)
		player.hurt(1)
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
		state("move", [ "idle", "attack", "move" ]),
		"ranged",
		"enemy",
		health(enemyHealth),
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
		if (player.exists()) {
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

}
function addEnemy(enemyHealth = 1, type= 0) {
	// type 0 is the default enemy, just melee
	// type 1 is a ranged enemy
	if (type == 0) {
		// melee enemy
		addMeleeEnemy(enemyHealth)
	} else if (type == 1) {
		// ranged enemy
		addRangedEnemy(enemyHealth)
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
	"player"
])

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
// todo: make the weapon move further out to "slash" the enemy

onMousePress(() => {

})
onCollideUpdate("weapon", "enemy", (weapon, enemy) => {
	// if player clicked last frame, hurt the enemy
	if (isMousePressed()) {
		enemy.hurt(WeaponDamage)
	}
})

// player control stuff
onKeyDown("right", () => {
	player.move(SPEED, 0)
})
onKeyDown("left", () => {
	player.move(-SPEED, 0)
})
onKeyDown("up", () => {
	player.move(0, -SPEED)
})
onKeyDown("down", () => {
	player.move(0, SPEED)
})

addEnemy();
addRangedEnemy();

// deal with the heart bar
function hearts() {
	for (let i = 0; i < player.hp(); i++) {
		const heart = add([
			sprite("heart"),
			pos(10 + i * 65, 10),
			"heart",
			fixed(),
		])
	}
}

hearts()
player.on("hurt", () => {
	if (player.hp() <= 0) {
		player.destroy()
		addKaboom(player.pos);
	}
	play("oof")
	debug.log("health: " + player.hp())
	destroyAll("heart")
	hearts()
})
