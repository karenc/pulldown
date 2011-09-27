var GAME_WIDTH = 10;
var GAME_HEIGHT = 12;
var BUBBLE_SIZE = 48;
var TICK_INTERVAL = Math.floor(1000 / 30);
var GAME_AREA = new Rect(((480 - BUBBLE_SIZE * GAME_WIDTH) / 2), 0,
        BUBBLE_SIZE * GAME_WIDTH, BUBBLE_SIZE * GAME_HEIGHT);
var SCORE_AREA = new Rect(GAME_AREA.x - 5, GAME_AREA.y + GAME_AREA.height + 40,
        GAME_AREA.width + 10, 50);
var TARGET_AREA = new Rect(GAME_AREA.x - 5, SCORE_AREA.y + SCORE_AREA.height + 15,
        GAME_AREA.width + 10, 50);
var LEVEL_AREA = new Rect(GAME_AREA.x - 5, TARGET_AREA.y + TARGET_AREA.height + 15,
        GAME_AREA.width + 10, 50);

var DROP_SPEED = 1; // the smaller the faster
var DROP_INTERVAL = 50; // the larger the faster
var POP_SPEED = 5; // the larger the faster
var GRAVITY_SPEED = 0.1; // the smaller the faster
var MINIMUM_MATCH = 3;

var tickManager;

var allowClick = true;

function Bubble(position, type) {
    this.rect = new Rect(position.x, position.y, BUBBLE_SIZE, BUBBLE_SIZE);
    this.type = type;
    this.match = false;
    this.popSize = 0;
    this.dead = false;
    this.dx = 0;
    this.dy = 0;
}

Bubble.prototype.draw = function(context) {
    if (this.match) {
        context.fillStyle = 'rgb(170, 255, 170)';
        context.fillRect(this.rect.x, this.rect.y, BUBBLE_SIZE, BUBBLE_SIZE);
    }
    if (this.popSize * 2 >= BUBBLE_SIZE) {
        return;
    }
    context.drawImage(this.type.image,
            this.popSize, this.popSize,
            BUBBLE_SIZE - this.popSize * 2, BUBBLE_SIZE - this.popSize * 2,
            this.rect.x + this.popSize, this.rect.y + this.popSize,
            this.rect.width - this.popSize * 2,
            this.rect.height - this.popSize * 2);
};

Bubble.prototype.pop = function(context, completion) {
    this.match = false;
    tickManager.addAnimation(new BubblePopAnimation(this), completion);
};

Bubble.prototype.hit = function(point) {
    if (!this.dead && this.rect.containsPoint(point)) {
        return this;
    }
};

Bubble.prototype.getPosition = function() {
    return [Math.floor((this.rect.x - GAME_AREA.x) / BUBBLE_SIZE),
           Math.floor((this.rect.y - GAME_AREA.y) / BUBBLE_SIZE)];
};

Bubble.prototype.isSameType = function(bubble) {
    return (this.type.image.src === bubble.type.image.src);
};

Bubble.prototype.gravity = function(completion) {
    var this_ = this;
    function gravityLeft() {
        this_.dy = 0;
        if (this_.dx) {
            tickManager.addAnimation(new MoveAnimation(this_,
                        new Point(this_.rect.x + this_.dx, this_.rect.y),
                            Math.abs(this_.dx) / BUBBLE_SIZE * GRAVITY_SPEED),
                    function() {
                        this_.dx = 0;
                        completion();
                    }
                    );
        } else {
            completion();
        }
    }
    if (this.dy) {
        tickManager.addAnimation(new MoveAnimation(this,
                    new Point(this.rect.x, this.rect.y + this.dy),
                    Math.abs(this.dy) / BUBBLE_SIZE * GRAVITY_SPEED),
                gravityLeft);
    } else {
        gravityLeft();
    }
};

function BubblePopAnimation(bubble) {
    this.bubble = bubble;
}

