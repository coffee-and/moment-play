import { describe, expect, it } from "vitest";
import {
  SNAKE_DIRECTION,
  advanceSnake,
  createFood,
  createInitialSnake,
  getSnakeSpeed,
  isOppositeDirection,
} from "./snake.logic.js";

describe("snake logic", () => {
  it("moves forward and keeps its length", () => {
    const result = advanceSnake(createInitialSnake(), SNAKE_DIRECTION.RIGHT, { x: 1, y: 1 });
    expect(result.status).toBe("moved");
    expect(result.snake).toHaveLength(3);
    expect(result.snake[0]).toEqual({ x: 9, y: 8 });
  });

  it("grows after eating food", () => {
    const snake = createInitialSnake();
    const result = advanceSnake(snake, SNAKE_DIRECTION.RIGHT, { x: 9, y: 8 });
    expect(result.ateFood).toBe(true);
    expect(result.snake).toHaveLength(4);
  });

  it("detects wall collisions and reverse directions", () => {
    const snake = [{ x: 15, y: 4 }, { x: 14, y: 4 }, { x: 13, y: 4 }];
    expect(advanceSnake(snake, SNAKE_DIRECTION.RIGHT, null).status).toBe("collision");
    expect(isOppositeDirection(SNAKE_DIRECTION.LEFT, SNAKE_DIRECTION.RIGHT)).toBe(true);
  });

  it("never places food on the snake and increases speed safely", () => {
    const snake = createInitialSnake();
    expect(snake).not.toContainEqual(createFood(snake, () => 0));
    expect(getSnakeSpeed(50)).toBeGreaterThanOrEqual(72);
    expect(getSnakeSpeed(10)).toBeLessThan(getSnakeSpeed(0));
  });
});
