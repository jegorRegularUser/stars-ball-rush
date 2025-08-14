import { useEffect, useRef, useState } from "react";
import * as PIXI from "pixi.js";
import Matter from "matter-js";

interface Ball {
  id: string;
  body: Matter.Body;
  graphics: PIXI.Graphics;
  color: number;
  playerId: string;
  isSpinning?: boolean;
}

interface Brick {
  id: string;
  body: Matter.Body;
  graphics: PIXI.Graphics;
  destroyed: boolean;
}

interface Spinner {
  id: string;
  body: Matter.Body;
  graphics: PIXI.Graphics;
  rotation: number;
}

interface GameCanvasProps {
  onBallWin?: (ballId: string, playerId: string) => void;
  className?: string;
}

export const GameCanvas = ({ onBallWin, className }: GameCanvasProps) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [app, setApp] = useState<PIXI.Application | null>(null);
  const [engine, setEngine] = useState<Matter.Engine | null>(null);
  const ballsRef = useRef<Ball[]>([]);
  const bricksRef = useRef<Brick[]>([]);
  const spinnersRef = useRef<Spinner[]>([]);
  const [gameState, setGameState] = useState<'waiting' | 'spinning' | 'playing' | 'finished'>('waiting');
  const [cameraY, setCameraY] = useState(0);
  const gateRef = useRef<Matter.Body | null>(null);
  const gateGraphicsRef = useRef<PIXI.Graphics | null>(null);

  // Initialize PIXI and Matter.js
  useEffect(() => {
    if (!canvasRef.current) return;

    const initGame = async () => {
      // Create PIXI Application
      const pixiApp = new PIXI.Application();
      await pixiApp.init({
        width: 360,
        height: 640,
        backgroundColor: 0x1a1a2e,
        antialias: true,
      });

      canvasRef.current!.appendChild(pixiApp.canvas);

      // Create Matter.js engine
      const matterEngine = Matter.Engine.create();
      matterEngine.world.gravity.y = 0.8;

      // Create boundaries
      const ground = Matter.Bodies.rectangle(180, 630, 360, 20, { 
        isStatic: true,
        render: { fillStyle: '#16213e' }
      });

      // Create destruction zones (red walls)
      const leftDeathZone = Matter.Bodies.rectangle(30, 400, 20, 600, { 
        isStatic: true,
        isSensor: true,
        render: { fillStyle: '#ff0000' }
      });
      const rightDeathZone = Matter.Bodies.rectangle(330, 400, 20, 600, { 
        isStatic: true,
        isSensor: true,
        render: { fillStyle: '#ff0000' }
      });

      // Draw death zones
      const leftDeathGraphics = new PIXI.Graphics();
      leftDeathGraphics.rect(20, 100, 20, 600);
      leftDeathGraphics.fill(0xff3333);
      pixiApp.stage.addChild(leftDeathGraphics);

      const rightDeathGraphics = new PIXI.Graphics();
      rightDeathGraphics.rect(320, 100, 20, 600);
      rightDeathGraphics.fill(0xff3333);
      pixiApp.stage.addChild(rightDeathGraphics);

      // Create gate (initially closed)
      const gate = Matter.Bodies.rectangle(180, 120, 100, 10, {
        isStatic: true,
        render: { fillStyle: '#666666' }
      });
      gateRef.current = gate;

      // Draw gate
      const gateGraphics = new PIXI.Graphics();
      gateGraphics.rect(130, 115, 100, 10);
      gateGraphics.fill(0x666666);
      gateGraphicsRef.current = gateGraphics;
      pixiApp.stage.addChild(gateGraphics);

      // Create destructible bricks
      const bricks = [];
      for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 8; col++) {
          const x = 60 + col * 30 + (row % 2) * 15;
          const y = 200 + row * 40;
          
          const brick = Matter.Bodies.rectangle(x, y, 25, 15, {
            isStatic: true,
            restitution: 0.9,
            render: { fillStyle: '#8B4513' }
          });

          const brickGraphics = new PIXI.Graphics();
          brickGraphics.roundRect(x - 12.5, y - 7.5, 25, 15, 3);
          brickGraphics.fill(0x8B4513);
          brickGraphics.stroke({ width: 1, color: 0x654321 });
          pixiApp.stage.addChild(brickGraphics);

          const brickObj: Brick = {
            id: `brick_${row}_${col}`,
            body: brick,
            graphics: brickGraphics,
            destroyed: false
          };

          bricks.push(brick);
          bricksRef.current.push(brickObj);
        }
      }

      // Create spinning obstacles (crosses)
      const spinners = [];
      const spinnerPositions = [
        { x: 100, y: 450 },
        { x: 180, y: 420 },
        { x: 260, y: 450 }
      ];

      spinnerPositions.forEach((pos, index) => {
        const spinner = Matter.Bodies.rectangle(pos.x, pos.y, 30, 6, {
          isStatic: true,
          restitution: 1.2,
          render: { fillStyle: '#FFD700' }
        });

        const spinnerGraphics = new PIXI.Graphics();
        // Draw cross shape
        spinnerGraphics.rect(-15, -3, 30, 6);
        spinnerGraphics.rect(-3, -15, 6, 30);
        spinnerGraphics.fill(0xFFD700);
        spinnerGraphics.stroke({ width: 2, color: 0xFFA500 });
        spinnerGraphics.position.set(pos.x, pos.y);
        pixiApp.stage.addChild(spinnerGraphics);

        const spinnerObj: Spinner = {
          id: `spinner_${index}`,
          body: spinner,
          graphics: spinnerGraphics,
          rotation: 0
        };

        spinners.push(spinner);
        spinnersRef.current.push(spinnerObj);
      });

      // Create winning slot (center only, smaller)
      const winSlot = Matter.Bodies.rectangle(180, 580, 40, 20, {
        isStatic: true,
        isSensor: true,
        render: { fillStyle: '#00FF00' }
      });

      // Draw winning slot
      const winSlotGraphics = new PIXI.Graphics();
      winSlotGraphics.roundRect(160, 570, 40, 20, 10);
      winSlotGraphics.fill(0x00FF00);
      winSlotGraphics.stroke({ width: 2, color: 0x00AA00 });
      pixiApp.stage.addChild(winSlotGraphics);

      // Add win text
      const winText = new PIXI.Text({
        text: 'WIN',
        style: {
          fontSize: 12,
          fill: 0x000000,
          fontWeight: 'bold'
        }
      });
      winText.anchor.set(0.5);
      winText.position.set(180, 580);
      pixiApp.stage.addChild(winText);

      // Add all bodies to world
      Matter.World.add(matterEngine.world, [ground, leftDeathZone, rightDeathZone, gate, ...bricks, ...spinners, winSlot]);

      // Setup collision detection
      Matter.Events.on(matterEngine, 'collisionStart', (event) => {
        event.pairs.forEach((pair) => {
          const { bodyA, bodyB } = pair;
          
          // Check if ball hits winning slot
          if ((bodyA === winSlot || bodyB === winSlot)) {
            const ball = ballsRef.current.find(b => b.body === bodyA || b.body === bodyB);
            if (ball && onBallWin) {
              onBallWin(ball.id, ball.playerId);
              setGameState('finished');
            }
          }

          // Check if ball hits death zones
          if ((bodyA === leftDeathZone || bodyB === leftDeathZone || bodyA === rightDeathZone || bodyB === rightDeathZone)) {
            const ball = ballsRef.current.find(b => b.body === bodyA || b.body === bodyB);
            if (ball) {
              const index = ballsRef.current.findIndex(b => b.id === ball.id);
              if (index !== -1) {
                Matter.World.remove(matterEngine.world, ball.body);
                pixiApp.stage.removeChild(ball.graphics);
                ballsRef.current.splice(index, 1);
              }
            }
          }

          // Check if ball hits bricks
          const brick = bricksRef.current.find(b => !b.destroyed && (b.body === bodyA || b.body === bodyB));
          if (brick) {
            brick.destroyed = true;
            Matter.World.remove(matterEngine.world, brick.body);
            pixiApp.stage.removeChild(brick.graphics);
          }
        });
      });

      // Animation loop
      const gameLoop = () => {
        Matter.Engine.update(matterEngine);
        
        // Update ball graphics positions and camera follow
        if (ballsRef.current.length > 0) {
          const firstBall = ballsRef.current[0];
          const targetCameraY = Math.max(0, firstBall.body.position.y - 320);
          setCameraY(targetCameraY);
          pixiApp.stage.y = -targetCameraY;
        }
        
        // Update ball graphics positions
        ballsRef.current.forEach((ball, index) => {
          if (gameState === 'spinning') {
            // Spinning animation
            ball.graphics.rotation += 0.1;
            ball.graphics.position.set(
              180 + Math.cos(Date.now() * 0.01 + index) * 30,
              80
            );
          } else {
            ball.graphics.position.set(ball.body.position.x, ball.body.position.y);
            ball.graphics.rotation = ball.body.angle;
          }
        });

        // Update spinner rotations
        spinnersRef.current.forEach(spinner => {
          spinner.rotation += 0.05;
          spinner.graphics.rotation = spinner.rotation;
          Matter.Body.setAngle(spinner.body, spinner.rotation);
        });
      };

      pixiApp.ticker.add(gameLoop);

      setApp(pixiApp);
      setEngine(matterEngine);
    };

    initGame();

    return () => {
      if (app) {
        app.destroy(true);
      }
    };
  }, []);

  const startRound = (playerCount: number = 3) => {
    if (!app || !engine) return;

    // Reset physics bodies for balls
    ballsRef.current.forEach(ball => {
      if (ball.body) {
        Matter.World.remove(engine.world, ball.body);
      }
    });

    const colors = [0xff6b6b, 0x4ecdc4, 0x45b7d1, 0xf9ca24, 0xf0932b, 0xeb4d4b];
    const newBalls: Ball[] = [];

    // Create multiple balls for round
    for (let i = 0; i < playerCount; i++) {
      const color = colors[i % colors.length];
      
      // Create ball graphics only (no physics body yet)
      const ballGraphics = new PIXI.Graphics();
      ballGraphics.circle(0, 0, 12);
      ballGraphics.fill(color);
      ballGraphics.stroke({ width: 2, color: 0xffffff });
      
      // Add glow effect
      ballGraphics.stroke({ width: 3, color: 0xffffff, alpha: 0.8 });
      ballGraphics.position.set(180, 80);

      app.stage.addChild(ballGraphics);

      const ballObj: Ball = {
        id: `ball_${Date.now()}_${i}`,
        body: null as any, // Will be created after spinning
        graphics: ballGraphics,
        color,
        playerId: `player_${i + 1}`,
        isSpinning: true
      };

      newBalls.push(ballObj);
    }

    ballsRef.current = newBalls;
    setGameState('spinning');

    // Start spinning phase for 3 seconds
    setTimeout(() => {
      // Create physics bodies and open gate
      ballsRef.current.forEach((ball, index) => {
        const x = 150 + index * 20 + (Math.random() - 0.5) * 10;
        const physicsBody = Matter.Bodies.circle(x, 80, 12, {
          restitution: 0.8,
          friction: 0.001,
          frictionAir: 0.01,
          density: 0.001
        });

        ball.body = physicsBody;
        ball.isSpinning = false;
        Matter.World.add(engine.world, physicsBody);
      });

      // Remove gate to let balls fall
      if (gateRef.current) {
        Matter.World.remove(engine.world, gateRef.current);
        if (gateGraphicsRef.current && app.stage.children.includes(gateGraphicsRef.current)) {
          app.stage.removeChild(gateGraphicsRef.current);
        }
      }

      setGameState('playing');

      // Reset balls after timeout
      setTimeout(() => {
        if (gameState !== 'finished') {
          resetGame();
        }
      }, 20000);
    }, 3000);
  };

  const dropBall = (playerId: string = 'player1') => {
    startRound(1);
  };

  const resetGame = () => {
    if (!app || !engine) return;

    ballsRef.current.forEach(ball => {
      Matter.World.remove(engine.world, ball.body);
      app.stage.removeChild(ball.graphics);
    });
    ballsRef.current.length = 0;
    setGameState('waiting');
  };

  return (
    <div className={`relative ${className}`}>
      <div ref={canvasRef} className="rounded-xl overflow-hidden shadow-glow" />
      
      {/* Game Controls */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-3">
        <button
          onClick={() => dropBall()}
          className="btn-gaming"
          disabled={gameState === 'finished'}
        >
          Бросить шарик
        </button>
        
        {gameState === 'finished' && (
          <button
            onClick={resetGame}
            className="btn-gaming-secondary"
          >
            Новая игра
          </button>
        )}
      </div>

      {/* Game Status */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
        <div className="card-gaming px-4 py-2">
          <p className="text-center font-bold">
            {gameState === 'waiting' && 'Готов к игре'}
            {gameState === 'spinning' && 'Шарики раскручиваются...'}
            {gameState === 'playing' && 'Игра идёт...'}
            {gameState === 'finished' && 'Игра завершена!'}
          </p>
        </div>
      </div>
    </div>
  );
};