BubblePopAnimation.prototype.tick = function(dt) {
    this.bubble.popSize = Math.min(this.bubble.popSize + POP_SPEED,
            BUBBLE_SIZE / 2);
    if (this.bubble.popSize * 2 >= BUBBLE_SIZE) {
        return false;
    }
    return true;
};

function dropNewBubble(layer, bubble, x, y, completion) {
    layer.addGameObject(bubble);

    tickManager.addAnimation(new MoveAnimation(bubble,
                new Point(bubble.rect.x, GAME_AREA.y + y * BUBBLE_SIZE),
                y / BUBBLE_SIZE * DROP_SPEED), completion)
}

function randomBubble(x, y) {
    var bubbleType = BubbleType.bubbleTypes[Math.floor(Math.random() *
            BubbleType.bubbleTypes.length)];
    var bubble = new Bubble(new Point(GAME_AREA.x + BUBBLE_SIZE * x,
                GAME_AREA.y - BUBBLE_SIZE), bubbleType);

    return bubble;
}

function BubbleType(image) {
    this.image = image;
}

function Pulldown(gameField, width, height, context, gameLayer) {
    this.gameField = gameField;
    this.width = width;
    this.height = height;
    this.context = context;
    this.gameLayer = gameLayer;

    this.score = 0;
    this.finished = false;
    this.level = 1;
    this.target = 2000;

    for (var i = 0; i < width; i++) {
        this.gameField[i] = [];
    }
    this.matches = [];
}

Pulldown.prototype.nextTargetScore = function() {
    if (this.level <= 2) {
        this.target += 2000;
    } else if (this.level >= 3 && this.level <= 5) {
        this.target += 3000;
    } else if (this.level >= 6 && this.level <= 8) {
        this.target += 4000;
    } else if (this.level >= 9 && this.level <= 13) {
        this.target += 5000;
    } else if (this.level >= 14 && this.level <= 31) {
        this.target += 5500;
    } else if (this.level >= 32 && this.level <= 63) {
        this.target += 6000;
    } else if (this.level >= 64 && this.level <= 95) {
        this.target += 6500;
    } else {
        this.target += 7000;
    }
};

Pulldown.prototype.addBubble = function(i, j, bubble) {
    this.gameField[i][j] = bubble;
};

Pulldown.prototype.clearMatches = function() {
    for (var i = 0; i < this.matches.length; i++) {
        this.matches[i].match = false;
    }
    this.matches = [];
};

Pulldown.prototype.addScore = function() {
    this.score += this.matches.length * 5 * this.matches.length;
    if (this.matches.length >= 10) {
        this.score += 500;
    }
    if (this.matches.length >= 20) {
        this.score += 500;
    }
};

Pulldown.prototype.pop = function() {
    var this_ = this;
    var completion = multiCompletion(this.matches.length, function() {
        this_.addScore();
        this_.gravity();
        this_.clearMatches();
        this_.isFinished();
    });
    for (var i = 0; i < this.matches.length; i++) {
        this.matches[i].pop(this.context, completion);
        this.matches[i].dead = true;
    }
};

Pulldown.prototype.select = function(bubble) {
    if (!bubble) {
        return;
    }

    if (bubble.match) {
        this.pop(this.context);
        return;
    }

    this.clearMatches();

    var position = bubble.getPosition();
    this.floodFill(position[0], position[1], bubble);

    if (this.matches.length < MINIMUM_MATCH) {
        this.clearMatches();
    }
};

Pulldown.prototype.floodFill = function(i, j, match) {
    var directions = [
        [-1, -1],
        [0, -1],
        [1, -1],
        [-1, 0],
        [1, 0],
        [-1, 1],
        [0, 1],
        [1, 1]
    ];

    var x;
    var y;
    for (var k = 0; k < directions.length; k++) {
        x = i + directions[k][0];
        y = j + directions[k][1];
        if (x >= 0 && x < this.width && y >= 0 && y < this.height &&
                this.gameField[x][y] !== null) {
            if ((this.gameField[x][y].isSameType(match)) &&
                    this.matches.indexOf(this.gameField[x][y]) == -1) {
                this.matches.push(this.gameField[x][y]);
                this.gameField[x][y].match = true;
                this.floodFill(x, y, match);
            }
        }
    }
};

