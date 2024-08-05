import kaboom from "kaboom"
import "kaboom/global"

const SPEED = 320;
let enemyList = []

// initialize context
kaboom()

// load assets
loadSprite("bean", "sprites/bean.png")
loadSprite("enemy", "sprites/unhappy.png")
loadSprite("sword", "sprites/sword.png")

function addEnemy(enemyHealth = 1) {
	const enemy = add([
		sprite("enemy"),
		pos(rand(0, width()), rand(0, height())),
		area(),
		body(),
		health(enemyHealth),
		"enemy",
	])
	enemy.move(enemy.pos.angle(player.pos), 200)
	enemyList.push(enemy)

}

// add player to screen
const player = add([
	// list of components
	sprite("bean"),
	pos(80, 40),
	area(),
	body(),
	health(8),
])


// control stuff

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