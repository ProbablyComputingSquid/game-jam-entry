import kaboom from "kaboom"
import "kaboom/global"

// initialize context
kaboom()

// load assets
loadSprite("bean", "sprites/bean.png")

// add a character to screen
const player = add([
	// list of components
	sprite("bean"),
	pos(80, 40),
	area(),
])

// add a kaboom on mouse click
onClick(() => {
	addKaboom(mousePos())
})


// control stuff

onKeyPress("up", () => {
	
})