Pulldown.prototype.gravity = function() {
    // Gravity Down
    var move = [];
    var bubble;
    var dead;
    for (var i = 0; i < this.width; i++) {
        for (var j = this.height - 1; j >= 0; j--) {
            if (this.gameField[i][j] === null) {
                break;
            }
            if (this.gameField[i][j].dead) {
                this.gameField[i][j] = null;
                dead = 1;
                for (var k = j - 1; k >= 0; k--) {
                    bubble = this.gameField[i][k];
                    if (bubble === null) {
                        this.gameField[i][k + 1] = null;
                        break;
                    }

                    if (bubble.dead) {
                        dead++;
                        this.gameField[i][k] = null;
                        continue;
                    }

                    if (move.indexOf(bubble) === -1) {
                        move.push(bubble);
                    }
                    bubble.dy = dead * BUBBLE_SIZE;
                    this.gameField[i][k] = null;
                    this.gameField[i][k + dead] = bubble;
                }
                break;
            }
        }
    }

    // Gravity Left
    var empty = 0;
    for (var i = 0; i < this.width; i++) {
        if (this.gameField[i][this.height - 1] === null) {
            empty++;
        }
        if (empty > 0) {
            for (var j = 0; j < this.height; j++) {
                bubble = this.gameField[i][j];
                if (bubble !== null) {
                    bubble.dx = 0 - empty * BUBBLE_SIZE;
                    this.gameField[i][j] = null;
                    this.gameField[i - empty][j] = bubble;

                    if (move.indexOf(bubble) === -1) {
                        move.push(bubble);
                    }
                }
            }
        }
    }

    var completion = multiCompletion(move.length, function() {
        allowClick = true;
    });
    for (var i = 0; i < move.length; i++) {
        move[i].gravity(completion);
    }
};

Pulldown.prototype.isFinished = function() {
    for (var i = 0; i < this.gameField.length; i++) {
        for (var j = 0; j < this.gameField[i].length; j++) {
            if (this.gameField[i][j] !== null && !this.gameField[i][j].dead) {
                this.floodFill(i, j, this.gameField[i][j]);
                if (this.matches.length >= MINIMUM_MATCH) {
                    this.finished = false;
                    this.clearMatches();
                    return;
                }
                this.clearMatches();
            }
        }
    }
    this.finished = true;
    this.clearMatches();
    return;
};

function click(point, gameLayer, pulldown) {
    if (!allowClick) {
        return;
    }
    if (GAME_AREA.containsPoint(point)) {
        var bubble = gameLayer.hit(point);
        pulldown.select(bubble);
    }
}

function Cursor(pulldown) {
    this.pulldown = pulldown;
}

Cursor.prototype.draw = function(context) {
    if (this.pulldown.matches.length > 0) {
        var x = Math.min(Math.max(this.pulldown.matches[0].rect.x,
                    GAME_AREA.x + 20),
                GAME_AREA.x + GAME_AREA.width);
        var y = Math.min(Math.max(this.pulldown.matches[0].rect.y,
                    GAME_AREA.y + 20),
                GAME_AREA.y + GAME_AREA.height);
        context.fillStyle = 'rgb(0, 0, 0)';
        context.font = 'bold 33px Arial';
        context.fillText(this.pulldown.matches.length, x, y);
        context.fillStyle = 'rgb(255, 255, 255)';
        context.font = 'bold 28px Arial';
        context.fillText(this.pulldown.matches.length, x + 1, y - 2);
    }
};

