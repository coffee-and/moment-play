export const SNAKE_BOARD_SIZE = 16;

export const SNAKE_DIRECTION = {
  UP: { x: 0, y: -1 },
  RIGHT: { x: 1, y: 0 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
};

export function createInitialSnake() {
  const center = Math.floor(SNAKE_BOARD_SIZE / 2);
  return [
    { x: center, y: center },
    { x: center - 1, y: center },
    { x: center - 2, y: center },
  ];
}

export function isSamePosition(first, second) {
  return first.x === second.x && first.y === second.y;
}

export function isOppositeDirection(first, second) {
  return first.x + second.x === 0 && first.y + second.y === 0;
}

export function getSnakeSpeed(score) {
  return Math.max(72, 156 - Math.floor(score / 5) * 12);
}

export function createFood(snake, random = Math.random) {
  const occupied = new Set(snake.map(({ x, y }) => `${x}:${y}`));
  const emptyCells = [];
  for (let y = 0; y < SNAKE_BOARD_SIZE; y += 1) {
    for (let x = 0; x < SNAKE_BOARD_SIZE; x += 1) {
      if (!occupied.has(`${x}:${y}`)) emptyCells.push({ x, y });
    }
  }
  if (emptyCells.length === 0) return null;
  return emptyCells[Math.floor(random() * emptyCells.length)] ?? emptyCells[0];
}

export function advanceSnake(snake, direction, food) {
  const nextHead = {
    x: snake[0].x + direction.x,
    y: snake[0].y + direction.y,
  };
  const hitWall = nextHead.x < 0
    || nextHead.x >= SNAKE_BOARD_SIZE
    || nextHead.y < 0
    || nextHead.y >= SNAKE_BOARD_SIZE;
  if (hitWall) return { status: "collision", snake, ateFood: false };

  const ateFood = food ? isSamePosition(nextHead, food) : false;
  const collisionBody = ateFood ? snake : snake.slice(0, -1);
  if (collisionBody.some((segment) => isSamePosition(segment, nextHead))) {
    return { status: "collision", snake, ateFood: false };
  }

  return {
    status: "moved",
    snake: ateFood ? [nextHead, ...snake] : [nextHead, ...snake.slice(0, -1)],
    ateFood,
  };
}