Cursor.prototype.hit = function(point) {
};

function Score(pulldown) {
    this.pulldown = pulldown;
}

Score.prototype.draw = function(context) {
    context.fillStyle = 'rgba(100, 255, 100, 0.5)';
    context.fillRect(SCORE_AREA.x, SCORE_AREA.y, SCORE_AREA.width,
            SCORE_AREA.height);
    context.fillStyle = 'rgb(0, 0, 0)';
    context.font = 'bold 20px Arial';
    context.fillText('Score', SCORE_AREA.x + 10, SCORE_AREA.y + 30);

    context.font = 'bold 40px Arial';
    context.fillStyle = 'rgb(0, 0, 0)';
    var score = this.pulldown.score.toString();
    context.fillText(score, SCORE_AREA.x + (16 - score.length) * 20,
            SCORE_AREA.y + 40);
};

Score.prototype.hit = function(point) {
};

function Target(pulldown) {
    this.pulldown = pulldown;
}

Target.prototype.draw = function(context) {
    context.fillStyle = 'rgba(100, 255, 100, 0.5)';
    context.fillRect(TARGET_AREA.x, TARGET_AREA.y, TARGET_AREA.width,
            TARGET_AREA.height);
    context.fillStyle = 'rgb(0, 0, 0)';
    context.font = 'bold 20px Arial';
    context.fillText('Target', TARGET_AREA.x + 10, TARGET_AREA.y + 30);

    context.font = 'bold 40px Arial';
    if (this.pulldown.score < this.pulldown.target) {
        context.fillStyle = 'rgb(255, 0, 0)';
    } else {
        context.fillStyle = 'rgb(0, 0, 0)';
    }
    var target = this.pulldown.target.toString();
    context.fillText(target, TARGET_AREA.x + (16 - target.length) * 20,
            TARGET_AREA.y + 40);
};

Target.prototype.hit = function(point) {
};

function GameFinished(pulldown) {
    this.pulldown = pulldown;
}

function Level(pulldown) {
    this.pulldown = pulldown;
}

Level.prototype.draw = function(context) {
    context.fillStyle = 'rgba(100, 255, 100, 0.5)';
    context.fillRect(LEVEL_AREA.x, LEVEL_AREA.y, LEVEL_AREA.width,
            LEVEL_AREA.height);
    context.fillStyle = 'rgb(0, 0, 0)';
    context.font = 'bold 20px Arial';
    context.fillText('Level', LEVEL_AREA.x + 10, LEVEL_AREA.y + 30);

    context.font = 'bold 40px Arial';
    context.fillStyle = 'rgb(0, 0, 0)';
    var level = this.pulldown.level.toString();
    context.fillText(level,
            LEVEL_AREA.x + (16 - level.length) * 20,
            LEVEL_AREA.y + 40);
};

Level.prototype.hit = function(context) {
};

GameFinished.prototype.draw = function(context) {
    var text;
    if (this.pulldown.finished) {
        context.fillStyle = 'rgba(0, 0, 0, 0.8)';
        context.fillRect(GAME_AREA.x, GAME_AREA.y, GAME_AREA.width,
                GAME_AREA.height);
        context.fillStyle = 'rgb(255, 255, 255)';
        context.font = 'bold 40px Arial';
        if (this.pulldown.score >= this.pulldown.target) {
            text = 'NEXT LEVEL';
        } else {
            text = 'GAME OVER';
        }
        context.fillText(text, GAME_AREA.x + (GAME_AREA.width / 2 - 120),
                GAME_AREA.y + GAME_AREA.height / 2);
    }
};

GameFinished.prototype.hit = function(point) {
    if (!GAME_AREA.containsPoint(point)) {
        return;
    }
    if (this.pulldown.finished &&
            this.pulldown.score >= this.pulldown.target) {
        this.pulldown.nextLevel();
    }
};

Pulldown.prototype.nextLevel = function() {
    this.level++;
    this.nextTargetScore();
    this.gameLayer.gameObjects = [];
    this.finished = false;
    this.newGame();
};

Pulldown.prototype.newGame = function() {
    var gameLayer = this.gameLayer;
    function newBubble(i, j, bubble, completion) {
        return function() {
            dropNewBubble(gameLayer, bubble, i, j, completion);
        };
    }

    function newBubbleFinished() {
        allowClick = true;
    }

    var timeout = 0;
    var bubble;
    for (var j = GAME_HEIGHT - 1; j >= 0; j--) {
        for (var i = 0; i < GAME_WIDTH; i++) {
            bubble = randomBubble(i, j);
            this.addBubble(i, j, bubble);
            if (j == 0 && i == GAME_WIDTH - 1) {
                setTimeout(newBubble(i, j, bubble, newBubbleFinished), timeout);
            } else {
                setTimeout(newBubble(i, j, bubble), timeout);
            }
            timeout += Math.max(100 - (GAME_HEIGHT - j) * DROP_INTERVAL, 5);
        }
    }

};

function init() {
    BubbleType.red = new BubbleType(document.getElementById('red'));
    BubbleType.turquoise = new BubbleType(document.getElementById('turquoise'));
    BubbleType.green = new BubbleType(document.getElementById('green'));
    BubbleType.black = new BubbleType(document.getElementById('black'));
    BubbleType.yellow = new BubbleType(document.getElementById('yellow'));
    BubbleType.purple = new BubbleType(document.getElementById('purple'));
    BubbleType.bubbleTypes = [BubbleType.red, BubbleType.turquoise,
        BubbleType.green, BubbleType.black, BubbleType.yellow,
        BubbleType.purple];

    var background = document.getElementById('background');

    var game = document.getElementById('game');
    var gameContext = game.getContext('2d');

    var backBuffer = document.getElementById('back-buffer');
    var context = backBuffer.getContext('2d');

    var gameLayer = new Layer();
    var topLayer = new Layer();

    var pulldown = new Pulldown([], GAME_WIDTH, GAME_HEIGHT, context,
            gameLayer);

    allowClick = false;

    function redraw() {
        context.drawImage(background, 0, 0);

        context.save();
        context.rect(GAME_AREA.x, GAME_AREA.y, GAME_AREA.width,
                GAME_AREA.height);
        context.clip();
        gameLayer.draw(context);
        context.restore();
        topLayer.draw(context);

        gameContext.drawImage(backBuffer, 0, 0);
    }

    tickManager = new TickManager(redraw);

    if ('ontouchend' in document) {
        // for mobile browsers
        document.addEventListener('touchstart',
                function(mouseEvent) {
                    mouseEvent.stopPropagation();
                    var point = new Point(
                        mouseEvent.touches[0].pageX - game.offsetLeft,
                        mouseEvent.touches[0].pageY - game.offsetTop);
                    topLayer.hit(point);
                    click(point, gameLayer, pulldown);
                    redraw();
                }, false);
    } else {
        document.addEventListener('mousedown',
                function(mouseEvent) {
                    mouseEvent.stopPropagation();
                    var point = new Point(
                        mouseEvent.pageX - game.offsetLeft,
                        mouseEvent.pageY - game.offsetTop);
                    topLayer.hit(point);
                    click(point, gameLayer, pulldown);
                    redraw();
                }, false);
    }

    pulldown.newGame(gameLayer);

    topLayer.addGameObject(new Cursor(pulldown));
    topLayer.addGameObject(new Score(pulldown));
    topLayer.addGameObject(new Target(pulldown));
    topLayer.addGameObject(new Level(pulldown));
    topLayer.addGameObject(new GameFinished(pulldown));

    redraw();

    // get rid of the address bar in android
    if (navigator.userAgent.match(/Android/)) {
        window.scrollTo(0, 1);
    }
}
